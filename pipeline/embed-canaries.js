// File: pipeline/embed-canaries.js
// Role: Embed runtime-injected Canary Token references into declared artefacts and emit placement evidence.
// Constraints enforced: ENV := ∅ for token URLs, filesystem-only I/O, no subprocess usage, no clock reads.
// Upstream: register-webhooks
// Downstream: generate-runbook
// ISM controls: ISM-0109, ISM-0140, ISM-0585, ISM-1858
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { extname } from 'node:path';
import Ajv from 'ajv/dist/2020.js';

const MANIFEST_PATH = process.env.CANARY_INPUT || '/input/canary-manifest.json';
const MANIFEST_SCHEMA_PATH = './schemas/canary-manifest.schema.json';
const LOG_SCHEMA_PATH = './schemas/canary-placement-log.schema.json';
const PIPELINE_CONFIG_PATH = './pipeline/pipeline.config.json';
const LOG_PATH = './pipeline/outputs/canary-placement-log.json';

const ajv = new Ajv({ allErrors: false, strict: true });
const manifestSchema = JSON.parse(readFileSync(MANIFEST_SCHEMA_PATH, 'utf8'));
const logSchema = JSON.parse(readFileSync(LOG_SCHEMA_PATH, 'utf8'));
const validateManifest = ajv.compile(manifestSchema);
const validateLog = ajv.compile(logSchema);

function sha256Digest(content) {
  return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`;
}

function commentLine(filePath, body) {
  const extension = extname(filePath);
  if (filePath.endsWith('.md')) {
    return `<!-- ${body} -->`;
  }
  if (extension === '.json') {
    return `/* ${body} */`;
  }
  return `# ${body}`;
}

function embedToken(content, token) {
  const marker = `INTEGRITY-REF: ${token.token_url}`;
  if (content.includes(marker) || content.includes(token.token_url)) {
    return content;
  }

  if (token.placement_strategy === 'embed_as_metadata_field') {
    const parsed = JSON.parse(content);
    if (Object.prototype.hasOwnProperty.call(parsed, 'canary_ref')) {
      throw new Error(`Idempotency guard triggered: canary_ref already exists in ${token.placement_target}`);
    }
    parsed.canary_ref = token.token_url;
    return `${JSON.stringify(parsed, null, 2)}\n`;
  }

  if (token.placement_strategy === 'embed_as_invisible_link') {
    return content.endsWith('\n')
      ? `${content}\u200B<!-- ${token.token_url} -->\n`
      : `${content}\n\u200B<!-- ${token.token_url} -->\n`;
  }

  if (token.placement_strategy === 'embed_as_url_reference') {
    const line = commentLine(token.placement_target, `integrity: ${token.token_url}`);
    return content.endsWith('\n') ? `${content}${line}\n` : `${content}\n${line}\n`;
  }

  const line = commentLine(token.placement_target, marker);
  return content.endsWith('\n') ? `${content}${line}\n` : `${content}\n${line}\n`;
}

function loadPipelineRunRef() {
  const pipelineConfig = JSON.parse(readFileSync(PIPELINE_CONFIG_PATH, 'utf8'));
  if (typeof pipelineConfig.pipeline_run_ref !== 'string' || pipelineConfig.pipeline_run_ref.length === 0) {
    throw new Error('pipeline.config.json must define top-level pipeline_run_ref');
  }
  return pipelineConfig.pipeline_run_ref;
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
if (!validateManifest(manifest)) {
  throw new TypeError(`Canary manifest validation failure: ${ajv.errorsText(validateManifest.errors)}`);
}

const placements = manifest.tokens.map((token) => {
  const before = readFileSync(token.placement_target, 'utf8');
  const after = embedToken(before, token);
  writeFileSync(token.placement_target, after, 'utf8');

  return {
    token_id: token.token_id,
    placement_target: token.placement_target,
    placement_strategy: token.placement_strategy,
    sha256_digest_before: sha256Digest(before),
    sha256_digest_after: sha256Digest(after),
    ism_controls: token.ism_controls
  };
});

const placementLog = {
  manifest_version: manifest.manifest_version,
  pipeline_run_ref: loadPipelineRunRef(),
  placements
};

if (!validateLog(placementLog)) {
  throw new TypeError(`Canary placement log validation failure: ${ajv.errorsText(validateLog.errors)}`);
}

writeFileSync(LOG_PATH, `${JSON.stringify(placementLog, null, 2)}\n`, 'utf8');
