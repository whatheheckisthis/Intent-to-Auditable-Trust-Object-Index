using Azure.Core;
using Azure.Identity;
using Microsoft.Graph;

namespace Iato.Graph;

public static class GraphClientFactory
{
    private static readonly string[] Scopes = ["https://graph.microsoft.com/.default"];

    public static GraphServiceClient Create()
    {
        var tenantId = Env("AZURE_TENANT_ID");
        var clientId = Env("AZURE_CLIENT_ID");
        var certificatePath = Env("AZURE_CLIENT_CERTIFICATE_PATH");
        var federatedTokenPath = Env("AZURE_FEDERATED_TOKEN_FILE");

        TokenCredential credential;
        if (federatedTokenPath is not null && tenantId is not null && clientId is not null)
        {
            credential = new WorkloadIdentityCredential(new WorkloadIdentityCredentialOptions
            {
                TenantId = tenantId,
                ClientId = clientId,
                TokenFilePath = federatedTokenPath
            });
        }
        else if (tenantId is not null && clientId is not null && certificatePath is not null)
        {
            if (!File.Exists(certificatePath))
            {
                throw new FileNotFoundException("Configured app-registration certificate file was not found.");
            }

            credential = new ClientCertificateCredential(tenantId, clientId, certificatePath);
        }
        else
        {
            throw new InvalidOperationException(
                "Configure workload identity (AZURE_TENANT_ID, AZURE_CLIENT_ID, " +
                "AZURE_FEDERATED_TOKEN_FILE) or certificate credentials " +
                "(AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_CERTIFICATE_PATH).");
        }

        // Azure.Identity holds tokens in memory and requests a new access token
        // when needed. No persistent token cache is configured.
        return new GraphServiceClient(credential, Scopes);
    }

    private static string? Env(string name)
    {
        var value = Environment.GetEnvironmentVariable(name);
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }
}
