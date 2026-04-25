// File: policies/pac-evaluator.js
// Role: Schema-bound bridge between pac-policy.json and Conftest/OPA evaluation.
// Constraints enforced: ENV := ∅, shell: false, fail-fast non-zero rejection, no eval/exec, static execution paths.
// Upstream: evaluate-policies (receives evaluator input via schema-bound volume mount)
// Downstream: emit-trace-matrix (evaluation result appended to evidence bundle)
// ISM controls: ISM-0149, ISM-1491, ISM-0407

const { spawn } = require('node:child_process');
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('../orchestration/node_modules/ajv/dist/2020').default;

const ajv = new Ajv2020({ allErrors: false, strict: true });

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function loadAndValidate(filePath, schemaPath) {
  const data = loadJson(filePath);
  const schema = loadJson(schemaPath);
  const validate = ajv.compile(schema);

  if (!validate(data)) {
    throw new TypeError(
      `Schema validation failure [${filePath}]: ${ajv.errorsText(validate.errors)}`
    );
  }

  return data;
}

function parseCliInput(argv) {
  const inputFlagIndex = argv.indexOf('--input');
  if (inputFlagIndex === -1 || inputFlagIndex + 1 >= argv.length) {
    throw new TypeError('Missing required CLI argument: --input <path>');
  }

  return argv[inputFlagIndex + 1];
}

async function runConftest(evaluatorInput, namespace) {
  // CONSTRAINT TRADE-OFF
  // ENV := ∅ is implemented as a null-prototype environment with only PATH injected.
  // This is the minimum required boundary to resolve the conftest binary without reading process.env.
  const env = Object.create(null);
  env.PATH = '/usr/local/bin:/usr/bin:/bin';

  const args = [
    'test',
    '--policy', evaluatorInput.policy_dir_path,
    '--namespace', namespace,
    '--output', 'json',
    evaluatorInput.conftest_input_path
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn('conftest', args, {
      env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const stdout = [];
    const stderr = [];

    proc.stdout.on('data', (chunk) => stdout.push(chunk));
    proc.stderr.on('data', (chunk) => stderr.push(chunk));
    proc.on('error', (err) => reject(err));

    proc.on('close', (code) => {
      const rawOutput = Buffer.concat(stdout).toString('utf8').trim();

      if (rawOutput.length === 0) {
        reject(new Error(`Conftest produced no JSON output (exit ${code})`));
        return;
      }

      try {
        const parsed = JSON.parse(rawOutput);
        resolve({ exit_code: code, output: parsed });
      } catch {
        reject(
          new Error(
            `Conftest output parse failure (exit ${code}): ${Buffer.concat(stderr).toString('utf8')}`
          )
        );
      }
    });
  });
}

async function evaluatePolicy(evaluatorInput) {
  const policy = loadAndValidate(
    evaluatorInput.policy_file_path,
    evaluatorInput.policy_schema_path
  );

  const opaInput = {
    rules: policy.targets.opa.conditions,
    parameters: policy.parameters,
    metadata: policy.metadata
  };

  mkdirSync(path.dirname(evaluatorInput.conftest_input_path), { recursive: true });
  mkdirSync(path.dirname(evaluatorInput.output_path), { recursive: true });

  writeFileSync(
    evaluatorInput.conftest_input_path,
    `${JSON.stringify(opaInput, null, 2)}\n`,
    'utf8'
  );

  const result = await runConftest(evaluatorInput, policy.targets.opa.namespace);

  const evaluationResult = {
    policy_id: policy.metadata.policy_id,
    policy_version: policy.metadata.policy_version,
    pipeline_run_ref: evaluatorInput.pipeline_run_ref,
    opa_exit_code: result.exit_code,
    opa_result: result.output,
    azure_policy_status: policy.targets.azure_policy.coverage_status,
    azure_policy_gap: policy.targets.azure_policy.gap_note,
    aws_iam_status: policy.targets.aws_iam.coverage_status,
    aws_iam_gap: policy.targets.aws_iam.gap_note,
    framework_mappings: policy.framework_mappings,
    overall_status: result.exit_code === 0 ? 'POLICY_PASS' : 'POLICY_FAIL'
  };

  writeFileSync(
    evaluatorInput.output_path,
    `${JSON.stringify(evaluationResult, null, 2)}\n`,
    'utf8'
  );

  if (result.exit_code !== 0) {
    throw new Error(
      `Policy evaluation failed [${policy.metadata.policy_id}]: ${result.output.length} violation group(s) detected`
    );
  }

  return evaluationResult;
}

async function main() {
  const inputPath = parseCliInput(process.argv.slice(2));
  const resolvedInputPath = path.resolve(process.cwd(), inputPath);
  const inputSchemaPath = path.resolve(process.cwd(), 'schemas/pac-evaluator-input.schema.json');

  const evaluatorInput = loadAndValidate(resolvedInputPath, inputSchemaPath);
  await evaluatePolicy(evaluatorInput);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  evaluatePolicy
};
