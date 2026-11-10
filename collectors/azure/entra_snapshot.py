#!/usr/bin/env python3
"""Collect a read-only Microsoft Entra snapshot and write raw JSON to stdout."""

import json
import os
import sys
from datetime import datetime, timezone
from urllib.parse import quote
from urllib.request import Request, urlopen

GRAPH_ROOT = "https://graph.microsoft.com/v1.0"
PASSWORD_METHOD_TYPE = "#microsoft.graph.passwordAuthenticationMethod"


def _read_secret_file(path):
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read().strip()


def _graph_token_from_file_or_env():
    """Legacy fallback only: prefer short-lived app credentials instead."""
    token_file = os.environ.get("MS_GRAPH_TOKEN_FILE")
    if token_file:
        return _read_secret_file(token_file)
    token = os.environ.get("MS_GRAPH_TOKEN")
    if token:
        return token
    return None


def _graph_token_from_app_registration():
    """Retrieve a short-lived Graph token from an app-registration certificate.

    This should be the default path for local Podman and Kubernetes. The CLI uses
    self-rotating credentials without persisting a long-lived bearer token.
    """
    client_id = os.environ.get("AZURE_CLIENT_ID")
    tenant_id = os.environ.get("AZURE_TENANT_ID")
    cert_path = os.environ.get("AZURE_CLIENT_CERTIFICATE_PATH")
    if not client_id or not tenant_id or not cert_path:
        return None
    try:
        import msal
    except ImportError as exc:  # pragma: no cover - dependency is optional in dev setups
        raise RuntimeError(
            "Install msal to use Azure app-registration client credentials for Graph access"
        ) from exc

    with open(cert_path, "rb") as handle:
        client_credential = handle.read().decode("utf-8")
    app = msal.ConfidentialClientApplication(
        client_id=client_id,
        authority=f"https://login.microsoftonline.com/{tenant_id}",
        client_credential=client_credential,
    )
    result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    if "access_token" not in result:
        raise RuntimeError(f"Failed to acquire Graph token: {result.get('error_description', result)}")
    return result["access_token"]


def _graph_token():
    """Prefer short-lived app credentials; keep static token handling as a fallback only."""
    token = _graph_token_from_app_registration()
    if token is not None:
        return token
    token = _graph_token_from_file_or_env()
    if token is not None:
        return token
    raise RuntimeError(
        "No Graph credential available. Provide Azure app credentials via "
        "AZURE_CLIENT_ID/AZURE_TENANT_ID/AZURE_CLIENT_CERTIFICATE_PATH or a short-lived "
        "MS_GRAPH_TOKEN_FILE."
    )


def _request_json(url, token):
    request = Request(url, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
    with urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def _paged(url, token):
    while url:
        data = _request_json(url, token)
        yield from data.get("value", [])
        url = data.get("@odata.nextLink")


def _has_mfa_method(user_id, token):
    encoded_user = quote(user_id, safe="")
    methods = _request_json(f"{GRAPH_ROOT}/users/{encoded_user}/authentication/methods", token).get("value", [])
    return any(method.get("@odata.type") != PASSWORD_METHOD_TYPE for method in methods)


def _privileged_role_definition_ids(token):
    role_definition_ids = set()
    url = f"{GRAPH_ROOT}/roleManagement/directory/roleDefinitions?$filter=isPrivileged eq true&$select=id,isPrivileged"
    for role_definition in _paged(url, token):
        if role_definition.get("isPrivileged") is True:
            role_definition_ids.add(role_definition["id"])
    return role_definition_ids


def _privileged_access_maps(token):
    privileged_role_ids = _privileged_role_definition_ids(token)
    standing_user_ids = set()
    eligible_user_ids = set()
    assignment_url = f"{GRAPH_ROOT}/roleManagement/directory/roleAssignmentScheduleInstances?$select=principalId,roleDefinitionId"
    for assignment in _paged(assignment_url, token):
        if assignment.get("roleDefinitionId") in privileged_role_ids and assignment.get("principalId"):
            standing_user_ids.add(assignment["principalId"])
    eligibility_url = f"{GRAPH_ROOT}/roleManagement/directory/roleEligibilityScheduleInstances?$select=principalId,roleDefinitionId"
    for eligibility in _paged(eligibility_url, token):
        if eligibility.get("roleDefinitionId") in privileged_role_ids and eligibility.get("principalId"):
            eligible_user_ids.add(eligibility["principalId"])
    return standing_user_ids, eligible_user_ids


def collect_snapshot():
    token = _graph_token()
    tenant_id = os.environ.get("AZURE_TENANT_ID", "")
    standing_user_ids, eligible_user_ids = _privileged_access_maps(token)
    accounts = []
    users_url = f"{GRAPH_ROOT}/users?$select=id,userPrincipalName,accountEnabled"
    for user in _paged(users_url, token):
        user_id = user["id"]
        privileged = user_id in standing_user_ids or user_id in eligible_user_ids
        accounts.append(
            {
                "id": user.get("userPrincipalName", user_id),
                "provider": "azure_entra",
                "privileged": privileged,
                "mfa_enabled": _has_mfa_method(user_id, token),
                "standing_privileged_access": user_id in standing_user_ids,
            }
        )
    conditional_access = list(_paged(f"{GRAPH_ROOT}/identity/conditionalAccess/policies", token))
    return {
        "collected_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "tenant_id": tenant_id,
        "accounts": accounts,
        "conditional_access": conditional_access,
    }


def main():
    json.dump(collect_snapshot(), sys.stdout, sort_keys=True)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
