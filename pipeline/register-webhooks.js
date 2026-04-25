// File: pipeline/register-webhooks.js
// Role: Non-blocking webhook reachability registration stage with append-only evidence output.
// Constraints enforced: fail-safe monitoring gap handling, no clock reads, schema validation, no subprocess usage.
// Upstream: run-determinism-harness
// Downstream: embed-canaries
// ISM controls: ISM-0109, ISM-0140, ISM-1554, ISM-1858
import { readFileSync, writeFileSync } from 'node:fs';
import Ajv from 'ajv/dist/2020.js';
import { dispatchAlert } from '../orchestration/webhook-dispatcher.js';

const CONFIG_PATH = './pipeline/webhook-config.json';
const CONFIG_SCHEMA_PATH = './schemas/webhook-config.schema.json';
const REG_SCHEMA_PATH = './schemas/webhook-registration.schema.json';
const PIPELINE_CONFIG_PATH = './pipeline/pipeline.config.json';
const OUTPUT_PATH = './pipeline/outputs/webhook-registration.json';

const ajv = new Ajv({ allErrors: false, strict: true });
const configSchema = JSON.parse(readFileSync(CONFIG_SCHEMA_PATH, 'utf8'));
const registrationSchema = JSON.parse(readFileSync(REG_SCHEMA_PATH, 'utf8'));
const validateConfig = ajv.compile(configSchema);
const validateRegistration = ajv.compile(registrationSchema);

function loadPipelineRunRef() {
  const pipelineConfig = JSON.parse(readFileSync(PIPELINE_CONFIG_PATH, 'utf8'));
  if (typeof pipelineConfig.pipeline_run_ref !== 'string' || pipelineConfig.pipeline_run_ref.length === 0) {
    throw new Error('pipeline.config.json must define top-level pipeline_run_ref');
  }
  return pipelineConfig.pipeline_run_ref;
}

function pingAlert(endpointName, controls, pipelineRunRef) {
  const suffix = endpointName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, 'X');
  return {
    alert_id: `ALERT-PING${suffix}`,
    alert_type: 'PIPELINE_STAGE_FAILURE',
    pipeline_run_ref: pipelineRunRef,
    severity: 'LOW',
    ism_controls: controls,
    detail: {
      source_stage: 'register-webhooks',
      message: 'Registration ping',
      registration_ping: { type: 'REGISTRATION_PING' }
    }
  };
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
if (!validateConfig(config)) {
  throw new TypeError(`Webhook config validation failure: ${ajv.errorsText(validateConfig.errors)}`);
}

const pipelineRunRef = loadPipelineRunRef();
const registrations = [];

for (const [endpointName, endpointConfig] of Object.entries(config.endpoints)) {
  if (!endpointConfig.enabled) {
    continue;
  }

  const result = await dispatchAlert(
    pingAlert(endpointName, endpointConfig.ism_controls, pipelineRunRef),
    endpointConfig
  );

  let status = 'UNREACHABLE';
  if (result.status === 'DISPATCH_TIMEOUT') {
    status = 'TIMEOUT';
  } else if (result.status === 'DISPATCHED' && result.http_status === 200) {
    status = 'REACHABLE';
  }

  registrations.push({
    endpoint_name: endpointName,
    status,
    ism_controls: endpointConfig.ism_controls
  });
}

const registrationLog = {
  pipeline_run_ref: pipelineRunRef,
  registrations
};

if (!validateRegistration(registrationLog)) {
  throw new TypeError(`Webhook registration output validation failure: ${ajv.errorsText(validateRegistration.errors)}`);
}

writeFileSync(OUTPUT_PATH, `${JSON.stringify(registrationLog, null, 2)}\n`, 'utf8');
