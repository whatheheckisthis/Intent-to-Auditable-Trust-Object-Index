// File: pipeline/generate-runbook.js
// Role: Deterministic runbook generator that derives machine/human outputs from validated pipeline DAG configuration.
// Constraints enforced: schema-bound-inputs, no-subprocess-calls, dag-derived-content-only, fail-fast-validation, deterministic-markdown-rendering.
// Upstream: package-evidence-bundle
// Downstream: TERMINAL
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const REPO_ROOT = process.cwd();
const PIPELINE_CONFIG_PATH = path.join(REPO_ROOT, 'pipeline/pipeline.config.json');
const MAPPING_MATRIX_PATH = path.join(REPO_ROOT, 'pipeline/mapping-matrix.json');
const MAPPING_SCHEMA_PATH = path.join(REPO_ROOT, 'schemas/mapping-matrix.schema.json');
const RUNBOOK_SCHEMA_PATH = path.join(REPO_ROOT, 'schemas/runbook.schema.json');
const OUTPUT_DIR = path.join(REPO_ROOT, 'pipeline/outputs/runbook');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}


function sanitizeSchema(schemaNode) {
  if (Array.isArray(schemaNode)) {
    return schemaNode.map(sanitizeSchema);
  }
  if (schemaNode !== null && typeof schemaNode === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(schemaNode)) {
      if (key.startsWith('#') || key.startsWith('__') || key === '$schema' || key === '$id') {
        continue;
      }
      sanitized[key] = sanitizeSchema(value);
    }
    return sanitized;
  }
  return schemaNode;
}
function validateJson(data, schema, label) {
  const ajv = new Ajv2020({
    strict: true,
    allErrors: true,
    useDefaults: false,
    coerceTypes: false,
    removeAdditional: false
  });

  const validate = ajv.compile(sanitizeSchema(schema));
  if (!validate(sanitizeSchema(data))) {
    throw new Error(`${label} validation failed: ${ajv.errorsText(validate.errors, { separator: '; ' })}`);
  }
}

function stageRecoveryProcedure(failureMode) {
  if (failureMode === 'HALT_PIPELINE') {
    return 'Fix root cause, revalidate stage input schema, and rerun pipeline from this stage.';
  }
  return 'Emit failure evidence record, halt pipeline, remediate input/control mismatch, rerun from failed stage.';
}

function mapControlsByStage(mappingMatrix) {
  const map = new Map();
  for (const entry of mappingMatrix.mappings) {
    if (!map.has(entry.pipeline_stage)) {
      map.set(entry.pipeline_stage, []);
    }
    map.get(entry.pipeline_stage).push(entry.control_id);
  }
  return map;
}

function buildRunbook(pipelineConfig, mappingMatrix) {
  if (!pipelineConfig.pipeline || !Array.isArray(pipelineConfig.pipeline.stages)) {
    throw new Error('pipeline.config.json must include pipeline.stages array');
  }

  const controlsByStage = mapControlsByStage(mappingMatrix);
  const stages = pipelineConfig.pipeline.stages.map((stage) => {
    const mappedControls = controlsByStage.get(stage.id) || stage.framework_controls;
    return {
      stage_id: stage.id,
      description: stage.description,
      depends_on: stage.depends_on,
      input_schema_ref: stage.input_schema,
      validation_command: `npx --yes ajv-cli@${pipelineConfig.pipeline.toolVersions.ajvCli} validate -s ${stage.input_schema} -d <INPUT_JSON_PATH>`,
      failure_mode: stage.failure_mode,
      recovery_procedure: stageRecoveryProcedure(stage.failure_mode),
      framework_controls: mappedControls
    };
  });

  return {
    generated_from_config: 'pipeline/pipeline.config.json',
    dag_stage_count: stages.length,
    stages
  };
}

function renderMarkdown(runbook) {
  const header = [
    '# Operator Runbook',
    '',
    '| Stage ID | Description | Depends On | Input Schema | Validation Command | Failure Mode | Recovery Procedure | Framework Controls |',
    '|:---|:---|:---|:---|:---|:---|:---|:---|'
  ];

  const rows = runbook.stages.map((stage) => [
    stage.stage_id,
    stage.description,
    stage.depends_on.length > 0 ? stage.depends_on.join(', ') : 'ROOT',
    stage.input_schema_ref,
    `\`${stage.validation_command}\``,
    stage.failure_mode,
    stage.recovery_procedure,
    stage.framework_controls.join(', ')
  ].join(' | '));

  return `${header.concat(rows).join('\n')}\n`;
}

function main() {
  const pipelineConfig = readJson(PIPELINE_CONFIG_PATH);
  const mappingMatrix = readJson(MAPPING_MATRIX_PATH);

  const mappingSchema = readJson(MAPPING_SCHEMA_PATH);
  validateJson(mappingMatrix, mappingSchema, 'Mapping matrix');

  const runbook = buildRunbook(pipelineConfig, mappingMatrix);
  const runbookSchema = readJson(RUNBOOK_SCHEMA_PATH);
  validateJson(runbook, runbookSchema, 'Runbook output');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'runbook.json'), `${JSON.stringify(runbook, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'runbook.md'), renderMarkdown(runbook), 'utf8');
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
