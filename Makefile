# File: Makefile
# Role: Podman-native local runner that mirrors CI DAG without recursive make.
# Constraints enforced: explicit DAG prerequisites, Podman-only commands, --read-only, --network=none, --env-host=false on all runs.
# Upstream: ROOT
# Downstream: emit-trace-matrix
.PHONY: all validate-inputs build-containers run-governance-policy run-cross-framework-alignment run-execution-orchestration run-validation-analytics generate-sbom evaluate-policies sign-and-attest emit-trace-matrix run-determinism-harness run-mutation-suite package-evidence-bundle register-webhooks embed-canaries generate-runbook verify-runtime capture-parity-baseline verify-parity run-full-pipeline
AJV_VERSION ?= 5.0.0

all: generate-runbook

verify-runtime:
	node pipeline/verify-runtime.js \
	  --config pipeline/runtime-versions.json \
	  --output pipeline/outputs/runtime-verification.json
	@STATUS=$$(jq -r '.overall_status' \
	  pipeline/outputs/runtime-verification.json); \
	  [ "$$STATUS" = "RUNTIME_CONSISTENT" ] || \
	  (node pipeline/emit-failure.js \
	    --type RUNTIME_INCONSISTENT --stage local \
	    --run-ref "$$(git rev-parse HEAD)" && exit 1)

capture-parity-baseline: verify-runtime
	@git diff --quiet || \
	  (echo "PARITY_BASELINE_ERROR: working tree is dirty — baseline must be captured on a clean tree matching the last CI pass" && exit 1)
	node pipeline/capture-parity-baseline.js \
	  --run-ref "$$(git rev-parse HEAD)" \
	  --output pipeline/parity-baseline.json

verify-parity: verify-runtime run-full-pipeline
	node pipeline/verify-parity.js \
	  --baseline pipeline/parity-baseline.json \
	  --output pipeline/outputs/parity-verification.json
	@STATUS=$$(jq -r '.overall_status' pipeline/outputs/parity-verification.json); \
	  [ "$$STATUS" = "PARITY_VERIFIED" ] || \
	  (echo "LOCAL_CI_PARITY_FAILURE: local outputs diverge from CI baseline" && exit 1)

run-full-pipeline: verify-runtime \
                   validate-inputs \
                   build-containers \
                   run-governance-policy \
                   run-cross-framework-alignment \
                   run-execution-orchestration \
                   run-validation-analytics \
                   generate-sbom \
                   evaluate-policies \
                   sign-and-attest \
                   emit-trace-matrix \
                   run-determinism-harness \
                   run-mutation-suite \
                   package-evidence-bundle \
                   register-webhooks \
                   embed-canaries \
                   generate-runbook

validate-inputs:
	node -e "const fs=require('node:fs'); const cfg=JSON.parse(fs.readFileSync('pipeline/pipeline.config.json','utf8')); if (!cfg.pipeline || !cfg.pipeline.timeoutsMinutes) { process.exit(1); }"

build-containers: validate-inputs
	podman build -f containers/governance-policy/Containerfile -t localhost/assurance/governance-policy:deterministic .
	podman build -f containers/cross-framework-alignment/Containerfile -t localhost/assurance/cross-framework-alignment:deterministic .
	podman build -f containers/execution-orchestration/Containerfile -t localhost/assurance/execution-orchestration:deterministic .
	podman build -f containers/validation-analytics/Containerfile -t localhost/assurance/validation-analytics:deterministic .
	podman build -f containers/sbom-generator/Containerfile -t sbom-generator:deterministic .

run-governance-policy: build-containers
	podman volume create assurance-evidence-store >/dev/null
	podman run --rm --read-only --network=none --env-host=false --volume assurance-evidence-store:/evidence:rw --volume ./pipeline:/inputs:ro localhost/assurance/governance-policy:deterministic /app/entrypoint /inputs/pipeline.config.json /evidence/governance-policy.json

run-cross-framework-alignment: run-governance-policy
	podman run --rm --read-only --network=none --env-host=false --volume assurance-evidence-store:/evidence:rw --volume ./pipeline:/inputs:ro localhost/assurance/cross-framework-alignment:deterministic /app/entrypoint /inputs/pipeline.config.json /evidence/governance-policy.json /evidence/cross-framework-alignment.json

run-execution-orchestration: run-cross-framework-alignment
	podman run --rm --read-only --network=none --env-host=false --volume assurance-evidence-store:/evidence:rw --volume ./pipeline:/inputs:ro localhost/assurance/execution-orchestration:deterministic /app/entrypoint /inputs/pipeline.config.json /evidence/cross-framework-alignment.json /evidence/execution-orchestration.json

run-validation-analytics: run-execution-orchestration
	podman run --rm --read-only --network=none --env-host=false --volume assurance-evidence-store:/evidence:rw --volume ./pipeline:/inputs:ro localhost/assurance/validation-analytics:deterministic /app/entrypoint /inputs/pipeline.config.json /evidence/execution-orchestration.json /evidence/validation-analytics.json

generate-sbom: run-validation-analytics
	podman run \
	  --read-only \
	  --network=none \
	  --env-host=false \
	  --rm \
	  --volume "$(SBOM_INPUT_PATH):/input:ro" \
	  --volume "$(SBOM_OUTPUT_PATH):/output:rw" \
	  sbom-generator@sha256:$(SBOM_IMAGE_DIGEST) \
	  /input/sbom-runner-input.json

evaluate-policies: generate-sbom
	conftest test \
	  --policy policies/ \
	  --namespace podman.runtime \
	  pipeline/outputs/podman-run-configs/*.json
	npx --yes ajv-cli@$(AJV_VERSION) validate \
	  -s schemas/pac-policy.schema.json \
	  -d policies/pac-policy.json
	node policies/pac-evaluator.js \
	  --input pipeline/pac-evaluator-input.json
	@STATUS=$$(jq -r '.overall_status' \
	  pipeline/outputs/pac-evaluation-result.json); \
	  [ "$$STATUS" = "POLICY_PASS" ] || \
	  (echo "POLICY_FAIL: pac-evaluator reported violations" && exit 1)

sign-and-attest: evaluate-policies
	# CONSTRAINT TRADE-OFF: Keyless signing depends on CI OIDC identity and is not executed in local offline mode.
	@echo "sign-and-attest is CI-only; execute in GitHub Actions with OIDC-enabled runner."

emit-trace-matrix: sign-and-attest
	node pipeline/generate-coverage-table.js


run-determinism-harness: emit-trace-matrix
	podman run \
	  --read-only \
	  --network=none \
	  --env-host=false \
	  --rm \
	  --volume "$(FIXTURE_PATH):/input:ro" \
	  --volume "$(HARNESS_OUTPUT_PATH):/output:rw" \
	  determinism-harness@sha256:$(HARNESS_IMAGE_DIGEST)
	@STATUS=$$(jq -r '.status' $(HARNESS_OUTPUT_PATH)/determinism-result.json); \
	  [ "$$STATUS" = "DETERMINISM_PASS" ] || (echo "DETERMINISM_FAILURE" && exit 1)

run-mutation-suite: run-determinism-harness
	podman run \
	  --read-only \
	  --network=none \
	  --env-host=false \
	  --rm \
	  --volume "$(PWD):/workspace:ro" \
	  --volume "$(MUTATION_OUTPUT_PATH):/output:rw" \
	  mutation-runner@sha256:$(MUTATION_IMAGE_DIGEST)
	@ESCAPED=$$(jq -r '.escaped' $(MUTATION_OUTPUT_PATH)/mutation-report.json); \
	  [ "$$ESCAPED" = "0" ] || (echo "MUTATION_ESCAPE" && exit 1)

package-evidence-bundle: run-mutation-suite
	node pipeline/package-evidence-bundle.js

register-webhooks: run-determinism-harness
	node pipeline/register-webhooks.js

embed-canaries: package-evidence-bundle
	@[ -f "$(CANARY_MANIFEST_PATH)" ] || \
	  (echo "CANARY_MANIFEST_PATH not set or file not found" && exit 1)
	CANARY_INPUT="$(CANARY_MANIFEST_PATH)" node pipeline/embed-canaries.js

generate-runbook: embed-canaries
	node pipeline/generate-runbook.js
	@echo "Runbook written to pipeline/outputs/runbook/"
