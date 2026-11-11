# Security controls: certificates, Graph permissions, and XXE prevention

This note documents the intended security architecture. It does not claim that all controls are implemented or validated end to end; see the root README roadmap and the existing [security architecture](security-architecture.md).

## Entra X.509 client certificate

For local Podman or CI app-registration authentication, use a short-lived X.509 certificate rather than a static bearer token or client secret. The public certificate is uploaded to the Entra app registration; the private key stays in the workload's secret store and is never committed or placed in an image.

Development certificate example:

```sh
openssl req -x509 -newkey rsa:3072 -nodes -days 180 \
  -keyout iato.key -out iato.crt -subj "/CN=iato-collector"
cat iato.key iato.crt > iato.pem
chmod 600 iato.key iato.pem
```

- `iato.crt`: public certificate to register with Entra.
- `iato.key`: private key; protect as a credential.
- `iato.pem`: combined private key and certificate; protect as a credential and mount read-only from Podman Secret or an approved secret store.

The `-nodes` option creates an unencrypted private key for unattended use, making file permissions and secret-store protection essential. This self-signed command is for development; production certificates should follow organizational PKI and key-management, rotation, and revocation standards. In Kubernetes, prefer workload identity so no certificate or client secret needs to be stored in the cluster.

The .NET prototype uses Azure.Identity to obtain short-lived access tokens with the Graph `/.default` scope. Client-credentials flow has no refresh token; the SDK caches access tokens in memory and requests a new one when needed. Do not configure persistent token-cache storage. Least privilege is governed by the application's admin-consented permissions, not by `/.default` itself.

## Read-only Microsoft Graph application permissions

Grant only the read-only application permissions required by the endpoints enabled for the collector, with admin consent where required. The intended endpoint mapping is:

| Application permission | Collector use |
|---|---|
| `User.Read.All` | Read basic user metadata from `/users` |
| `Policy.Read.ConditionalAccess` | Read Conditional Access policy configuration from `/identity/conditionalAccess/policies` |
| `RoleManagement.Read.Directory` | Read directory role assignment data from `/roleManagement/directory/roleAssignments` and related read endpoints used by the collector |
| `GroupMember.Read.All` | Read group definitions and, when implemented/enabled, group membership data |

Review Microsoft Graph's current permission requirements for each exact endpoint and tenant configuration before granting consent. Do not add `Policy.Read.All` when only Conditional Access policies are needed. MFA authentication-method registration is deliberately excluded; collecting it requires the additional `UserAuthenticationMethod.Read.All` permission and explicit approval. If group membership collection is not enabled, omit `GroupMember.Read.All` until it is needed.

## XML external entity (XXE) prevention

IIQ XML is untrusted input. The .NET parser must prohibit DTD processing and disable the resolver:

```csharp
var settings = new XmlReaderSettings
{
    DtdProcessing = DtdProcessing.Prohibit,
    XmlResolver = null,
    MaxCharactersInDocument = maxCharacters,
    IgnoreComments = true
};
```

`DtdProcessing.Prohibit` actively rejects documents containing a `DOCTYPE`, including internal entity declarations. `XmlResolver = null` prevents external resource resolution. Together, these settings prevent XXE-style file disclosure and server-side request forgery through XML entities. Also check the file size before parsing, use a bounded reader, fail closed on malformed/unsafe input, and avoid logging XML contents or parser messages that could disclose customer data.

Embedded BeanShell inside `<Rule>` is opaque source data only. Never compile, evaluate, or execute it; if audit metadata is needed, record only its hash, length, and a review-required marker.

## Container runtime controls

Run containers as non-root UID `10001`, use a read-only root filesystem and read-only input mounts, drop all Linux capabilities, and disallow privilege escalation. For offline XML plus a saved Entra JSON snapshot, use rootless/daemonless Podman with network isolation:

```sh
podman run --rm --read-only --cap-drop=ALL \
  --security-opt=no-new-privileges --network=none \
  --volume "$PWD/input:/input:ro,Z" \
  iato:local \
  --sailpoint-xml /input/iiq-export.xml \
  --entra-json /input/entra-snapshot.json \
  > output/result.json
```

Live Graph collection requires network connectivity, so omit `--network=none` for live mode. Rootless and daemonless Podman reduce host privilege exposure but do not replace the other container controls. The repository's root and .NET Containerfiles specify UID/GID `10001:10001`; verify runtime flags in the target Podman environment.

## Status

These controls describe the design and expected configuration. The .NET `XmlReader` parser and a complete integrated container/CLI workflow remain roadmap work. Test parser rejection behavior using sanitized fixtures before processing customer data.
