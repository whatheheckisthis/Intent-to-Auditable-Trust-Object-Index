// File: pipeline/verify-artefact-ingress.js
// Role: Verify SHA-256 digests of all artefacts received from prior jobs before processing.
// Constraints enforced: no subprocess calls, timing-safe digest compare, schema-bound manifest, fail-fast mismatch halt.
// Upstream: actions/download-artifact
// Downstream: receiving job logic stages
// ISM controls: ISM-0149, ISM-1753, ISM-0407
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

function computeDigest(filePath) {
  const content = readFileSync(filePath);
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function parseArgs(argv) {
  const args = { manifest: '', output: '', jobId: 'unknown-job' };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--manifest') args.manifest = argv[i + 1];
    if (argv[i] === '--output') args.output = argv[i + 1];
    if (argv[i] === '--job-id') args.jobId = argv[i + 1];
  }
  return args;
}

export function verifyIngress(manifestPath, outputPath, jobId) {
  const ajv = new Ajv2020({ allErrors: false, strict: true });
  const schema = sanitizeSchema(JSON.parse(readFileSync('schemas/ingress-manifest.schema.json', 'utf8')));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const validateSchema = ajv.compile(schema);

  if (!validateSchema(sanitizeSchema(manifest))) {
    throw new TypeError(`Ingress manifest schema failure: ${ajv.errorsText(validateSchema.errors)}`);
  }

  const results = manifest.artefacts.map((expected) => {
    try {
      const actual = computeDigest(expected.path);
      const expectedBuf = Buffer.from(expected.sha256_digest.replace('sha256:', ''), 'hex');
      const actualBuf = Buffer.from(actual.replace('sha256:', ''), 'hex');
      const status = timingSafeEqual(expectedBuf, actualBuf) ? 'DIGEST_MATCH' : 'DIGEST_MISMATCH';
      return {
        path: expected.path,
        producing_job: expected.producing_job,
        expected_digest: expected.sha256_digest,
        actual_digest: actual,
        status
      };
    } catch {
      return {
        path: expected.path,
        producing_job: expected.producing_job,
        expected_digest: expected.sha256_digest,
        actual_digest: null,
        status: 'FILE_NOT_FOUND'
      };
    }
  });

  const record = {
    job_id: jobId,
    overall_status: results.every((r) => r.status === 'DIGEST_MATCH') ? 'INGRESS_VERIFIED' : 'ARTEFACT_INTEGRITY_FAILURE',
    artefacts: results
  };

  mkdirSync('pipeline/outputs', { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

  if (record.overall_status !== 'INGRESS_VERIFIED') {
    throw new Error('ARTEFACT_INTEGRITY_FAILURE');
  }

  return record;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv);
  verifyIngress(args.manifest, args.output, args.jobId);
}
