# Multi-source local CLI with Podman

This workflow combines read-only SailPoint IdentityIQ XML exports with a saved Entra snapshot or an in-memory Graph token acquired by the CLI itself. It does not connect to SailPoint or execute SailPoint BeanShell.

## Token acquisition and credential handling

A static Graph bearer token is a weak fit for production because Microsoft Graph access tokens typically expire in approximately one hour. Prefer short-lived app credentials instead:

- Local Podman: use an app registration with a certificate; mount the certificate/key from a Podman secret, and let the CLI fetch a token via Microsoft Entra OAuth as needed.
- Kubernetes: prefer Azure AD workload identity (federated token from the service account). In that model there is no stored client secret at all.
- Use a Secret only as a last resort when workload identity or certificate-based local auth is not available.

The CLI should acquire a token just-in-time for Graph, and refresh it before expiry. Keep the token in memory only; do not write it to disk or echo it to stdout.

Scope the app registration to read-only Graph permissions only. Minimum examples include:

- `User.Read.All`
- `Policy.Read.All`
- `RoleManagement.Read.Directory`
- `Directory.Read.All`
- `GroupMember.Read.All`

With the current collector pattern, keep the app registration narrow and only request the permissions required by the specific endpoints used by the workflow.

## Local app-registration example

```bash
# Example: a mounted certificate secret for local Podman use.
podman secret create graph-cert ./graph-cert.pem

# The app reads these env vars at runtime.
export AZURE_TENANT_ID="<tenant-id>"
export AZURE_CLIENT_ID="<app-registration-id>"
export AZURE_CLIENT_CERTIFICATE_PATH="/run/secrets/graph-cert"

podman run --rm \
  --read-only \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  --secret graph-cert \
  --env AZURE_TENANT_ID \
  --env AZURE_CLIENT_ID \
  --env AZURE_CLIENT_CERTIFICATE_PATH=/run/secrets/graph-cert \
  --volume "$PWD/input:/input:ro,Z" \
  iato:local \
  --sailpoint-xml /input/iiq-export.xml \
  --live-entra
```

Do not pass a raw bearer token on the command line or as an environment value. The CLI should prefer an app-registration certificate over a client secret, and should never accept static `MS_GRAPH_TOKEN` as the primary path.

## Kubernetes pattern

Use workload identity for Microsoft Entra access whenever possible.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: iato-graph
  annotations:
    azure.workload.identity/client-id: "<app-registration-id>"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: iato-config
data:
  sailpoint.xml: |
    <sailpoint>...</sailpoint>
```

When workload identity is unavailable, a Secret may hold the certificate or private key, but it must be mounted in read-only mode and access should still be limited to the specific application.

## BeanShell safety

The XML parser must continue to reject `DOCTYPE` and entity declarations and cap the XML size before parsing. BeanShell is never evaluated and never executed.

## Offline mode

For the offline path, keep the container isolated from the network with `--network=none` and mount only sanitized XML and the previously generated Entra snapshot.

## Local test

```sh
python -m unittest discover -s test/unit
```
