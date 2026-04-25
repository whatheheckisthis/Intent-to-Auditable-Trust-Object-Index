// File: pipeline/package-evidence-bundle.js
// Role: Deterministic evidence bundle packager that copies artefacts and emits hash-bound manifest plus verifier script.
// Constraints enforced: schema-bound-config, no-subprocess-execution, delta-t-zero-no-clock-read, sha256-only-digests, fail-fast-on-missing-artefact.
// Upstream: run-mutation-suite
// Downstream: generate-runbook
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';

const REPO_ROOT = process.cwd();
const CONFIG_PATH = path.join(REPO_ROOT, 'pipeline/bundle-config.json');
const CONFIG_SCHEMA_PATH = path.join(REPO_ROOT, 'schemas/bundle-config.schema.json');
const MANIFEST_SCHEMA_PATH = path.join(REPO_ROOT, 'schemas/bundle-manifest.schema.json');
const OUTPUT_DIR = path.join(REPO_ROOT, 'pipeline/outputs/evidence-bundle');

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

function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  const hash = createHash('sha256');
  hash.update(data);
  return `sha256:${hash.digest('hex')}`;
}

function ensureOutputDir() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function copyArtefact(entry) {
  const sourcePath = path.join(REPO_ROOT, entry.source_path);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Required artefact missing: ${entry.source_path}`);
  }

  const destinationPath = path.join(OUTPUT_DIR, entry.name);
  fs.copyFileSync(sourcePath, destinationPath);

  return {
    name: entry.name,
    path: `pipeline/outputs/evidence-bundle/${entry.name}`,
    sha256_digest: sha256File(destinationPath),
    producing_stage: entry.producing_stage,
    framework_controls: entry.framework_controls
  };
}

function buildVerifyScript() {
  return `#!/bin/sh
set -eu

BUNDLE_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
MANIFEST="$BUNDLE_DIR/bundle-manifest.json"

if [ ! -f "$MANIFEST" ]; then
  echo "BUNDLE_INTEGRITY_FAILURE: missing bundle-manifest.json"
  exit 1
fi

STATUS=0

while IFS= read -r item; do
  name=$(printf '%s' "$item" | jq -r '.name')
  rel_path=$(printf '%s' "$item" | jq -r '.path')
  expected=$(printf '%s' "$item" | jq -r '.sha256_digest')
  expected=${expected#sha256:}
  file="$BUNDLE_DIR/${rel_path##*/}"

  if [ ! -f "$file" ]; then
    echo "[FAIL] $name missing"
    STATUS=1
    continue
  fi

  set -- $(sha256sum "$file")
  actual=$1
  if [ "$actual" = "$expected" ]; then
    echo "[PASS] $name"
  else
    echo "[FAIL] $name digest mismatch"
    STATUS=1
  fi
done <<EOF
$(jq -c '.artefacts[]' "$MANIFEST")
EOF

rekor_url=$(jq -r '.cosign_policy.rekor_url' "$MANIFEST")
identity_regexp=$(jq -r '.cosign_policy.certificate_identity_regexp' "$MANIFEST")
oidc_issuer=$(jq -r '.cosign_policy.certificate_oidc_issuer' "$MANIFEST")

if cosign verify-blob \
  --rekor-url "$rekor_url" \
  --certificate-identity-regexp "$identity_regexp" \
  --certificate-oidc-issuer "$oidc_issuer" \
  --signature "$BUNDLE_DIR/bundle-manifest.sig" \
  "$BUNDLE_DIR/attestation.json" >/dev/null 2>&1; then
  echo "[PASS] cosign verification"
else
  echo "[FAIL] cosign verification"
  STATUS=1
fi

if [ "$STATUS" -eq 0 ]; then
  echo "BUNDLE_VERIFIED"
  exit 0
fi

echo "BUNDLE_INTEGRITY_FAILURE"
exit 1
`;
}

function main() {
  const configSchema = readJson(CONFIG_SCHEMA_PATH);
  const config = readJson(CONFIG_PATH);
  validateJson(config, configSchema, 'Bundle config');

  ensureOutputDir();

  const artefacts = config.artefacts.map(copyArtefact);
  const manifest = {
    bundle_id: config.bundle_id,
    pipeline_run_ref: config.pipeline_run_ref,
    created_at_parameter: config.created_at_parameter,
    framework_version: config.framework_version,
    cosign_policy: config.cosign_policy,
    artefacts
  };

  const manifestSchema = readJson(MANIFEST_SCHEMA_PATH);
  validateJson(manifest, manifestSchema, 'Bundle manifest');

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'bundle-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );

  const verifyScriptPath = path.join(OUTPUT_DIR, 'verify-bundle.sh');
  fs.writeFileSync(verifyScriptPath, buildVerifyScript(), 'utf8');
  fs.chmodSync(verifyScriptPath, 0o755);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
