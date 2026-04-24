# File: policies/podman-runtime.rego
# Role: OPA policy enforcing mandatory Podman runtime flags on all container runs.
# Constraints enforced: fail-fast deny rules, static rule definitions, immutable runtime constraints.
# Upstream: generate-sbom
# Downstream: sign-and-attest
package podman.runtime

import rego.v1

deny contains msg if {
  not input.read_only == true
  msg := sprintf(
    "Container '%v' must be run with --read-only. Mutable root filesystem violates immutability constraint.",
    [input.container_name]
  )
}

deny contains msg if {
  not input.network == "none"
  msg := sprintf(
    "Container '%v' must be run with --network=none. Network access during execution phase is prohibited.",
    [input.container_name]
  )
}

deny contains msg if {
  input.env_host == true
  msg := sprintf(
    "Container '%v' must not use --env-host=true. Host environment propagation violates ENV := ∅ constraint.",
    [input.container_name]
  )
}

deny contains msg if {
  input.privileged == true
  msg := sprintf(
    "Container '%v' must not run as --privileged. Rootless execution is mandatory.",
    [input.container_name]
  )
}
