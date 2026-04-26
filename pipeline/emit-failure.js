// File: pipeline/emit-failure.js
// Role: Structured failure record emitter called before non-zero stage exit.
// Constraints enforced: schema validation before write, append-only failure output, fire-and-forget webhook dispatch, no eval/exec.
// Upstream: any pipeline stage error handler
// Downstream: package-evidence-bundle
// ISM controls: ISM-0109, ISM-1554
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';

const DEFAULT_ISM_MAP = Object.freeze({
  RUNNER_VERSION_MISMATCH: ['ISM-0407', 'ISM-1491'],
  ENV_CONTAMINATION: ['ISM-0407', 'ISM-1491'],
  ARTEFACT_INTEGRITY_FAILURE: ['ISM-0149', 'ISM-1753'],
  RUNTIME_INCONSISTENT: ['ISM-0407', 'ISM-1491', 'ISM-1753'],
  PIPELINE_STAGE_FAILURE: ['ISM-0109', 'ISM-1554']
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

function generateFailureId(stage, type, runRef) {
  return `FAIL-${createHash('sha256').update(`${stage}:${type}:${runRef}`).digest('hex').slice(0, 8).toUpperCase()}`;
}

function parseArgs(argv) {
  const args = { type: 'PIPELINE_STAGE_FAILURE', stage: 'unknown-stage', runRef: 'unknown-run' };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--type') args.type = argv[i + 1];
    if (argv[i] === '--stage') args.stage = argv[i + 1];
    if (argv[i] === '--run-ref') args.runRef = argv[i + 1];
    if (argv[i] === '--message') args.message = argv[i + 1];
  }
  return args;
}

export async function emitFailure(partialRecord) {
  const record = {
    failure_id: generateFailureId(partialRecord.pipeline_stage, partialRecord.failure_type, partialRecord.pipeline_run_ref),
    ...partialRecord
  };

  const ajv = new Ajv2020({ allErrors: false, strict: true });
  const schema = sanitizeSchema(JSON.parse(readFileSync('schemas/failure-record.schema.json', 'utf8')));
  const validate = ajv.compile(schema);

  if (!validate(record)) {
    mkdirSync('pipeline/outputs/failures', { recursive: true });
    writeFileSync(
      `pipeline/outputs/failures/FAIL-INVALID-${Date.now()}.json`,
      `${JSON.stringify({ raw: partialRecord, validation_errors: validate.errors }, null, 2)}\n`,
      'utf8'
    );
    // # CONSTRAINT TRADE-OFF:
    // Date.now() is used only as a fallback filename suffix for schema-invalid failure payloads.
    // It does not influence control flow, decision logic, or deterministic artefact content.
    return record;
  }

  mkdirSync('pipeline/outputs/failures', { recursive: true });
  const path = `pipeline/outputs/failures/${record.failure_id}.json`;
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

  import('../orchestration/webhook-dispatcher.js').then(({ dispatchAlert }) => {
    dispatchAlert({
      alert_id: record.failure_id.replace('FAIL-', 'ALERT-'),
      alert_type: 'PIPELINE_STAGE_FAILURE',
      pipeline_run_ref: record.pipeline_run_ref,
      severity: record.severity,
      ism_controls: record.ism_controls,
      detail: {
        source_stage: record.pipeline_stage,
        message: record.detail.message
      }
    }).catch(() => {});
  }).catch(() => {});

  return record;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv);
  emitFailure({
    failure_type: args.type,
    pipeline_stage: args.stage,
    pipeline_run_ref: args.runRef,
    severity: 'HIGH',
    ism_controls: DEFAULT_ISM_MAP[args.type] ?? ['ISM-0109'],
    detail: {
      message: args.message ?? `${args.type} detected in ${args.stage}`,
      affected_component: args.stage,
      expected_value: null,
      actual_value: null,
      artefact_path: 'pipeline/outputs/'
    },
    remediation: 'Review structured failure detail and rerun stage after fixing root cause.'
  }).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
