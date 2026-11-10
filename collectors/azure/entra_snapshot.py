#!/usr/bin/env python3
"""Collect a read-only Microsoft Entra snapshot as JSON on stdout.

Requires an application token in MS_GRAPH_TOKEN with the documented, read-only
Microsoft Graph permissions. Collection fails closed: an incomplete API response
is never emitted as a successful snapshot.
"""

import json
import os
import random
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

GRAPH_ROOT = "https://graph.microsoft.com/v1.0"
GRAPH_HOST = "graph.microsoft.com"
PASSWORD_METHOD_TYPE = "#microsoft.graph.passwordAuthenticationMethod"
MAX_RETRIES = 5
MAX_RETRY_DELAY_SECONDS = 60
MAX_AUTH_WORKERS = 8


def _validate_graph_url(url):
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != GRAPH_HOST or not parsed.path.startswith("/v1.0/"):
        raise ValueError("Refusing to send the Graph bearer token to an untrusted URL")


def _retry_delay(attempt, retry_after=None):
    if retry_after:
        try:
            return min(MAX_RETRY_DELAY_SECONDS, max(0.0, float(retry_after)))
        except ValueError:
            try:
                seconds = (parsedate_to_datetime(retry_after) - datetime.now(timezone.utc)).total_seconds()
                return min(MAX_RETRY_DELAY_SECONDS, max(0.0, seconds))
            except (TypeError, ValueError, OverflowError):
                pass
    return min(MAX_RETRY_DELAY_SECONDS, (2**attempt) + random.uniform(0, 1))


def _request_json(url, token):
    _validate_graph_url(url)
    request = Request(url, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
    for attempt in range(MAX_RETRIES + 1):
        try:
            with urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            retryable = error.code == 429 or 500 <= error.code < 600
            if not retryable or attempt == MAX_RETRIES:
                raise
            time.sleep(_retry_delay(attempt, error.headers.get("Retry-After")))
        except URLError:
            if attempt == MAX_RETRIES:
                raise
            time.sleep(_retry_delay(attempt))
    raise RuntimeError("Graph request retry loop exited unexpectedly")


def _paged(url, token):
    while url:
        _validate_graph_url(url)
        data = _request_json(url, token)
        yield from data.get("value", [])
        url = data.get("@odata.nextLink")


def _has_mfa_method(user_id, token):
    encoded_user = quote(user_id, safe="")
    url = f"{GRAPH_ROOT}/users/{encoded_user}/authentication/methods"
    methods = _request_json(url, token).get("value", [])
    return any(method.get("@odata.type") != PASSWORD_METHOD_TYPE for method in methods)


def _is_standing_assignment(assignment):
    # Activated PIM assignments are active, but are not standing assignments.
    return assignment.get("assignmentType") == "Assigned"


def _role_definition_ids(token):
    url = f"{GRAPH_ROOT}/roleManagement/directory/roleDefinitions?$filter=isPrivileged%20eq%20true&$select=id,isPrivileged"
    return {
        role["id"]
        for role in _paged(url, token)
        if role.get("id") and role.get("isPrivileged") is True
    }


def _access_state(token):
    """Return active/standing/eligible access keyed by principal object ID."""
    role_ids = _role_definition_ids(token)
    state = {}
    groups = set()

    def mark(principal_id, kind):
        if not principal_id:
            return
        access = state.setdefault(principal_id, {"active": False, "standing": False, "eligible": False})
        access[kind] = True

    assignments_url = (
        f"{GRAPH_ROOT}/roleManagement/directory/roleAssignmentScheduleInstances"
        "?$select=principalId,roleDefinitionId,assignmentType"
    )
    for assignment in _paged(assignments_url, token):
        if assignment.get("roleDefinitionId") not in role_ids:
            continue
        principal_id = assignment.get("principalId")
        if not principal_id:
            continue
        mark(principal_id, "active")
        if _is_standing_assignment(assignment):
            mark(principal_id, "standing")
        if assignment.get("principalType", "").lower() == "group":
            groups.add(principal_id)

    eligible_url = (
        f"{GRAPH_ROOT}/roleManagement/directory/roleEligibilityScheduleInstances"
        "?$select=principalId,roleDefinitionId"
    )
    for eligibility in _paged(eligible_url, token):
        if eligibility.get("roleDefinitionId") in role_ids:
            mark(eligibility.get("principalId"), "eligible")
            if eligibility.get("principalType", "").lower() == "group":
                groups.add(eligibility["principalId"])

    return state, groups


def _group_members(group_ids, token):
    """Fetch transitive group members, preserving user and service-principal IDs."""
    members = {}
    for group_id in sorted(group_ids):
        encoded_group = quote(group_id, safe="")
        url = (
            f"{GRAPH_ROOT}/groups/{encoded_group}/transitiveMembers"
            "?$select=id,displayName,userPrincipalName,appId,servicePrincipalType"
        )
        for member in _paged(url, token):
            member_id = member.get("id")
            member_type = member.get("@odata.type", "")
            if member_id and member_type in ("#microsoft.graph.user", "#microsoft.graph.servicePrincipal"):
                members[member_id] = member
    return members


def _service_principal(principal_id, token):
    encoded_id = quote(principal_id, safe="")
    url = f"{GRAPH_ROOT}/servicePrincipals/{encoded_id}?$select=id,displayName,appId,servicePrincipalType"
    return _request_json(url, token)


def collect_snapshot():
    token = os.environ["MS_GRAPH_TOKEN"]
    tenant_id = os.environ.get("AZURE_TENANT_ID", "")
    access, assigned_groups = _access_state(token)
    group_members = _group_members(assigned_groups, token)

    users_by_id = {}
    users_url = f"{GRAPH_ROOT}/users?$select=id,userPrincipalName,displayName,accountEnabled"
    for user in _paged(users_url, token):
        if user.get("id"):
            users_by_id[user["id"]] = user
    for principal_id, member in group_members.items():
        if member.get("@odata.type") == "#microsoft.graph.user":
            users_by_id.setdefault(principal_id, member)

    # Bound concurrency to avoid unbounded load; _request_json retries throttling
    # and transient failures. Any terminal failure aborts instead of emitting a
    # misleading partial MFA snapshot.
    user_ids = sorted(users_by_id)
    with ThreadPoolExecutor(max_workers=MAX_AUTH_WORKERS) as pool:
        registrations = dict(zip(user_ids, pool.map(lambda uid: _has_mfa_method(uid, token), user_ids)))

    accounts = []
    for user_id in user_ids:
        user = users_by_id[user_id]
        state = access.get(user_id, {})
        registered = registrations[user_id]
        accounts.append(
            {
                "id": user.get("userPrincipalName") or user_id,
                "object_id": user_id,
                "display_name": user.get("displayName"),
                "provider": "azure_entra",
                "principal_type": "user",
                "account_enabled": user.get("accountEnabled"),
                "privileged": bool(state.get("active") or state.get("eligible")),
                "eligible_privileged_access": bool(state.get("eligible")),
                "mfa_registered": registered,
                # Backward-compatible field: this means registration only, not
                # Conditional Access enforcement.
                "mfa_enabled": registered,
                "standing_privileged_access": bool(state.get("standing")),
            }
        )

    service_principal_ids = {
        principal_id
        for principal_id in access
        if principal_id not in users_by_id
    }
    service_principal_ids.update(
        principal_id
        for principal_id, member in group_members.items()
        if member.get("@odata.type") == "#microsoft.graph.servicePrincipal"
    )
    service_principals = []
    for principal_id in sorted(service_principal_ids):
        details = group_members.get(principal_id)
        if not details:
            details = _service_principal(principal_id, token)
        state = access.get(principal_id, {})
        service_principals.append(
            {
                "id": principal_id,
                "display_name": details.get("displayName"),
                "app_id": details.get("appId"),
                "provider": "azure_entra",
                "principal_type": "servicePrincipal",
                "privileged": bool(state.get("active") or state.get("eligible")),
                "eligible_privileged_access": bool(state.get("eligible")),
                "standing_privileged_access": bool(state.get("standing")),
                "mfa_registered": None,
            }
        )

    # Retain group-level assignments in the evidence output; transitive user and
    # service-principal members are independently represented above.
    group_assignments = [
        {"group_id": group_id, **access.get(group_id, {})}
        for group_id in sorted(assigned_groups)
    ]

    conditional_access = list(_paged(f"{GRAPH_ROOT}/identity/conditionalAccess/policies", token))
    return {
        "collected_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "tenant_id": tenant_id,
        "accounts": accounts,
        "service_principals": service_principals,
        "group_assignments": group_assignments,
        "conditional_access": conditional_access,
        "mfa_enforcement_evaluated": False,
    }


def main():
    json.dump(collect_snapshot(), sys.stdout, sort_keys=True)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
