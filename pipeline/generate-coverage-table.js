// File: pipeline/generate-coverage-table.js
// Role: Deterministic markdown table generator from schema-validated mapping matrix.
// Constraints enforced: filesystem-only I/O, no subprocess usage, fail-fast schema validation, no clock primitives.
// Upstream: sign-and-attest
// Downstream: emit-trace-matrix
import { readFileSync, writeFileSync } from 'node:fs';
import Ajv from 'ajv/dist/2020.js';

const MATRIX_PATH = './pipeline/mapping-matrix.json';
const SCHEMA_PATH = './schemas/mapping-matrix.schema.json';
const OUTPUT_PATH = './pipeline/outputs/coverage-table.md';

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const ajv = new Ajv({ allErrors: false, strict: true });
const schema = loadJson(SCHEMA_PATH);
const matrix = loadJson(MATRIX_PATH);
const validate = ajv.compile(schema);

if (!validate(matrix)) {
  throw new TypeError(`Mapping matrix validation failure: ${ajv.errorsText(validate.errors)}`);
}

const rows = matrix.mappings
  .map((entry) => {
    const statusEmoji = entry.coverage_status === 'COVERED'
      ? '✅'
      : entry.coverage_status === 'PARTIAL'
        ? '⚠️'
        : '❌';

    return `| ${entry.control_id} | ${entry.control_description} | ${entry.framework_refs.join(', ')} | ${entry.evidence_artefact} | ${entry.pipeline_stage} | ${statusEmoji} ${entry.coverage_status} |`;
  })
  .join('\n');

const detectionRows = matrix.mappings
  .filter((entry) => entry.control_id.startsWith('CTRL-DETECT-'))
  .map((entry) => {
    const statusEmoji = entry.coverage_status === 'COVERED'
      ? '✅'
      : entry.coverage_status === 'PARTIAL'
        ? '⚠️'
        : '❌';

    return `| ${entry.control_id} | ${entry.control_description} | ${entry.framework_refs.join(', ')} | ${entry.evidence_artefact} | ${entry.pipeline_stage} | ${statusEmoji} ${entry.coverage_status} |`;
  })
  .join('\n');

const markdown = [
  `## Control Coverage — ${matrix.framework_version}`,
  '',
  '| Control ID | Description | Frameworks | Evidence Artefact | Stage | Status |',
  '|:---|:---|:---|:---|:---|:---|',
  rows,
  '',
  '## Detection & Monitoring',
  '',
  '| Control ID | Description | Frameworks | Evidence Artefact | Stage | Status |',
  '|:---|:---|:---|:---|:---|:---|',
  detectionRows || '| N/A | No detection and monitoring controls declared | N/A | N/A | N/A | N/A |',
  ''
].join('\n');

writeFileSync(OUTPUT_PATH, markdown, 'utf8');
