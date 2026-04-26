// File: pipeline/verify-parity.js
// Role: Verify local output digests match committed CI baseline digests.
// Constraints enforced: timing-safe digest compare, schema-bound baseline and report, deterministic hashing, fail-fast on divergence.
// Upstream: run-full-pipeline
// Downstream: verify-parity target
// ISM controls: ISM-0407
import { createHash, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';

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

function parseArgs(argv) {
  const args = {
    baseline: 'pipeline/parity-baseline.json',
    output: 'pipeline/outputs/parity-verification.json'
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--baseline') args.baseline = argv[i + 1];
    if (argv[i] === '--output') args.output = argv[i + 1];
  }
  return args;
}

export function verifyParity(baselinePath, outputPath) {
  const ajv = new Ajv2020({ allErrors: false, strict: true });
  const baselineSchema = sanitizeSchema(JSON.parse(readFileSync('schemas/parity-baseline.schema.json', 'utf8')));
  const outputSchema = sanitizeSchema(JSON.parse(readFileSync('schemas/parity-verification.schema.json', 'utf8')));
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));

  const baselineValidate = ajv.compile(baselineSchema);
  if (!baselineValidate(baseline)) throw new Error(`parity baseline schema failure: ${ajv.errorsText(baselineValidate.errors)}`);

  const artefacts = baseline.artefacts.map((entry) => {
    try {
      const actual = digest(entry.path);
      const expectedBuf = Buffer.from(entry.sha256_digest.slice(7), 'hex');
      const actualBuf = Buffer.from(actual.slice(7), 'hex');
      return {
        path: entry.path,
        expected_digest: entry.sha256_digest,
        actual_digest: actual,
        status: timingSafeEqual(expectedBuf, actualBuf) ? 'DIGEST_MATCH' : 'DIGEST_MISMATCH'
      };
    } catch {
      return {
        path: entry.path,
        expected_digest: entry.sha256_digest,
        actual_digest: null,
        status: 'FILE_NOT_FOUND'
      };
    }
  });

  const report = {
    overall_status: artefacts.every((a) => a.status === 'DIGEST_MATCH') ? 'PARITY_VERIFIED' : 'PARITY_DIVERGED',
    baseline_path: baselinePath,
    artefacts
  };

  const reportValidate = ajv.compile(outputSchema);
  if (!reportValidate(report)) throw new Error(`parity report schema failure: ${ajv.errorsText(reportValidate.errors)}`);

  mkdirSync('pipeline/outputs', { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (report.overall_status !== 'PARITY_VERIFIED') throw new Error('LOCAL_CI_PARITY_FAILURE');
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv);
  verifyParity(args.baseline, args.output);
}
