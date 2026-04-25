// File: pipeline/inject-webhook-endpoints.js
// Role: Runtime-only injector that maps secret endpoint URLs into webhook config placeholders.
// Constraints enforced: no process.env reads, schema-validated secrets manifest, filesystem-only I/O, no subprocess usage.
// Upstream: register-webhooks
// Downstream: register-webhooks
// ISM controls: ISM-0109, ISM-1554, ISM-1858
import { readFileSync, writeFileSync } from 'node:fs';
import Ajv from 'ajv/dist/2020.js';

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error(`Missing required argument ${flag}`);
  }
  return process.argv[index + 1];
}

const endpointsPath = readArg('--endpoints');
const configPath = readArg('--config');
const secretSchemaPath = './schemas/webhook-endpoints-secret.schema.json';
const configSchemaPath = './schemas/webhook-config.schema.json';

const ajv = new Ajv({ allErrors: false, strict: true });
const secretSchema = JSON.parse(readFileSync(secretSchemaPath, 'utf8'));
const configSchema = JSON.parse(readFileSync(configSchemaPath, 'utf8'));
const validateSecret = ajv.compile(secretSchema);
const validateConfig = ajv.compile(configSchema);

const secrets = JSON.parse(readFileSync(endpointsPath, 'utf8'));
if (!validateSecret(secrets)) {
  throw new TypeError(`Webhook endpoint secret schema validation failure: ${ajv.errorsText(validateSecret.errors)}`);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
config.endpoints.security_operations.endpoint_url = secrets.security_operations_url;
config.endpoints.canary_normaliser.endpoint_url = secrets.canary_normaliser_url;
config.endpoints.sbom_monitor.endpoint_url = secrets.sbom_monitor_url;

if (!validateConfig(config)) {
  throw new TypeError(`Webhook config schema validation failure: ${ajv.errorsText(validateConfig.errors)}`);
}

writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
