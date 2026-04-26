// File: canary/tracebit-build-deployer.js
// Role: Deploy Canary Tokens into SLSA provenance, SBOM, and evidence bundle artefacts via Thinkst API.
// Constraints enforced: ENV := ∅ via file-mounted secrets, no eval/exec, fail-fast deployment, post-signing embedding only.
// Upstream: slsa-provenance
// Downstream: verify-provenance-and-tokens
// ISM controls: ISM-0109, ISM-0140, ISM-0585, ISM-1554
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Ajv from 'ajv/dist/2020.js';

const ajv = new Ajv({ allErrors: false, strict: true });

function load(path, schemaPath) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    throw new TypeError(`Validation failure [${path}]: ${ajv.errorsText(validate.errors)}`);
  }
  return data;
}

const KIND_MAP = Object.freeze({
  aws_api_key: 'aws-id',
  url: 'http',
  dns: 'dns',
  pdf: 'pdf-acrobat-reader',
  google_doc: 'doc-google',
  slack_token: 'slack-api',
  windows_registry: 'windows-registry',
  cmd: 'cmd',
  azure_id: 'azure-id',
  github_pat: 'github-pat',
  cloned_website: 'cloned-web',
  mysql_credentials: 'my-sql'
});

async function createCanaryToken(consoleDomain, flockApiKey, kind, memo) {
  const url = `https://${consoleDomain}/api/v1/canarytoken/create`;
  const body = new URLSearchParams({ auth_token: flockApiKey, memo, kind });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Thinkst API error ${resp.status}: ${text}`);
    }

    return await resp.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function embedTokenReference(artefactPath, tokenRef, tokenId) {
  const raw = readFileSync(artefactPath, 'utf8');

  if (artefactPath.endsWith('.json')) {
    const obj = JSON.parse(raw);
    if (Object.prototype.hasOwnProperty.call(obj, 'canary_ref')) {
      throw new Error(`canary_ref already present in ${artefactPath} — one token per artefact enforced`);
    }
    obj.canary_ref = tokenRef;
    obj.canary_id = tokenId;
    writeFileSync(artefactPath, `${JSON.stringify(obj, null, 2)}
`, 'utf8');
    return;
  }

  const modified = raw.endsWith('
')
    ? `${raw}# INTEGRITY-REF: ${tokenRef} [${tokenId}]
`
    : `${raw}
# INTEGRITY-REF: ${tokenRef} [${tokenId}]
`;
  writeFileSync(artefactPath, modified, 'utf8');
}

export async function deployBuildTokens(deployerInput) {
  const consoleDomain = readFileSync(deployerInput.thinkst_console_domain_path, 'utf8').trim();
  const flockApiKey = readFileSync(deployerInput.thinkst_flock_api_key_path, 'utf8').trim();

  const reminderSchema = JSON.parse(readFileSync('./schemas/tracebit-reminder.schema.json', 'utf8'));
  const validateReminder = ajv.compile(reminderSchema);

  const buildTokenPlacements = load(
    './canary/tracebit-build-placements.json',
    './schemas/tracebit-build-placements.schema.json'
  );

  const results = [];
  for (const placement of buildTokenPlacements.placements) {
    let reminderObj;
    try {
      reminderObj = JSON.parse(placement.reminder);
    } catch {
      throw new TypeError(`Invalid reminder JSON for ${placement.token_id}`);
    }

    if (!validateReminder(reminderObj)) {
      throw new TypeError(`Reminder schema failure [${placement.token_id}]: ${ajv.errorsText(validateReminder.errors)}`);
    }

    const kind = KIND_MAP[placement.token_type];
    if (!kind) {
      throw new Error(`Unknown token_type '${placement.token_type}' for ${placement.token_id}`);
    }

    const apiResult = await createCanaryToken(consoleDomain, flockApiKey, kind, placement.reminder);
    const tokenRef = apiResult.result?.token_url ?? apiResult.canarytoken;
    if (!tokenRef) {
      throw new Error(`No token URL in Thinkst API response for ${placement.token_id}`);
    }

    if (placement.embed_in_artefact) {
      embedTokenReference(placement.artefact_path, tokenRef, placement.token_id);
    }

    results.push({
      token_id: placement.token_id,
      token_name: placement.token_name,
      token_type: placement.token_type,
      artefact_path: placement.artefact_path,
      thinkst_kind: kind,
      thinkst_token_ref: tokenRef,
      reminder_sha256: `sha256:${createHash('sha256').update(placement.reminder).digest('hex')}`,
      ism_controls: placement.ism_controls,
      status: 'DEPLOYED'
    });
  }

  const deploymentLog = {
    pipeline_run_ref: deployerInput.pipeline_run_ref,
    total_placements: buildTokenPlacements.placements.length,
    deployed: results.length,
    failed: buildTokenPlacements.placements.length - results.length,
    slsa_provenance_ref: deployerInput.provenance_path,
    results
  };

  writeFileSync(deployerInput.output_path, `${JSON.stringify(deploymentLog, null, 2)}
`, 'utf8');

  if (deploymentLog.failed > 0) {
    throw new Error(`CANARY_DEPLOYMENT_INCOMPLETE: ${deploymentLog.failed} placements failed. Partial deception layer rejected.`);
  }

  return deploymentLog;
}

async function runCli() {
  const inputIndex = process.argv.indexOf('--input');
  if (inputIndex === -1 || !process.argv[inputIndex + 1]) {
    throw new Error('Usage: node canary/tracebit-build-deployer.js --input <deployer-input.json>');
  }

  const deployerInput = load(
    process.argv[inputIndex + 1],
    './schemas/canary-build-deployer-input.schema.json'
  );

  await deployBuildTokens(deployerInput);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
