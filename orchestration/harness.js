// File: orchestration/harness.js
// Role: Determinism verification harness executing identical pipeline runs and comparing output digests.
// Constraints enforced: schema-bound-inputs, ENV:=∅ subprocess execution, no-shell-spawn, constant-time-digest-compare, fail-fast-terminal-exit.
// Upstream: emit-trace-matrix
// Downstream: run-mutation-suite
import fs from 'node:fs';
import path from 'node:path';
import { createHash, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';

const HARNESS_INPUT_PATH = '/input/harness-input.json';
const HARNESS_SCHEMA_PATH = '/harness/harness.schema.json';
const RESULT_SCHEMA_PATH = '/schemas/determinism-result.schema.json';
const RUN_A_OUTPUT = '/output/run-a/s-out.json';
const RUN_B_OUTPUT = '/output/run-b/s-out.json';
const RESULT_OUTPUT = '/output/determinism-result.json';

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}


function sanitizeSchema(schemaNode) {
  if (Array.isArray(schemaNode)) {
    return schemaNode.map(sanitizeSchema);
  }
  if (schemaNode !== null && typeof schemaNode === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(schemaNode)) {
      if (key.startsWith('#') || key.startsWith('__') || key === '$schema' || key === '$id') {
        continue;
      }
      sanitized[key] = sanitizeSchema(value);
    }
    return sanitized;
  }
  return schemaNode;
}
function validateJson(data, schema, label) {
  const ajv = new Ajv2020({
    strict: true,
    allErrors: true,
    useDefaults: false,
    coerceTypes: false,
    removeAdditional: false
  });
  const validate = ajv.compile(sanitizeSchema(schema));
  const valid = validate(sanitizeSchema(data));
  if (!valid) {
    throw new Error(`${label} validation failed: ${ajv.errorsText(validate.errors, { separator: '; ' })}`);
  }
}

function toDigestBuffer(dataBuffer) {
  const hash = createHash('sha256');
  hash.update(dataBuffer);
  return hash.digest();
}

function toDigestString(digestBuffer) {
  return `sha256:${digestBuffer.toString('hex')}`;
}

function runPipelineOnce(pipelineImageDigest, inputFixturePath, outputScopePath, runLabel) {
  const outputPath = path.join(outputScopePath, runLabel);
  fs.mkdirSync(outputPath, { recursive: true });

  const args = [
    'run',
    '--read-only',
    '--network=none',
    '--env-host=false',
    '--rm',
    '--volume', `${inputFixturePath}:/input:ro`,
    '--volume', `${outputPath}:/output:rw`,
    `pipeline-runner@${pipelineImageDigest}`
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn('/usr/bin/podman', args, {
      shell: false,
      env: Object.create(null),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    proc.on('error', (error) => {
      reject(error);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Pipeline run ${runLabel} failed with code ${code}: ${stderr}`));
        return;
      }
      resolve();
    });
  });
}

async function main() {
  const input = readJsonFile(HARNESS_INPUT_PATH);
  const inputSchema = readJsonFile(HARNESS_SCHEMA_PATH);
  validateJson(input, inputSchema, 'Harness input');

  await runPipelineOnce(
    input.pipeline_image_digest,
    input.input_fixture_path,
    input.output_scope_path,
    'run-a'
  );
  await runPipelineOnce(
    input.pipeline_image_digest,
    input.input_fixture_path,
    input.output_scope_path,
    'run-b'
  );

  const runABytes = fs.readFileSync(RUN_A_OUTPUT);
  const runBBytes = fs.readFileSync(RUN_B_OUTPUT);

  const runADigestBuffer = toDigestBuffer(runABytes);
  const runBDigestBuffer = toDigestBuffer(runBBytes);
  const digestsMatch = timingSafeEqual(runADigestBuffer, runBDigestBuffer);

  const result = {
    status: digestsMatch ? 'DETERMINISM_PASS' : 'DETERMINISM_FAILURE',
    run_a_digest: toDigestString(runADigestBuffer),
    run_b_digest: toDigestString(runBDigestBuffer),
    digests_match: digestsMatch,
    pipeline_image_digest: input.pipeline_image_digest,
    input_fixture_path: input.input_fixture_path
  };

  const resultSchema = readJsonFile(RESULT_SCHEMA_PATH);
  validateJson(result, resultSchema, 'Determinism result');

  ensureParentDir(RESULT_OUTPUT);
  fs.writeFileSync(RESULT_OUTPUT, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  if (!digestsMatch) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
