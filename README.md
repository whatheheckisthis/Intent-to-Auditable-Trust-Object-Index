# IATO: IAM Control Evaluation Framework (CEF) v1.0.0

IATO ingests identity and governance data from multiple sources, normalizes selected fields, evaluates access-control assertions, and produces evidence-oriented output. It is designed to observe and report only: it does not write to SailPoint, Microsoft Entra ID, Active Directory, or other source systems.

> **Status:** This repository contains working AC-012/AC-013 Rego policies and a Python-based IIQ XML normalizer / multi-source CLI. A separate .NET Microsoft Graph collector prototype is also present under `dotnet/`. The .NET collector is not yet integrated with the XML parser and CLI, and the complete production workflow described in the roadmap is not finished.

## Contents

- [Design principles](#design-principles)
- [Current implementation](#current-implementation)
- [Repository layout](#repository-layout)
- [Build and test](#build-and-test)
- [Python multi-source CLI](#python-multi-source-cli)
- [.NET Microsoft Graph collector prototype](#net-microsoft-graph-collector-prototype)
- [SailPoint IIQ XML handling](#sailpoint-iiq-xml-handling)
- [Output shape](#output-shape)
- [Security and credentials](#security-and-credentials)
- [Roadmap / to do](#roadmap--to-do)

## Design principles

1. **Read-only collection.** Source systems are not modified.
2. **Data in, JSON out.** Source configuration and embedded BeanShell are treated as data, never executed.
3. **Keep sources distinct.** SailPoint governance metadata and Entra directory data are placed under separate keys in `sources`; they are not silently merged into a common identity model.
4. **Least privilege.** Graph permissions must be limited to the read-only endpoints actually used and granted on the app registration.
5. **No committed credentials or customer exports.** Do not put tokens, private keys, certificates, or production XML exports in the repository.

## Current implementation

| Component | Current state |
|---|---|
| Rego policies AC-012 and AC-013 | Implemented using Rego v1 syntax |
| Rego policy tests and mutation fixtures | Present |
| Python SailPoint IIQ XML metadata normalizer | Present in `ingest/sailpoint_iiq.py`; rejects DTD/entity declarations and enforces a 10 MiB size cap; does not execute BeanShell |
| Python source-combining CLI | Present in `iato/cli.py`; accepts IIQ XML and either an Entra JSON snapshot or live collection |
| Python Entra collector | Present in `collectors/azure/entra_snapshot.py`; its current live-auth path uses `MS_GRAPH_TOKEN` and should be treated as a prototype, not the preferred production credential flow |
| .NET Graph auth and collector prototype | Present under `dotnet/`; uses Azure.Identity certificate or workload identity credentials and Graph paging, but is not yet integrated into the root CLI / XML parser workflow |
| Podman container definition | A root `Containerfile` exists for the Python CLI; a .NET runtime/build `Containerfile` prototype is under `dotnet/` |
| Kubernetes deployment | Not yet implemented as a complete, validated deployment |
| Active Directory ingestion | Not implemented as a complete collector |

## Repository layout

```text
.
├── collectors/azure/entra_snapshot.py   # Python Entra collector
├── dotnet/                              # .NET Graph collector prototype
│   ├── Containerfile
│   ├── Graph/
│   ├── Program.cs
│   └── iato.csproj
├── iato/                                # Python multi-source CLI
├── ingest/sailpoint_iiq.py              # Python IIQ XML normalizer
├── policies/ac/                         # AC-012 and AC-013 Rego policies
├── scripts/                             # local Podman wrappers, if present
├── test/                                # policy and Python unit tests
└── docs/                                # crosswalk and implementation notes
```

## Build and test

Run the Python unit tests from the repository root:

```sh
python -m unittest discover -s test/unit
```

Run the Rego mutation fixtures (requires the `regopy` dependency used by the project):

```sh
python test/run_tests.py
```

The .NET collector is a separate prototype. Its dependency versions are pinned in `dotnet/iato.csproj`. Build it from its project directory when a .NET 8 SDK is available:

```sh
cd dotnet
dotnet restore iato.csproj
dotnet build iato.csproj --no-restore
```

The .NET prototype has not yet been validated as a complete CLI/container workflow. Do not infer production readiness from its presence.

## Python multi-source CLI

The Python CLI accepts the following input modes:

```text
python -m iato.cli [--sailpoint-xml PATH] [--entra-json PATH | --live-entra]
```

- `--sailpoint-xml`: read and normalize an IIQ XML export.
- `--entra-json`: include a previously collected Entra JSON object without making a network request.
- `--live-entra`: invoke the current Python Entra collector. This legacy path requires `MS_GRAPH_TOKEN`; it does not acquire tokens from an app registration. Prefer the .NET credential-based collector prototype for certificate/workload-identity development, and do not treat a long-lived static token as a production credential strategy.

Example offline invocation:

```sh
python -m iato.cli \
  --sailpoint-xml input/iiq-export.xml \
  --entra-json input/entra-snapshot.json \
  > output/combined.json
```

The CLI writes JSON to stdout. Keep customer inputs and generated output out of source control.

## .NET Microsoft Graph collector prototype

The code under `dotnet/` is a separate, in-progress Graph collector and is not the root Python CLI. Its credential factory prefers:

1. Azure workload identity (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_FEDERATED_TOKEN_FILE`); or
2. Certificate-based app registration (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_CERTIFICATE_PATH`).

Azure.Identity manages short-lived access-token acquisition and in-memory caching. No persistent token cache is configured. The factory has no static-token fallback. The collector uses Microsoft Graph SDK `PageIterator` for users, Conditional Access policies, role assignments, and groups, and emits an Entra snapshot JSON structure.

This prototype currently runs as its own .NET executable; it does not yet accept the complete `--sailpoint-xml` / `--entra-json` / `--live-entra` interface or produce the combined SailPoint-plus-Entra result. Validate compilation, endpoint behavior, and tenant-specific permissions before relying on it.

## SailPoint IIQ XML handling

`ingest/sailpoint_iiq.py` currently extracts metadata for `Rule`, `TaskDefinition`, and `EmailTemplate` objects. For `Rule` source blocks, it records a SHA-256 digest and UTF-8 byte length rather than copying the BeanShell text into output. It does not interpret, compile, or execute BeanShell.

The current parser rejects documents containing DOCTYPE/entity declarations and enforces a 10 MiB input cap. It is a Python prototype; the hardened `XmlReader` implementation and full validation suite described in the roadmap have not been completed. Use sanitized sample files during development. Do not process sensitive production exports until the parser and tests have been reviewed.

## Output shape

The Python CLI combines source results without conflating them. The high-level structure is:

```json
{
  "schema_version": "1.0",
  "sources": {
    "sailpoint_iiq": {
      "source": "sailpoint_iiq_xml",
      "objects": []
    },
    "entra": {}
  }
}
```

The exact fields within each source are specific to the collector and may evolve. The .NET collector prototype currently emits only its Entra portion; it does not produce the combined structure by itself.

## Security and credentials

- Treat IIQ exports and embedded BeanShell as untrusted input. Never run BeanShell from an export.
- Use offline collection with `--network=none` when processing XML plus a saved Entra JSON snapshot. Live Graph requests require network access, so never combine live mode with `--network=none`.
- The current Python live collector expects a static `MS_GRAPH_TOKEN`. This is a legacy development path; access tokens expire and should not be stored in source, shell history, image layers, or XML.
- For production-oriented live collection, prefer certificate-based app registration for local Podman/CI and workload identity for Kubernetes. Keep private keys in a secret store and mount them read-only; workload identity avoids a stored client credential in the cluster.
- Use the Graph `.default` scope only with an app registration granted the minimum required read-only application permissions. `.default` requests the permissions already consented to that app; least privilege is configured and audited on the app registration, not enforced by the scope string.
- The .NET collector accesses users, Conditional Access policies, role assignments, and groups. Confirm the exact current Microsoft Graph application permissions required for the selected endpoints before admin consent. MFA registration is not included; it requires `UserAuthenticationMethod.Read.All` and has intentionally not been added.
- Containers should run non-root, read-only, with capabilities dropped and privilege escalation disabled where supported. Do not store credentials in ConfigMaps.

## Roadmap / to do

The following describes planned work; it is not a claim that the features are complete.

1. **Finish and validate the .NET collector**: compile and test the Graph collector, verify `PageIterator` behavior and endpoint models, handle Graph errors safely, and document tested permission requirements.
2. **Integrate a production CLI**: support `--sailpoint-xml`, `--entra-json`, and `--live-entra` in one interface, with stable exit codes and JSON output under `schema_version` and separate `sources` keys.
3. **Harden IIQ parsing**: implement the planned C# `XmlReader` parser with DTD prohibited, resolver disabled, document-size limits checked before parsing, and tests for DOCTYPE, external entities, malformed input, and oversized files.
4. **Complete BeanShell evidence metadata**: retain only opaque-script hash/length metadata and a `review_required` marker; record the original XML file hash without copying script text to output.
5. **Credential lifecycle**: keep certificate auth for local Podman/CI and workload identity for Kubernetes as the preferred live paths; if static-token compatibility is ever retained, require explicit opt-in and read the token from a file, never argv or an environment value.
6. **Podman workflows**: validate offline and live runs separately. Offline runs use `--network=none`; live Graph runs require network connectivity and a mounted certificate secret.
7. **Kubernetes deployment**: add and validate workload-identity ServiceAccount and Job manifests, plus a ConfigMap only for non-sensitive XML/configuration. Do not put credentials in the ConfigMap.
8. **Test before real data**: add unit and integration coverage using sanitized fixtures, then verify the parser rejection tests pass before using customer exports.
9. **Broader source and control coverage**: implement Active Directory ingestion, group-member expansion where approved, Conditional Access evaluation, and additional SoD/entitlement/migration assertions.

## Repository hygiene

Do not commit source exports, generated result JSON, tokens, private keys, or certificates. Keep local inputs and outputs ignored. If a secret is committed, rotate it immediately; deleting it in a later commit does not remove it from repository history.
