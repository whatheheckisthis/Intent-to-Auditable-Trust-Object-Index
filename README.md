# Control Evaluation Framework 
## v1.0.0

>Entra ID collection (--live-entra) runs non-interactively via the Microsoft Graph API, replacing ad hoc az ad or PowerShell queries with a repeatable run. It pages users, directory roles, and conditional access policies via @odata.nextLink and uses $select to retrieve only required attributes. Output is normalised to a common JSON schema for SoD, privileged access and migration drift assertions. Auth: iato.pem or Kubernetes workload identity; tokens held in process memory only, never persisted.

## Contents
- [Requirements](#requirements)
- [Repository](#repository)
- [Build and test](#build-and-test)
- [Command-line interface](#command-line-interface)
- [Authentication](#authentication)
- [Microsoft Entra app registration](#microsoft-entra-app-registration)
- [Graph permissions](#graph-permissions)
- [SailPoint IIQ XML handling](#sailpoint-iiq-xml-handling)
- [Output schema](#output-schema)
- [Running with Podman](#running-with-podman)
- [Running on Kubernetes](#running-on-kubernetes)
- [Security policy](#security-policy)
- [Repository hygiene](#repository-hygiene)

[![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Microsoft Entra ID](https://img.shields.io/badge/Microsoft-Entra%20ID-0078D4?logo=microsoftentra&logoColor=white)](https://learn.microsoft.com/en-us/entra/identity-platform/v2-overview)
[![Microsoft Graph](https://img.shields.io/badge/Microsoft-Graph-0078D4?logo=microsoft&logoColor=white)](https://learn.microsoft.com/en-us/graph/overview)
[![Podman](https://img.shields.io/badge/Podman-ready-892CA0?logo=podman&logoColor=white)](https://podman.io/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-workload%20identity-326CE5?logo=kubernetes&logoColor=white)](https://azure.github.io/azure-workload-identity/)
![Auth](https://img.shields.io/badge/auth-certificate%20%7C%20workload%20identity-blue)


## Requirements

| Component | Version |
|---|---|
| .NET SDK | 8.0 (pinned in `global.json`) |
| Azure.Identity | 1.13.x |
| Microsoft.Graph | 5.x |
| Podman | 4.x or later (for container runs) |
| xunit | 2.x (tests) |


## Repository 

```
iato/
├── global.json
├── iato.csproj
├── Containerfile
├── .gitignore
├── src/
│   ├── Program.cs                 # argument parsing, exit codes
│   ├── Graph/
│   │   ├── GraphClientFactory.cs  # credential selection
│   │   └── EntraCollector.cs      # paged, read-only collection
│   ├── SailPoint/
│   │   └── IiqXmlParser.cs        # hardened XmlReader parsing
│   └── Output/
│       └── ResultWriter.cs        # normalized JSON
├── tests/
│   └── Iato.Tests/                # xunit
├── scripts/
│   ├── run.sh
│   └── run.ps1
├── k8s/
│   ├── serviceaccount.yaml
│   ├── configmap-iiq.yaml
│   └── job.yaml
├── input/                         # gitignored
└── output/                        # gitignored
```

## Build and test

```bash
dotnet restore
dotnet build -c Release
dotnet test -c Release
```

The test suite must pass before any real data is processed. It includes tests proving that DOCTYPE declarations, external entities, and oversised files are rejected.

## Command-line interface

```
iato --sailpoint-xml <path> (--entra-json <path> | --live-entra) [options]
```

| Flag | Required | Description |
|---|---|---|
| `--sailpoint-xml <path>` | Yes | Path to an IIQ XML export. Opened read-only. |
| `--entra-json <path>` | One of | Path to a previously collected Entra snapshot. Requires no network. |
| `--live-entra` | One of | Collect Entra data live from Microsoft Graph. Mutually exclusive with `--entra-json`. |
| `--include-group-members` | No | Also collect group membership identifiers. Live mode only. |
| `--max-xml-bytes <n>` | No | Maximum accepted XML file size in bytes. Default `10485760` (10 MiB). |
| `--help` | No | Print usage. |

Behaviour:

- The JSON document is written to **stdout**. Warnings and diagnostics are written to **stderr**.
- The tool never accepts tokens, secrets, or certificate contents as arguments.

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Unexpected error |
| `2` | Invalid or conflicting arguments |
| `3` | Input rejected (DOCTYPE or entity declaration, size limit exceeded, malformed XML, unreadable file) |
| `4` | Authentication failure |
| `5` | Microsoft Graph request failure |

## Authentication

Credential selection is evaluated in this order. The first match wins.

| Order | Method | Used when | Inputs |
|---|---|---|---|
| 1 | Workload identity | Running on Kubernetes with the Azure workload identity webhook | `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_FEDERATED_TOKEN_FILE` (injected), `AZURE_AUTHORITY_HOST` (injected) |
| 2 | Client certificate | Local Podman, CI | `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_CERTIFICATE_PATH` |
| 3 | Static access token | Deprecated, explicit opt-in only | `IATO_ALLOW_STATIC_TOKEN=1` and `MS_GRAPH_TOKEN_FILE` |

All methods use the OAuth 2.0 client credentials flow (or its federated equivalent) against the Microsoft Entra token endpoint and request the scope `https://graph.microsoft.com/.default`.

Token handling:

- Client credentials flows issue access tokens only. There are no refresh tokens.
- Azure. Identity caches access tokens in process memory and requests a new one on expiry.
- Token cache persistence is deliberately not configured, so no token is written to disk.
- The static token fallback prints a deprecation warning to stderr on every run, and reads the token from a file rather than an environment variable or argument.

## Microsoft Entra app registration

One-off setup with the Azure CLI.

1. Generate a certificate. The private key stays on your machine or in your secret store.

   ```bash
   openssl req -x509 -newkey rsa:3072 -nodes -days 180 \
     -keyout iato.key -out iato.crt -subj "/CN=iato-collector"
   cat iato.key iato.crt > iato.pem
   chmod 600 iato.pem
   ```

2. Create the app registration and service principal, uploading the **public** certificate only.

   ```bash
   az ad app create --display-name iato-collector --sign-in-audience AzureADMyOrg
   az ad app credential reset --id <appId> --cert @iato.crt --append
   az ad sp create --id <appId>
   ```

3. Add the four application permissions in [Graph permissions](#graph-permissions) and grant admin consent.

4. For Kubernetes, add a federated credential to the app registration instead of using a certificate:
   - Issuer: the cluster's OIDC issuer URL
   - Subject: `system:serviceaccount:<namespace>:<serviceaccount>`
   - Audience: `api://AzureADTokenExchange`

Rotate certificates on a short schedule (180 days or less) and remove expired credentials from the app registration.

## Graph permissions

Application permissions, admin-consented. Nothing else should be granted.

| Permission | Endpoint | Purpose |
|---|---|---|
| `User.Read.All` | `/v1.0/users` | Read-only basic user metadata |
| `Policy.Read.ConditionalAccess` | `/v1.0/identity/conditionalAccess/policies` | Conditional Access policy tracking |
| `RoleManagement.Read.Directory` | `/v1.0/roleManagement/directory/roleAssignments` | Directory role assignments |
| `GroupMember.Read.All` | `/v1.0/groups` | Group definitions and membership |

Notes:

- The `.default` scope returns the permissions consented on the app registration. Least privilege is therefore enforced at the registration, not in code. Audit consented permissions periodically.
- `Policy.Read.ConditionalAccess` is used instead of the broader `Policy.Read.All` because only Conditional Access policies are collected.
- MFA registration status requires `UserAuthenticationMethod.Read.All`, which is intentionally not requested. The output contains no MFA field.
- Every collection request uses `$select` to retrieve only the fields listed in the output schema, and follows `@odata.nextLink` paging via `PageIterator`.

## SailPoint IIQ XML handling

- The file is opened read-only and its size is checked **before** parsing. Files above `--max-xml-bytes` are rejected.
- Parsing uses `XmlReader` with `DtdProcessing.Prohibit`, `XmlResolver = null`, and `MaxCharactersInDocument` set. DOCTYPE declarations and entity definitions cause rejection (exit code `3`).
- Only these object types are extracted: `Rule`, `TaskDefinition`, `EmailTemplate`. All other elements are ignored.
- **Embedded BeanShell is never loaded, evaluated, or run.** Script bodies are treated as opaque strings. For each, iato records the SHA-256 hash and length, and marks the object `review_required`. The script text itself is not copied into the output.
- The original XML file's SHA-256 is recorded in the output for traceability.

## Output schema

Version `1.0`.

```json
{
  "schema_version": "1.0",
  "generated_at": "2026-11-10T00:00:00Z",
  "sources": {
    "sailpoint_iiq": {
      "source": "sailpoint_iiq_xml",
      "file_sha256": "<hex>",
      "objects": [
        {
          "object_type": "Rule",
          "name": "SoDValidation",
          "description": "Segregation of duties check",
          "script": {
            "sha256": "<hex>",
            "length_chars": 1842,
            "review_required": true
          }
        }
      ]
    },
    "entra": {
      "tenant_id": "<guid>",
      "collected_via": "graph_live",
      "users": [
        { "id": "<guid>", "userPrincipalName": "user@example.com", "accountEnabled": true }
      ],
      "conditional_access_policies": [
        { "id": "<guid>", "displayName": "Require MFA for admins", "state": "enabled" }
      ],
      "role_assignments": [
        { "id": "<id>", "roleDefinitionId": "<guid>", "principalId": "<guid>", "directoryScopeId": "/" }
      ],
      "groups": [
        { "id": "<guid>", "displayName": "Finance", "member_ids": ["<guid>"] }
      ]
    }
  }
}
```

Field notes:

- `collected_via` is `graph_live` or `snapshot`.
- `script` appears only on objects that contain script content.
- `member_ids` appears only when `--include-group-members` is used.
- Fields are additive within a schema version. Breaking changes increment `schema_version`.

## Running with Podman

### Container image

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY global.json iato.csproj ./
RUN dotnet restore
COPY src/ src/
RUN dotnet publish -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/runtime:8.0
RUN useradd --uid 10001 --no-create-home iato
COPY --from=build /out /app
USER 10001
ENTRYPOINT ["dotnet", "/app/iato.dll"]
```

Build:

```bash
podman build -t iato:local -f Containerfile .
```

### Offline run (XML plus Entra snapshot)

No network access is needed.

```bash
podman run --rm --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --network=none \
  --volume "$PWD/input:/input:ro,Z" \
  iato:local \
  --sailpoint-xml /input/iiq-export.xml \
  --entra-json /input/entra-snapshot.json \
  > output/result.json
```

### Live run (certificate authentication)

Live collection needs network access, so `--network=none` is not used.

```bash
podman secret create iato-cert ./iato.pem

podman run --rm --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --secret iato-cert,target=/run/secrets/iato-cert.pem \
  --env AZURE_TENANT_ID --env AZURE_CLIENT_ID \
  --env AZURE_CLIENT_CERTIFICATE_PATH=/run/secrets/iato-cert.pem \
  --volume "$PWD/input:/input:ro,Z" \
  iato:local \
  --sailpoint-xml /input/iiq-export.xml \
  --live-entra \
  > output/result.json
```

The bare `--env NAME` form passes the host value without placing it on the command line.

The wrapper scripts `scripts/run.sh` and `scripts/run.ps1` perform these steps with a `offline` or `live` mode argument.

## Running on Kubernetes

Authentication uses workload identity. No Kubernetes Secret is needed for Graph access.

`k8s/serviceaccount.yaml`

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: iato
  annotations:
    azure.workload.identity/client-id: "<appId>"
```

`k8s/configmap-iiq.yaml` holds the XML export. It must contain non-sensitive configuration only.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sailpoint-iiq
data:
  iiq-export.xml: |
    <?xml version="1.0" encoding="UTF-8"?>
    <sailpoint>
      <Rule name="SoDValidation"/>
    </sailpoint>
```

`k8s/job.yaml`

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: iato-run
spec:
  backoffLimit: 0
  template:
    metadata:
      labels:
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: iato
      restartPolicy: Never
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
      containers:
        - name: iato
          image: <registry>/iato:<tag>
          args:
            - --sailpoint-xml
            - /input/iiq-export.xml
            - --live-entra
          securityContext:
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
          volumeMounts:
            - name: iiq
              mountPath: /input
              readOnly: true
      volumes:
        - name: iiq
          configMap:
            name: sailpoint-iiq
```

The workload identity webhook injects `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_AUTHORITY_HOST`, and `AZURE_FEDERATED_TOKEN_FILE`. The JSON result is written to the pod's stdout. Treat pod logs as sensitive, because the output contains directory metadata, and restrict access to them accordingly.

## Security policy

- SailPoint IIQ XML is accepted as read-only input only.
- BeanShell is treated as untrusted configuration and is never executed.
- The XML parser rejects DOCTYPE declarations and external entities.
- Connector credentials, tokens, and certificates are never stored in ConfigMaps, the repository, command-line arguments, or XML input.
- Containers run as a non-root user with a read-only root filesystem, all capabilities dropped, and privilege escalation disabled.
- Certificates and private keys are provided through Podman secrets locally or an external secret store in CI. Workload identity removes stored credentials on Kubernetes.
- Do not test with a real IIQ export containing customer data until the parser rejection tests pass.

## Repository hygiene

`.gitignore` must include:

```
output/*
input/*
*.pem
*.key
*.pfx
ms-graph-token.txt
bin/
obj/
```

Do not commit zero-byte placeholder files, as some API-based commit tools reject them. If the `output/` directory must be tracked, commit `output/README.md` containing one line of text and un-ignore it with `!output/README.md`.

*If a secret is ever committed, rotate it immediately and remove it from history. Deleting it in a later commit is not sufficient.*

---

## Roadmap

This project is intentionally being delivered in stages. The Microsoft Graph collection path is currently in progress, but the full end-to-end flow is not yet complete.

Planned implementation order:

1. Hardened IIQ XML parsing and validation
   - reject DOCTYPE and external entities
   - enforce size limits before parsing
   - extract only `Rule`, `TaskDefinition`, and `EmailTemplate`
   - treat BeanShell as opaque data and record hash + length only

2. Complete CLI integration
   - `--sailpoint-xml`
   - `--entra-json`
   - `--live-entra`
   - stdout JSON output under `schema_version: "1.0"` and `sources`
   - exit codes for invalid input and auth failures

3. Secure Graph auth baseline
   - workload identity on Kubernetes
   - certificate-based app registration for local/CI use
   - no static bearer token in the default path
   - no token persistence on disk

4. Output schema hardening
   - record file hashes for traceability
   - keep sources separate
   - document additive schema versioning rules

5. Final validation
   - unit tests for malformed XML and reject conditions
   - integration tests for live Graph collection
   - Podman and Kubernetes validation steps

## To do

- Finish the .NET collector parity with the documented CLI contract
- Add the hardened IIQ XML parser in the repository’s final layout
- Implement `ResultWriter` and CLI argument wiring
- Add xUnit coverage for:
  - DOCTYPE rejection
  - external entity rejection
  - oversize file rejection
  - valid offline JSON output
- Add Podman wrapper scripts and container validation
- Add Kubernetes manifests for workload identity and config mounts
- Confirm exact Graph permission set for the tenant and collector endpoints
- Document and test the offline/live split clearly
- Validate with sanitized sample data before any real customer export is processed
