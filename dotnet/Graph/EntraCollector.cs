using Iato.Graph;
using Microsoft.Graph;
using Microsoft.Graph.Models;
using Microsoft.Graph.Models.ODataErrors;
using Microsoft.Graph.Models;
using System.Text.Json;

namespace Iato.Graph;

public sealed class EntraCollector
{
    private readonly GraphServiceClient _graph;

    public EntraCollector(GraphServiceClient graph)
    {
        _graph = graph;
    }

    public async Task<EntraSnapshot> CollectAsync(CancellationToken cancellationToken = default)
    {
        var usersPage = await _graph.Users.GetAsync(request =>
        {
            request.QueryParameters.Select = ["id", "userPrincipalName", "accountEnabled"];
        }, cancellationToken: cancellationToken);
        var users = new List<User>();
        if (usersPage is not null)
        {
            var iterator = PageIterator<User, UserCollectionResponse>.CreatePageIterator(
                _graph,
                usersPage,
                user =>
                {
                    users.Add(user);
                    return true;
                });
            await iterator.IterateAsync(cancellationToken);
        }

        var policiesPage = await _graph.Identity?.ConditionalAccess?.Policies?.GetAsync(request =>
        {
            request.QueryParameters.Select = ["id", "displayName", "state"];
        }, cancellationToken: cancellationToken);
        var policies = new List<ConditionalAccessPolicy>();
        if (policiesPage is not null)
        {
            var iterator = PageIterator<ConditionalAccessPolicy, ConditionalAccessPolicyCollectionResponse>.CreatePageIterator(
                _graph,
                policiesPage,
                policy =>
                {
                    policies.Add(policy);
                    return true;
                });
            await iterator.IterateAsync(cancellationToken);
        }

        var assignmentsPage = await _graph.RoleManagement?.Directory?.RoleAssignments?.GetAsync(request =>
        {
            request.QueryParameters.Select = ["id", "principalId", "roleDefinitionId", "directoryScopeId", "appScopeId"];
        }, cancellationToken: cancellationToken);
        var assignments = new List<UnifiedRoleAssignment>();
        if (assignmentsPage is not null)
        {
            var iterator = PageIterator<UnifiedRoleAssignment, UnifiedRoleAssignmentCollectionResponse>.CreatePageIterator(
                _graph,
                assignmentsPage,
                assignment =>
                {
                    assignments.Add(assignment);
                    return true;
                });
            await iterator.IterateAsync(cancellationToken);
        }

        var groupsPage = await _graph.Groups.GetAsync(request =>
        {
            request.QueryParameters.Select = ["id", "displayName"];
        }, cancellationToken: cancellationToken);
        var groups = new List<Group>();
        if (groupsPage is not null)
        {
            var iterator = PageIterator<Group, GroupCollectionResponse>.CreatePageIterator(
                _graph,
                groupsPage,
                group =>
                {
                    groups.Add(group);
                    return true;
                });
            await iterator.IterateAsync(cancellationToken);
        }

        return new EntraSnapshot(
            DateTimeOffset.UtcNow,
            Environment.GetEnvironmentVariable("AZURE_TENANT_ID"),
            users.Select(user => new EntraUser(user.Id, user.UserPrincipalName, user.AccountEnabled)).ToArray(),
            policies.Select(policy => new ConditionalAccessPolicySummary(policy.Id, policy.DisplayName, policy.State?.ToString())).ToArray(),
            assignments.Select(assignment => new RoleAssignmentSummary(
                assignment.Id,
                assignment.PrincipalId,
                assignment.RoleDefinitionId,
                assignment.DirectoryScopeId,
                assignment.AppScopeId)).ToArray(),
            groups.Select(group => new EntraGroup(group.Id, group.DisplayName)).ToArray());
    }

    public static async Task WriteJsonAsync(EntraSnapshot snapshot, TextWriter output, CancellationToken cancellationToken = default)
    {
        var document = new
        {
            schema_version = "1.0",
            sources = new
            {
                entra = new
                {
                    collected_at = snapshot.CollectedAt,
                    tenant_id = snapshot.TenantId,
                    users = snapshot.Users,
                    conditional_access_policies = snapshot.ConditionalAccessPolicies,
                    role_assignments = snapshot.RoleAssignments,
                    groups = snapshot.Groups
                }
            }
        };

        await JsonSerializer.SerializeAsync(
            output.BaseStream,
            document,
            new JsonSerializerOptions { WriteIndented = true },
            cancellationToken);
        await output.WriteLineAsync();
    }
}

public sealed record EntraSnapshot(
    DateTimeOffset CollectedAt,
    string? TenantId,
    IReadOnlyList<EntraUser> Users,
    IReadOnlyList<ConditionalAccessPolicySummary> ConditionalAccessPolicies,
    IReadOnlyList<RoleAssignmentSummary> RoleAssignments,
    IReadOnlyList<EntraGroup> Groups);

public sealed record EntraUser(string? Id, string? UserPrincipalName, bool? AccountEnabled);
public sealed record ConditionalAccessPolicySummary(string? Id, string? DisplayName, string? State);
public sealed record RoleAssignmentSummary(string? Id, string? PrincipalId, string? RoleDefinitionId, string? DirectoryScopeId, string? AppScopeId);
public sealed record EntraGroup(string? Id, string? DisplayName);
