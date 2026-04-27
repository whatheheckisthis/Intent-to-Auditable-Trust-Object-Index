// File: pipeline/emit-failure.js
// Role: Structured failure/success record emitter called by pipeline stages.
// Constraints enforced: schema validation before write, append-only output, no eval/exec.
// Upstream: any pipeline stage handler
// Downstream: package-evidence-bundle
// ISM controls: ISM-0109, ISM-1554
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
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

export async function emitFailure(partialRecord) {
  const record = {
    failure_id: generateFailureId(partialRecord.pipeline_stage, partialRecord.failure_type, partialRecord.pipeline_run_ref),
    ...partialRecord
  };

  const ajv = new Ajv2020({ allErrors: false, strict: true });
  const schema = sanitizeSchema(JSON.parse(readFileSync('schemas/failure-record.schema.json', 'utf8')));
  const validate = ajv.compile(schema);

  mkdirSync('pipeline/outputs/failures', { recursive: true });

  if (!validate(record)) {
    writeFileSync(
      `pipeline/outputs/failures/FAIL-INVALID-${Date.now()}.json`,
      `${JSON.stringify({ raw: partialRecord, validation_errors: validate.errors }, null, 2)}\n`,
      'utf8'
    );
    return record;
  }

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

function parseCli() {
  const { values } = parseArgs({
    options: {
      type: { type: 'string', default: 'PIPELINE_STAGE_FAILURE' },
      stage: { type: 'string', default: 'unknown-stage' },
      'run-ref': { type: 'string', default: 'unknown-run' },
      message: { type: 'string', default: '' },
      component: { type: 'string', default: '' },
      'from-job-status': { type: 'string' }
    },
    strict: true
  });
  return values;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const values = parseCli();
  const status = values['from-job-status'];

  if (status === 'success') {
    const successRecord = {
      stage: values.stage,
      pipeline_run_ref: values['run-ref'],
      overall_status: 'STAGE_SUCCESS'
    };
    mkdirSync('pipeline/outputs/failures', { recursive: true });
    writeFileSync(
      `pipeline/outputs/failures/${values.stage}-success.json`,
      `${JSON.stringify(successRecord, null, 2)}\n`,
      'utf8'
    );
    process.exit(0);
  }

  emitFailure({
    failure_type: values.type,
    pipeline_stage: values.stage,
    pipeline_run_ref: values['run-ref'],
    severity: status === 'cancelled' ? 'HIGH' : 'CRITICAL',
    ism_controls: DEFAULT_ISM_MAP[values.type] ?? ['ISM-0109', 'ISM-1554'],
    detail: {
      message: values.message || `Job ${values.stage} exited with status: ${status || 'failure'}`,
      affected_component: values.component || values.stage,
      expected_value: null,
      actual_value: null,
      artefact_path: 'pipeline/outputs/'
    },
    remediation: `Inspect pipeline/outputs/failures/ for structured records from ${values.stage}`
  }).then(() => process.exit(0)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
