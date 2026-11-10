# Read-only Microsoft Graph collector (.NET 8)

This component uses the Microsoft Graph SDK and Azure.Identity to obtain short-lived access tokens from either certificate-based app registration (local Podman) or Kubernetes workload identity. Access tokens are held in memory by Azure.Identity; no persistent token cache is configured. It does not accept a bearer token in argv or environment variables.

Build from this directory:

```sh
dotnet restore iato.csproj
dotnet build iato.csproj --no-restore
dotnet run --project iato.csproj -- --live-entra
```

The collector uses `PageIterator` for each paged endpoint and writes normalized JSON to stdout under `schema_version: "1.0"` and `sources.entra`. It emits selected user fields, Conditional Access policy summaries, directory role assignments, and group summaries. MFA method data is intentionally omitted pending explicit approval for `UserAuthenticationMethod.Read.All`.

Credentials:

- Podman/CI: mount the app-registration certificate as a read-only secret and set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_CERTIFICATE_PATH`.
- Kubernetes: configure workload identity, annotate the ServiceAccount with the app client ID, enable the workload identity pod label, and configure the app's federated credential. The SDK reads `AZURE_FEDERATED_TOKEN_FILE` injected by the workload identity webhook.
- Do not use a static token. The code has no static-token fallback.

Grant only read-only Microsoft Graph application permissions required by the endpoints and consent them in the app registration. `.default` requests the permissions already granted to the app; least privilege is configured on the app registration, not enforced by the scope string. The endpoints used here require appropriate read permissions for users, Conditional Access policies, directory role assignments, and groups/members. Confirm exact permissions against your tenant and current Graph endpoint documentation before granting consent.

The image is a minimal .NET runtime image and runs as UID/GID 10001. Live Graph collection requires network connectivity; do not use `--network=none` for it.
