// File: canary/tracebit-rotator.js
// Role: Deterministic token archival and replacement rotator based on pipeline run count.
// Constraints enforced: ENV-empty-secret-source, delta-t-zero-run-count-scheduling, no-eval-no-exec, fail-fast-on-api-error, sequential-rotation-pool-consumption.
// Upstream: embed-canaries
// Downstream: register-webhooks
// ISM controls: ISM-0109, ISM-0140, ISM-0585, ISM-1554, ISM-1858
// Flock: MULTI-FLOCK

import { readFileSync, writeFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';

const ajv = new Ajv2020({ allErrors: false, strict: true });

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function validate(data, schema, label) {
  const validator = ajv.compile(schema);
  if (!validator(data)) {
    throw new TypeError(`Validation failure [${label}]: ${ajv.errorsText(validator.errors)}`);
  }
}

function nextRotationName(tokenType, pool, cursor) {
  const names = pool[tokenType];
  if (!names || names.length === 0) {
    throw new Error(`Missing rotation pool entries for token type: ${tokenType}`);
  }
  const current = cursor[tokenType] ?? 0;
  const chosen = names[current % names.length];
  cursor[tokenType] = current + 1;
  return chosen;
}

async function archiveToken(apiKey, tokenRef) {
  const response = await fetch('https://canarytokens.org/api/v1/canarytoken/archive', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify({ canarytoken: tokenRef })
  });

  if (!response.ok) {
    throw new Error(`Archive failure for ${tokenRef}: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function createReplacementToken(apiKey, flockRef, tokenType, tokenName, reminder) {
  const response = await fetch('https://canarytokens.org/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify({
      kind: tokenType,
      flock_id: flockRef,
      token_name: tokenName,
      memo: reminder,
      token_url: 'INJECT_FROM_SECRETS_MANIFEST'
    })
  });

  if (!response.ok) {
    throw new Error(`Replacement generation failure: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function rotateTokens(rotatorInput) {
  const secrets = loadJson(rotatorInput.secrets_manifest_path);
  const deploymentLog = loadJson(rotatorInput.deployment_log_path);

  validate(secrets, loadJson('./schemas/tracebit-secrets-manifest.schema.json'), 'secrets manifest');
  validate(deploymentLog, loadJson('./schemas/tracebit-deployment-log.schema.json'), 'deployment log');

  const runCount = rotatorInput.pipeline_run_count;
  if (!Number.isInteger(runCount) || runCount < 1) {
    throw new TypeError('pipeline_run_count must be an integer >= 1');
  }

  const cursor = {};
  const rotations = [];

  for (const entry of deploymentLog.results) {
    const dueForRotation = runCount % entry.rotation_after_runs === 0;
    if (!dueForRotation) {
      continue;
    }

    const flockRef = secrets.flock_ids[entry.flock_id];
    if (!flockRef) {
      throw new Error(`Missing flock mapping for ${entry.flock_id}`);
    }

    const replacementName = nextRotationName(entry.token_type, secrets.rotation_pool, cursor);
    await archiveToken(secrets.thinkst_api_key, entry.thinkst_token_ref);
    const created = await createReplacementToken(
      secrets.thinkst_api_key,
      flockRef,
      entry.token_type,
      replacementName,
      JSON.stringify({
        owner: 'platform-security',
        environment: 'production',
        location: `rotation:${entry.placement_target}`,
        flock_id: entry.flock_id,
        ism_controls: entry.ism_controls,
        rotation_note: `Replacement for ${entry.token_id} after archival.`
      })
    );

    entry.status = 'ROTATED';
    entry.token_name = replacementName;
    entry.thinkst_token_ref = created.canarytoken ?? created.token ?? `ROTATED-${entry.token_id}`;

    rotations.push({
      token_id: entry.token_id,
      archived_ref: `archived:${entry.token_id}`,
      replacement_ref: entry.thinkst_token_ref,
      replacement_name: replacementName,
      rotation_after_runs: entry.rotation_after_runs,
      pipeline_run_count: runCount,
      status: 'ROTATED'
    });
  }

  const rotationLog = {
    pipeline_run_ref: rotatorInput.pipeline_run_ref,
    pipeline_run_count: runCount,
    rotated: rotations.length,
    results: rotations
  };

  writeFileSync(rotatorInput.deployment_log_path, JSON.stringify(deploymentLog, null, 2));
  writeFileSync(rotatorInput.rotation_log_path, JSON.stringify(rotationLog, null, 2));

  return rotationLog;
}

async function runCli() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error('Usage: node canary/tracebit-rotator.js <rotator-input.json>');
  }

  const input = loadJson(inputPath);
  await rotateTokens(input);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
