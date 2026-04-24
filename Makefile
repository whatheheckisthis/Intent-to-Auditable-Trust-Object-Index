# File: Makefile
# Role: Podman-native local runner that mirrors CI DAG without recursive make.
# Constraints enforced: explicit DAG prerequisites, Podman-only commands, --read-only, --network=none, --env-host=false on all runs.
# Upstream: ROOT
# Downstream: sign-and-emit
.PHONY: all validate-inputs build-containers run-governance-policy run-cross-framework-alignment run-execution-orchestration run-validation-analytics sign-and-emit

all: sign-and-emit

validate-inputs:
	node -e "const fs=require('node:fs'); const cfg=JSON.parse(fs.readFileSync('pipeline/pipeline.config.json','utf8')); if (!cfg.pipeline || !cfg.pipeline.timeoutsMinutes) { process.exit(1); }"

build-containers: validate-inputs
	podman build -f containers/governance-policy/Containerfile -t localhost/assurance/governance-policy:deterministic .
	podman build -f containers/cross-framework-alignment/Containerfile -t localhost/assurance/cross-framework-alignment:deterministic .
	podman build -f containers/execution-orchestration/Containerfile -t localhost/assurance/execution-orchestration:deterministic .
	podman build -f containers/validation-analytics/Containerfile -t localhost/assurance/validation-analytics:deterministic .

run-governance-policy: build-containers
	podman volume create assurance-evidence-store >/dev/null
	podman run --rm --read-only --network=none --env-host=false --volume assurance-evidence-store:/evidence:rw --volume ./pipeline:/inputs:ro localhost/assurance/governance-policy:deterministic /app/entrypoint /inputs/pipeline.config.json /evidence/governance-policy.json

run-cross-framework-alignment: run-governance-policy
	podman run --rm --read-only --network=none --env-host=false --volume assurance-evidence-store:/evidence:rw --volume ./pipeline:/inputs:ro localhost/assurance/cross-framework-alignment:deterministic /app/entrypoint /inputs/pipeline.config.json /evidence/governance-policy.json /evidence/cross-framework-alignment.json

run-execution-orchestration: run-cross-framework-alignment
	podman run --rm --read-only --network=none --env-host=false --volume assurance-evidence-store:/evidence:rw --volume ./pipeline:/inputs:ro localhost/assurance/execution-orchestration:deterministic /app/entrypoint /inputs/pipeline.config.json /evidence/cross-framework-alignment.json /evidence/execution-orchestration.json

run-validation-analytics: run-execution-orchestration
	podman run --rm --read-only --network=none --env-host=false --volume assurance-evidence-store:/evidence:rw --volume ./pipeline:/inputs:ro localhost/assurance/validation-analytics:deterministic /app/entrypoint /inputs/pipeline.config.json /evidence/execution-orchestration.json /evidence/validation-analytics.json

sign-and-emit: run-validation-analytics
	podman run --rm --read-only --network=none --env-host=false --volume assurance-evidence-store:/evidence:rw --volume ./pipeline:/inputs:ro --volume signing-key-volume:/signing-key:ro localhost/assurance/validation-analytics:deterministic /app/sign-and-emit /inputs/pipeline.config.json /signing-key/ed25519.key /evidence/validation-analytics.json /evidence/signed-s-out.json
