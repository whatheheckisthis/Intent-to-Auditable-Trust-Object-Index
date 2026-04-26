// File: pipeline/record-artefact-digests.js
// Role: Emit producer-side digest manifests for cross-job artefact ingress validation.
// Constraints enforced: no subprocess calls, schema-bound outputs, deterministic sha256 digests, fail-fast missing file checks.
// Upstream: producing job completion
// Downstream: actions/upload-artifact and verify-artefact-ingress
// ISM controls: ISM-0149, ISM-1753
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';

function computeDigest(path) {
  const data = readFileSync(path);
  return `sha256:${createHash('sha256').update(data).digest('hex')}`;
}

function parseArgs(argv) {
  const args = { input: '', output: '', jobId: '', runRef: '' };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--input') args.input = argv[i + 1];
    if (argv[i] === '--output') args.output = argv[i + 1];
    if (argv[i] === '--job-id') args.jobId = argv[i + 1];
    if (argv[i] === '--run-ref') args.runRef = argv[i + 1];
  }
  return args;
}

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

export function recordArtefactDigests(inputPath, outputPath, jobId, runRef) {
  const payload = JSON.parse(readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(payload.artefact_paths) || payload.artefact_paths.length === 0) {
    throw new Error('artefact_paths must be a non-empty array');
  }

  const manifest = {
    job_id: jobId,
    producing_pipeline_run_ref: runRef,
    artefacts: payload.artefact_paths.map((path) => ({
      path,
      sha256_digest: computeDigest(path),
      producing_job: jobId
    }))
  };

  const ajv = new Ajv2020({ allErrors: false, strict: true });
  const schema = sanitizeSchema(JSON.parse(readFileSync('schemas/ingress-manifest.schema.json', 'utf8')));
  const validateSchema = ajv.compile(schema);
  if (!validateSchema(manifest)) {
    throw new Error(`digest manifest schema failure: ${ajv.errorsText(validateSchema.errors)}`);
  }

  mkdirSync('pipeline/outputs', { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv);
  recordArtefactDigests(args.input, args.output, args.jobId, args.runRef);
}
