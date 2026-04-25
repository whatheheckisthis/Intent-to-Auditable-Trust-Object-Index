// File: canary/tracebit-deployer.js
// Role: Schema-bound Thinkst API deployer for token placement manifest.
// Constraints enforced: ENV-empty-secret-source, fail-fast-on-api-error, no-eval-no-exec, delta-t-zero-no-clock-read, public-placement-guard, unique-placement-target-post-check.
// Upstream: embed-canaries
// Downstream: register-webhooks
// ISM controls: ISM-0109, ISM-0140, ISM-0585, ISM-1554, ISM-1858
// Flock: MULTI-FLOCK

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';

const ajv = new Ajv2020({ allErrors: false, strict: true });

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function validate(data, schema, label) {
  const validator = ajv.compile(schema);
  const valid = validator(data);
  if (!valid) {
    throw new TypeError(`Validation failure [${label}]: ${ajv.errorsText(validator.errors)}`);
  }
}

function hashReminder(reminderStr) {
  return `sha256:${createHash('sha256').update(reminderStr).digest('hex')}`;
}

function enforceUniquePlacementTargets(placements) {
  const seen = new Set();
  for (const placement of placements) {
    if (seen.has(placement.placement_target)) {
      throw new Error(`PLACEMENT_TARGET_DUPLICATE: ${placement.placement_target}`);
    }
    seen.add(placement.placement_target);
  }
}

async function createToken(apiKey, flockRef, placement, tokenUrl) {
  const response = await fetch('https://canarytokens.org/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify({
      kind: placement.token_type,
      flock_id: flockRef,
      memo: placement.reminder,
      token_name: placement.token_name,
      token_url: tokenUrl
    })
  });

  if (!response.ok) {
    throw new Error(`Thinkst API failure for ${placement.token_id}: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function deployTokens(deployerInput) {
  if (!deployerInput || typeof deployerInput !== 'object') {
    throw new TypeError('deployerInput must be an object');
  }

  const secrets = loadJson(deployerInput.secrets_manifest_path);
  const manifest = loadJson('./canary/tracebit-placement-manifest.json');

  validate(secrets, loadJson('./schemas/tracebit-secrets-manifest.schema.json'), 'secrets manifest');
  validate(manifest, loadJson('./schemas/tracebit-manifest.schema.json'), 'placement manifest');

  enforceUniquePlacementTargets(manifest.placements);

  const reminderSchema = loadJson('./schemas/tracebit-reminder.schema.json');
  const reminderValidator = ajv.compile(reminderSchema);

  const results = [];
  for (const placement of manifest.placements) {
    if (placement.placement_visibility === 'public' && !['url', 'dns'].includes(placement.token_type)) {
      throw new Error(`PLACEMENT_GUARD: ${placement.token_id} violates public visibility token type restriction`);
    }

    let reminderObj;
    try {
      reminderObj = JSON.parse(placement.reminder);
    } catch {
      throw new TypeError(`Reminder is not valid JSON for ${placement.token_id}`);
    }

    if (!reminderValidator(reminderObj)) {
      throw new TypeError(`Reminder schema failure [${placement.token_id}]: ${ajv.errorsText(reminderValidator.errors)}`);
    }

    if (reminderObj.flock_id !== placement.flock_id) {
      throw new TypeError(`Reminder flock mismatch [${placement.token_id}]: reminder=${reminderObj.flock_id} placement=${placement.flock_id}`);
    }

    const flockRef = secrets.flock_ids[placement.flock_id];
    if (!flockRef) {
      throw new Error(`Missing flock mapping in secrets manifest: ${placement.flock_id}`);
    }

    const tokenUrl = secrets.token_urls[placement.token_id];
    if (!tokenUrl || tokenUrl !== 'INJECT_FROM_SECRETS_MANIFEST') {
      throw new Error(`Token URL placeholder contract violated for ${placement.token_id}`);
    }

    const apiResult = await createToken(secrets.thinkst_api_key, flockRef, placement, tokenUrl);

    results.push({
      token_id: placement.token_id,
      token_name: placement.token_name,
      token_type: placement.token_type,
      flock_id: placement.flock_id,
      placement_target: placement.placement_target,
      thinkst_token_ref: apiResult.canarytoken ?? apiResult.token ?? `TRACEBIT-${placement.token_id}`,
      reminder_sha256: hashReminder(placement.reminder),
      rotation_after_runs: placement.rotation_after_runs,
      ism_controls: placement.ism_controls,
      status: 'DEPLOYED'
    });
  }

  const deploymentLog = {
    pipeline_run_ref: deployerInput.pipeline_run_ref,
    total_placements: manifest.placements.length,
    deployed: results.length,
    failed: manifest.placements.length - results.length,
    results
  };

  validate(deploymentLog, loadJson('./schemas/tracebit-deployment-log.schema.json'), 'deployment log');
  writeFileSync(deployerInput.output_path, JSON.stringify(deploymentLog, null, 2));
  return deploymentLog;
}

async function runCli() {
  const deployerInputPath = process.argv[2];
  if (!deployerInputPath) {
    throw new Error('Usage: node canary/tracebit-deployer.js <deployer-input.json>');
  }

  const deployerInput = loadJson(deployerInputPath);
  await deployTokens(deployerInput);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
