// File: orchestration/runner.js
// Role: Deterministic npm subprocess orchestrator with schema-validated inputs.
// Constraints enforced: zero-inference runtime, spawn-only subprocess model, ENV := ∅, fail-fast validation, static execution path.
// Upstream: run-execution-orchestration
// Downstream: run-validation-analytics
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';

const allowedCommands = Object.freeze({
  "validate-inputs": ["ci", "--ignore-scripts"],
  "build-containers": ["pack", "--ignore-scripts"],
  "run-governance-policy": ["run", "governance-policy"],
  "run-cross-framework-alignment": ["run", "cross-framework-alignment"],
  "run-execution-orchestration": ["run", "execution-orchestration"],
  "run-validation-analytics": ["run", "validation-analytics"],
  "sign-and-emit": ["run", "sign-and-emit"]
});

function readJsonFile(path) {
  const raw = fs.readFileSync(path, 'utf8');
  return JSON.parse(raw);
}

function validatePayload(payload, schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: false });
  const validate = ajv.compile(schema);
  const valid = validate(payload);
  if (!valid) {
    const errorText = ajv.errorsText(validate.errors, { separator: '; ' });
    throw new Error(`Input schema validation failed: ${errorText}`);
  }
}

function runNpm(stage, payload) {
  const args = allowedCommands[stage];
  if (!Array.isArray(args)) {
    throw new Error(`Unsupported stage: ${stage}`);
  }

  const env = Object.create(null);
  env.PATH = '/usr/local/bin:/usr/bin:/bin';

  const proc = spawn('npm', args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    cwd: payload.workingDirectory
  });

  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (chunk) => {
    stdout += chunk.toString('utf8');
  });

  proc.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf8');
  });

  return new Promise((resolve, reject) => {
    proc.on('error', (error) => {
      reject(error);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`npm exited with code ${code}: ${stderr}`));
        return;
      }
      resolve({ stdout, stderr, code });
    });
  });
}

async function main() {
  if (process.argv.length !== 4) {
    throw new Error('Usage: node runner.js <input-payload.json> <runner-schema.json>');
  }

  const payloadPath = process.argv[2];
  const schemaPath = process.argv[3];

  const payload = readJsonFile(payloadPath);
  const schema = readJsonFile(schemaPath);
  validatePayload(payload, schema);

  await runNpm(payload.stage, payload);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
