#!/usr/bin/env python3
"""Collect a read-only AWS IAM snapshot and write raw JSON to stdout."""

import json
import sys
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

ADMIN_POLICY_ARN = "arn:aws:iam::aws:policy/AdministratorAccess"


def _policy_arns(items):
    return {item.get("PolicyArn") for item in items}


def _has_admin_policy(iam, user_name):
    # boto3 method: iam.list_attached_user_policies(UserName=user_name)
    user_policies = iam.list_attached_user_policies(UserName=user_name).get("AttachedPolicies", [])
    if ADMIN_POLICY_ARN in _policy_arns(user_policies):
        return True

    # boto3 method: iam.list_groups_for_user(UserName=user_name)
    groups = iam.list_groups_for_user(UserName=user_name).get("Groups", [])
    for group in groups:
        group_name = group["GroupName"]
        # boto3 method: iam.list_attached_group_policies(GroupName=group_name)
        group_policies = iam.list_attached_group_policies(GroupName=group_name).get("AttachedPolicies", [])
        if ADMIN_POLICY_ARN in _policy_arns(group_policies):
            return True
    return False


def collect_snapshot():
    iam = boto3.client("iam")
    sts = boto3.client("sts")

    # boto3 method: sts.get_caller_identity()
    identity = sts.get_caller_identity()
    account_id = identity["Account"]

    accounts = []
    # boto3 method: iam.get_paginator('list_users').paginate()
    for page in iam.get_paginator("list_users").paginate():
        for user in page.get("Users", []):
            user_name = user["UserName"]
            # boto3 method: iam.list_mfa_devices(UserName=user_name)
            mfa_devices = iam.list_mfa_devices(UserName=user_name).get("MFADevices", [])
            privileged = _has_admin_policy(iam, user_name)
            accounts.append(
                {
                    "id": user_name,
                    "provider": "aws_iam",
                    "privileged": privileged,
                    "mfa_enabled": bool(mfa_devices),
                    "standing_privileged_access": privileged,
                }
            )

    try:
        # boto3 method: iam.get_account_password_policy()
        password_policy = iam.get_account_password_policy().get("PasswordPolicy", {})
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") != "NoSuchEntity":
            raise
        password_policy = None

    return {
        "collected_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "account_id": account_id,
        "accounts": accounts,
        "password_policy": password_policy,
    }


def main():
    json.dump(collect_snapshot(), sys.stdout, sort_keys=True)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
