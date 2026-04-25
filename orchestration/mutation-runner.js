// File: orchestration/mutation-runner.js
// Role: Deterministic mutation test executor for schema validator fail-fast verification.
// Constraints enforced: schema-bound-inputs, strict-ajv-validation, no-dynamic-execution, fail-fast-on-escape, filesystem-scoped-io.
// Upstream: run-determinism-harness
// Downstream: package-evidence-bundle
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const REPO_ROOT = process.cwd();
const MANIFEST_PATH = path.join(REPO_ROOT, 'test/mutations/mutation-manifest.json');
const MANIFEST_SCHEMA_PATH = path.join(REPO_ROOT, 'schemas/mutation-manifest.schema.json');
const REPORT_SCHEMA_PATH = path.join(REPO_ROOT, 'schemas/mutation-report.schema.json');
const REPORT_OUTPUT_PATH = '/output/mutation-report.json';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateWithSchema(ajv, schema, payload, label) {
  const validate = ajv.compile(sanitizeSchema(schema));
  const valid = validate(sanitizeSchema(payload));
  if (!valid) {
    throw new Error(`${label} validation failed: ${ajv.errorsText(validate.errors, { separator: '; ' })}`);
  }
}

function validateMutationFixture(ajv, mutation) {
  const schemaPath = path.join(REPO_ROOT, mutation.target_schema);
  const fixturePath = path.join(REPO_ROOT, mutation.fixture_path);

  const schema = readJson(schemaPath);
  const fixture = readJson(fixturePath);
  const validate = ajv.compile(sanitizeSchema(schema));
  const valid = validate(fixture);

  if (valid) {
    return {
      mutation_id: mutation.mutation_id,
      status: 'ESCAPED',
      expected_error_keyword: mutation.expected_error_keyword,
      actual_error_keyword: null
    };
  }

  const firstError = Array.isArray(validate.errors) && validate.errors.length > 0
    ? validate.errors[0].keyword
    : null;

  const caught = firstError === mutation.expected_error_keyword;

  return {
    mutation_id: mutation.mutation_id,
    status: caught ? 'CAUGHT' : 'ESCAPED',
    expected_error_keyword: mutation.expected_error_keyword,
    actual_error_keyword: firstError
  };
}

function ensureOutputDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeReport(report) {
  ensureOutputDir(REPORT_OUTPUT_PATH);
  fs.writeFileSync(REPORT_OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function main() {
  const ajv = new Ajv2020({
    strict: true,
    allErrors: true,
    useDefaults: false,
    coerceTypes: false,
    removeAdditional: false
  });

  const manifestSchema = readJson(MANIFEST_SCHEMA_PATH);
  const manifest = readJson(MANIFEST_PATH);
  validateWithSchema(ajv, manifestSchema, manifest, 'Mutation manifest');

  const results = manifest.mutations.map((mutation) => validateMutationFixture(ajv, mutation));
  const totalMutations = results.length;
  const escaped = results.filter((item) => item.status === 'ESCAPED').length;
  const caught = totalMutations - escaped;

  const report = {
    total_mutations: totalMutations,
    caught,
    escaped,
    escape_rate: totalMutations === 0 ? 0 : escaped / totalMutations,
    results
  };

  const reportSchema = readJson(REPORT_SCHEMA_PATH);
  validateWithSchema(ajv, reportSchema, report, 'Mutation report');

  writeReport(report);

  if (escaped > 0) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
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

