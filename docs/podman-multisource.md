# Multi-source local CLI with Podman

This workflow combines read-only SailPoint IdentityIQ XML exports with a saved Entra snapshot, or collects Entra live through Microsoft Graph. It does not connect to SailPoint or execute SailPoint BeanShell.

## BeanShell safety

IIQ `<Rule>` objects can contain BeanShell source. The normalizer treats XML and embedded source as untrusted input: it never evaluates, compiles, or invokes BeanShell. It emits only metadata and a SHA-256 digest/byte length for each embedded source block; source text is not copied into normalized output. Review and handle the original export as sensitive configuration because it may contain internal logic or data.

The parser currently rejects `DOCTYPE` and entity declarations and caps XML documents at 10 MiB. If an IIQ export contains a DOCTYPE, use an approved export without it or strip only the declaration in a controlled preprocessing step; do not enable external entity resolution.

## Build the image

From the repository root:

```sh
podman build -t iato:local -f Containerfile .
```

The image is minimal, has no credentials baked in, and runs as an unprivileged user. The CLI writes normalized JSON to stdout; redirect it to a host file if needed.

## SailPoint XML plus a saved Entra snapshot

```sh
mkdir -p input output
chmod a+r input/iiq-export.xml input/entra-snapshot.json
podman run --rm --read-only \
  --volume "$PWD/input:/input:ro,Z" \
  --userns=keep-id \
  iato:local \
  --sailpoint-xml /input/iiq-export.xml \
  --entra-json /input/entra-snapshot.json \
  > output/combined.json
```

On systems where SELinux labeling is not applicable, omit `,Z`. `:ro` ensures the container cannot alter source exports. The result keeps each source under `sources`; SailPoint governance metadata is not falsely merged with Entra user accounts.

## Live Entra plus SailPoint XML

Store the Graph token in a Podman secret, not in the command line, shell history, image, or XML file. Set the token file path inside the container:

```sh
podman secret create ms-graph-token ./ms-graph-token.txt
podman run --rm --read-only \
  --secret ms-graph-token \
  --volume "$PWD/input:/input:ro,Z" \
  --userns=keep-id \
  --env MS_GRAPH_TOKEN_FILE=/run/secrets/ms-graph-token \
  --env AZURE_TENANT_ID="$AZURE_TENANT_ID" \
  iato:local \
  --sailpoint-xml /input/iiq-export.xml \
  --live-entra \
  > output/combined.json
```

The Graph token needs only the Microsoft Graph application permissions required by the requested read-only endpoints, with admin consent where required. Restrict its lifetime and rotate it. The collector uses bounded concurrency, honors `Retry-After`, retries transient failures, and aborts rather than emitting a partial snapshot.

The collector accepts `MS_GRAPH_TOKEN_FILE` (recommended for container use) or the legacy `MS_GRAPH_TOKEN` environment variable. Do not pass real credentials through `--env MS_GRAPH_TOKEN=...`.

## Podman secrets, ConfigMaps, and Kubernetes

Podman is the local container runtime here; Kubernetes ConfigMaps are not required. Keep non-secret XML exports on a read-only bind mount. Use Podman secrets for source credentials. If this CLI is later deployed in Kubernetes, ConfigMaps are suitable only for non-sensitive configuration, and Kubernetes Secrets (ideally backed by an external secret manager and encryption at rest) should hold credentials. Never put tokens or credentials in a ConfigMap or in the SailPoint XML export.

## Local test

```sh
python -m unittest discover -s test/unit
```
