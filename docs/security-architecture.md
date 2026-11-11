# Security architecture: credentials, XML, and containers

This document records the intended security controls for IATO and distinguishes controls already visible in the repository from controls that remain to be implemented or validated. It is guidance, not a claim that every end-to-end workflow is production-ready.

## Microsoft Entra certificate authentication

For local Podman or CI use, prefer an app registration authenticated with an X.509 certificate over a long-lived client secret or a copied bearer token. The application obtains short-lived Microsoft Graph access tokens using the OAuth 2.0 client-credentials flow and the `https://graph.microsoft.com/.default` scope. Azure.Identity keeps its access-token cache in process memory; do not configure persistent token-cache storage.

Generate a short-lived RSA certificate and private key for development as follows:

```sh
openssl req -x509 -newkey rsa:3072 -nodes -days 180 \
  -keyout iato.key -out iato.crt -subj "/CN=iato-collector"
cat iato.key iato.crt > iato.pem
chmod 600 iato.key iato.pem
```

`iato.crt` is the public certificate to upload to the Entra app registration. `iato.key` is private key material. `iato.pem` contains the private key and certificate together, so protect it as a secret. The `-nodes` option creates an unencrypted private key for unattended use; it increases the impact of file disclosure. Use a protected secret store, restrict access, mount read-only, rotate the certificate on a short schedule, and remove expired credentials. Never commit `iato.key`, `iato.pem`, `.pfx` files, or credentials.

For production, issue and protect certificates according to organizational PKI and key-management standards rather than relying on a locally generated self-signed development certificate. Upload only the public certificate; the private key must remain with the workload.

The .NET Graph collector prototype under `dotnet/` supports certificate-based app registration and Kubernetes workload identity. Its token acquisition uses Azure.Identity. The separate Python collector currently accepts a static `MS_GRAPH_TOKEN`; that legacy path is not the recommended production design and is identified as a limitation in the root README.

In Kubernetes, prefer workload identity: a federated service-account identity lets the workload obtain tokens without storing a certificate or client secret in a Kubernetes Secret. For local Podman, use a Podman secret to mount the private certificate material, not a command-line token or image build argument.

Grant only the read-only Microsoft Graph application permissions required by the actual endpoints, and review the admin-consented app permissions. `.default` does not enforce least privilege in code; the app registration's granted permissions do.

## XML parser boundary

IIQ XML and embedded BeanShell are untrusted input. The parser must never execute, compile, or evaluate BeanShell. It should extract only explicitly supported metadata and, where required, record a script hash and length without copying script text to output.

For a .NET `XmlReader` implementation, configure secure parsing explicitly:

```csharp
var settings = new XmlReaderSettings
{
    DtdProcessing = DtdProcessing.Prohibit,
    XmlResolver = null,
    MaxCharactersInDocument = maxCharacters,
    IgnoreComments = true
};
```

Check the input file size before parsing, keep `XmlResolver = null` to prevent external resource resolution, reject DTD/entity declarations, and handle malformed XML without echoing source contents into logs. The Python IIQ parser uses `defusedxml` and a size cap; `XmlResolver = null` applies to the planned .NET parser, not the Python implementation.

## Container hardening

The .NET `dotnet/Containerfile` prototype runs as UID/GID `10001:10001`. The root Python `Containerfile` also specifies UID/GID `10001:10001`. Keep the runtime user non-root, and run containers with a read-only root filesystem, all Linux capabilities dropped, and privilege escalation disabled where the runtime supports those options.

Example offline invocation:

```sh
podman run --rm \
  --read-only \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  --network=none \
  --volume "$PWD/input:/input:ro,Z" \
  iato:local \
  --sailpoint-xml /input/iiq-export.xml \
  --entra-json /input/entra-snapshot.json \
  > output/result.json
```

`--network=none` is appropriate for the offline XML-plus-snapshot mode only. Live Microsoft Graph collection requires network connectivity and must not use that flag. Redirecting stdout writes the result on the host; the container itself can keep a read-only root filesystem. Omit the SELinux `,Z` suffix on systems where SELinux labeling does not apply.

Podman is daemonless and can run rootless; prefer rootless Podman for local development. Daemonless does not by itself make a container safe: retain the non-root UID, read-only mounts/filesystem, dropped capabilities, no-new-privileges setting, and network isolation for offline processing. Remote Podman connections may have a service on the other end, so do not assume every Podman deployment is local or daemonless.

## Current implementation versus target

- **Present in repository:** root and .NET container definitions specify UID/GID 10001; the .NET Graph prototype uses Azure.Identity certificate/workload-identity credentials; the Python XML parser rejects DTD/entity declarations and applies a size cap.
- **Documented target / validate before relying on it:** .NET `XmlReader` hardening with `XmlResolver = null`; production PKI-issued certificate lifecycle; rootless Podman runs with all requested hardening flags; integrated offline/live CLI behavior; Kubernetes workload-identity deployment manifests.
- **Not a production assertion:** this guide does not state that the complete parser, CLI, authentication, and deployment path has been integrated or tested end to end.

## Repository hygiene

Add these patterns to the repository ignore rules before generating credentials or local artifacts:

```gitignore
*.key
*.pem
*.pfx
ms-graph-token.txt
input/*
output/*
```

Do not put private material in ConfigMaps, XML exports, container images, shell arguments, or source control. If a credential is committed, revoke/rotate it immediately; deleting it in a later commit does not remove it from Git history.
