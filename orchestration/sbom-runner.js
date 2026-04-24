// File: orchestration/sbom-runner.js
// Role: Schema-bound Syft subprocess manager producing CycloneDX 1.6 SBOMs.
// Constraints enforced: shell=false, ENV := ∅ for subprocess, fail-fast validation, no dynamic imports.
// Upstream: build-containers
// Downstream: evaluate-policies
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv/dist/2020.js';

const ajv = new Ajv({ allErrors: false, strict: true });

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const inputSchema = loadJson('./orchestration/sbom-runner.schema.json');
const outputSchema = loadJson('./schemas/sbom-result.schema.json');
const validateInput = ajv.compile(inputSchema);
const validateOutput = ajv.compile(outputSchema);

export async function generateSbom(rawInput) {
  if (!validateInput(rawInput)) {
    throw new TypeError(`Input validation failure: ${ajv.errorsText(validateInput.errors)}`);
  }

  const input = Object.freeze({
    target: rawInput.target,
    output_path: rawInput.output_path,
    catalogers: [...rawInput.catalogers]
  });

  const env = Object.create(null);
  env.PATH = '/usr/local/bin:/usr/bin:/bin';

  const args = [
    input.target,
    '--output', `cyclonedx-json=${input.output_path}`,
    '--scope', 'all-layers',
    '--catalogers', input.catalogers.join(',')
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn('syft', args, {
      shell: false,
      env,
      stdio: ['ignore', 'ignore', 'pipe']
    });

    const stderrChunks = [];
    proc.stderr.on('data', (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
    });

    proc.on('error', (error) => {
      reject(error);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`syft exited ${code}: ${Buffer.concat(stderrChunks).toString('utf8')}`));
        return;
      }

      const result = {
        output_path: input.output_path,
        exit_code: 0,
        format: 'cyclonedx-json',
        spec_version: '1.6'
      };

      if (!validateOutput(result)) {
        reject(new TypeError(`Output validation failure: ${ajv.errorsText(validateOutput.errors)}`));
        return;
      }

      resolve(result);
    });
  });
}
