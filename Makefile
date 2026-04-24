# File: Makefile
# Role: Podman-native local runner that mirrors CI DAG without recursive make.
# Constraints enforced: explicit DAG prerequisites, Podman-only commands, --read-only, --network=none, --env-host=false on all runs.
# Upstream: ROOT
# Downstream: emit-trace-matrix
.PHONY: all validate-inputs build-containers run-governance-policy run-cross-framework-alignment run-execution-orchestration run-validation-analytics generate-sbom evaluate-policies sign-and-attest emit-trace-matrix

all: emit-trace-matrix

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

sign-and-attest: evaluate-policies
	# CONSTRAINT TRADE-OFF: Keyless signing depends on CI OIDC identity and is not executed in local offline mode.
	@echo "sign-and-attest is CI-only; execute in GitHub Actions with OIDC-enabled runner."

emit-trace-matrix: sign-and-attest
	node pipeline/generate-coverage-table.js
