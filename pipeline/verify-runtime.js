// File: pipeline/verify-runtime.js
// Role: Verify runner tool versions and ENV cleanliness before any pipeline stage.
// Constraints enforced: ENV-minimal subprocess env, shell-false process spawn, static regex parsers, fail-fast non-zero exit.
// Upstream: ROOT
// Downstream: runtime-gate
// ISM controls: ISM-0407, ISM-1491, ISM-1753
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';

const VERSION_PARSERS = Object.freeze({
  node: /v?(\d+\.\d+\.\d+)/,
  npm: /(\d+\.\d+\.\d+)/,
  podman: /podman version\s+(\d+\.\d+\.\d+)/i,
  conftest: /(\d+\.\d+\.\d+)/,
  cosign: /v?(\d+\.\d+\.\d+)/,
  slsa_verifier: /v?(\d+\.\d+\.\d+)/,
  syft: /(\d+\.\d+\.\d+)/,
  ajv_cli: /(\d+\.\d+\.\d+)/,
  jq: /jq-(\d+\.\d+(?:\.\d+)?)/,
  sha256sum: /sha256sum\s+\(GNU coreutils\)\s+(\d+\.\d+(?:\.\d+)?)/i,
  base64: /base64\s+\(GNU coreutils\)\s+(\d+\.\d+(?:\.\d+)?)/i
});

const TOOL_COMMAND = Object.freeze({
  ajv_cli: 'ajv',
  slsa_verifier: 'slsa-verifier'
});

const TOOL_VERSION_FLAGS = Object.freeze({
  node: ['--version'],
  npm: ['--version'],
  podman: ['--version'],
  conftest: ['--version'],
  cosign: ['version'],
  slsa_verifier: ['version'],
  syft: ['--version'],
  ajv_cli: ['--version'],
  jq: ['--version'],
  sha256sum: ['--version'],
  base64: ['--version']
});

function sanitizeSchema(node) {
  if (Array.isArray(node)) return node.map(sanitizeSchema);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('#') || k.startsWith('__') || k === '$id') continue;
      out[k] = sanitizeSchema(v);
    }
    return out;
  }
  return node;
}

function normalizeSemver(version) {
  const parts = version.replace(/^v/, '').split('.').map((p) => Number(p));
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

function semverAtLeast(actual, required) {
  const [aMaj, aMin, aPat] = normalizeSemver(actual);
  const [rMaj, rMin, rPat] = normalizeSemver(required);
  if (aMaj !== rMaj) return aMaj > rMaj;
  if (aMin !== rMin) return aMin > rMin;
  return aPat >= rPat;
}

async function checkTool(toolName, declaredVersion) {
  const flags = TOOL_VERSION_FLAGS[toolName] ?? ['--version'];
  const parser = VERSION_PARSERS[toolName];
  const command = TOOL_COMMAND[toolName] ?? toolName;
  const env = Object.create(null);
  env.PATH = process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin';

  return new Promise((resolve) => {
    const proc = spawn(command, flags, { env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    proc.stdout.on('data', (chunk) => chunks.push(chunk));
    proc.stderr.on('data', (chunk) => chunks.push(chunk));
    proc.on('close', () => {
      const output = Buffer.concat(chunks).toString('utf8');
      const match = parser?.exec(output);
      if (!match) {
        resolve({ tool: toolName, status: 'PARSE_FAILURE', declared: declaredVersion, actual: null });
        return;
      }
      const actual = match[1];
      const ok = semverAtLeast(actual, declaredVersion);
      resolve({
        tool: toolName,
        status: ok ? 'PASS' : 'VERSION_MISMATCH',
        declared: declaredVersion,
        actual
      });
    });
    proc.on('error', () => {
      resolve({ tool: toolName, status: 'NOT_FOUND', declared: declaredVersion, actual: null });
    });
  });
}

function checkEnv(blockedVars, allowedVars) {
  const keys = Object.keys(process.env);
  return {
    contaminations: keys.filter((key) => blockedVars.includes(key)),
    unexpected: keys.filter((key) => !blockedVars.includes(key) && !allowedVars.includes(key))
  };
}

function parseArgs(argv) {
  const args = { config: 'pipeline/runtime-versions.json', output: 'pipeline/outputs/runtime-verification.json' };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--config') args.config = value;
    if (key === '--output') args.output = value;
  }
  return args;
}

export async function verifyRuntime(configPath, outputPath) {
  const ajv = new Ajv2020({ allErrors: false, strict: true });
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const schema = sanitizeSchema(JSON.parse(readFileSync('schemas/runtime-versions.schema.json', 'utf8')));
  const validateSchema = ajv.compile(schema);
  if (!validateSchema(sanitizeSchema(config))) {
    throw new TypeError(`runtime-versions schema failure: ${ajv.errorsText(validateSchema.errors)}`);
  }

  const toolChecks = await Promise.all(Object.entries(config.runtime_versions).map(([tool, ver]) => checkTool(tool, ver)));
  const envCheck = checkEnv(config.blocked_env_vars, config.allowed_env_vars);
  const allPass = toolChecks.every((row) => row.status === 'PASS') && envCheck.contaminations.length === 0;
  const result = {
    overall_status: allPass ? 'RUNTIME_CONSISTENT' : 'RUNTIME_INCONSISTENT',
    tool_checks: toolChecks,
    env_contaminations: envCheck.contaminations,
    env_unexpected: envCheck.unexpected,
    config_path: configPath
  };

  mkdirSync('pipeline/outputs', { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  if (!allPass) {
    throw new Error('RUNTIME_INCONSISTENT');
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { config, output } = parseArgs(process.argv);
  verifyRuntime(config, output).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
