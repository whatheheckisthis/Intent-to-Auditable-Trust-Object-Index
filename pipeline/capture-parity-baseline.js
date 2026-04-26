// File: pipeline/capture-parity-baseline.js
// Role: Capture canonical SHA-256 digests for parity baseline after verified CI pass.
// Constraints enforced: deterministic hashing via node:crypto, schema-bound baseline output, no subprocess for digesting, fail-fast missing artefacts.
// Upstream: verify-runtime
// Downstream: verify-parity
// ISM controls: ISM-0407
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';

const DEFAULT_ARTEFACTS = [
  'pipeline/outputs/runtime-verification.json',
  'pipeline/outputs/pac-evaluation-result.json',
  'pipeline/outputs/evidence-bundle/bundle-manifest.json'
];

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

function digest(path) {
  const data = readFileSync(path);
  return `sha256:${createHash('sha256').update(data).digest('hex')}`;
}

function versionOf(cmd, args) {
  const out = spawnSync(cmd, args, { encoding: 'utf8' });
  return `${out.stdout || out.stderr}`.trim();
}

function parseArgs(argv) {
  const args = { output: 'pipeline/parity-baseline.json' };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--output') args.output = argv[i + 1];
    if (argv[i] === '--run-ref') args.runRef = argv[i + 1];
  }
  return args;
}

export function captureParityBaseline(outputPath, runRef) {
  const baseline = {
    captured_from_run_ref: runRef,
    node_version: versionOf('node', ['--version']),
    podman_version: versionOf('podman', ['--version']),
    artefacts: DEFAULT_ARTEFACTS.map((path) => ({ path, sha256_digest: digest(path) }))
  };

  const ajv = new Ajv2020({ allErrors: false, strict: true });
  const schema = sanitizeSchema(JSON.parse(readFileSync('schemas/parity-baseline.schema.json', 'utf8')));
  const validate = ajv.compile(schema);
  if (!validate(baseline)) throw new Error(`parity baseline schema failure: ${ajv.errorsText(validate.errors)}`);

  mkdirSync('pipeline', { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
  return baseline;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv);
  captureParityBaseline(args.output, args.runRef ?? process.env.GITHUB_SHA ?? 'LOCAL_UNSET_RUN_REF');
}
