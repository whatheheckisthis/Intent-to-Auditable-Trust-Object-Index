#!/usr/bin/env python3
"""Append a hashed evidence record to an immutable ledger backend."""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

CONTENT_TYPE = "application/json"


def _record_bytes(record):
    return json.dumps(record, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _append_s3(record, target):
    import boto3

    if "/" not in target:
        raise ValueError("LEDGER_TARGET for s3_object_lock must be bucket/prefix")
    bucket, prefix = target.split("/", 1)
    key = f"{prefix.rstrip('/')}/{record['control_id']}/{record['timestamp_utc']}-{record['sha256']}.json"
    client = boto3.client("s3")
    response = client.put_object(
        Bucket=bucket,
        Key=key,
        Body=_record_bytes(record),
        ContentType=CONTENT_TYPE,
        Metadata={"timestamp_utc": record["timestamp_utc"], "sha256": record["sha256"]},
        ObjectLockMode="COMPLIANCE",
        ObjectLockRetainUntilDate=datetime.now(timezone.utc) + timedelta(days=2555),
    )
    if "VersionId" not in response:
        raise RuntimeError("S3 Object Lock write did not return VersionId; immutable write not confirmed")
    return {"backend": "s3_object_lock", "target": f"s3://{bucket}/{key}", "version_id": response["VersionId"]}


def _append_azure(record, target):
    from azure.storage.blob import BlobClient, ContentSettings

    if "/" not in target:
        raise ValueError("LEDGER_TARGET for azure_immutable_blob must be container/blob-prefix")
    connection_string = os.environ["AZURE_STORAGE_CONNECTION_STRING"]
    container, prefix = target.split("/", 1)
    blob_name = f"{prefix.rstrip('/')}/{record['control_id']}/{record['timestamp_utc']}-{record['sha256']}.json"
    blob = BlobClient.from_connection_string(connection_string, container_name=container, blob_name=blob_name)
    blob.upload_blob(
        _record_bytes(record),
        overwrite=False,
        content_settings=ContentSettings(content_type=CONTENT_TYPE),
        metadata={"timestamp_utc": record["timestamp_utc"], "sha256": record["sha256"]},
    )
    properties = blob.get_blob_properties()
    policy = getattr(properties, "immutability_policy", None)
    if not policy:
        raise RuntimeError("Azure Blob write returned no immutability policy; immutable write not confirmed")
    return {"backend": "azure_immutable_blob", "target": f"azure://{quote(container)}/{quote(blob_name)}"}


def main():
    backend = os.environ.get("LEDGER_BACKEND")
    target = os.environ.get("LEDGER_TARGET")
    if not backend or not target:
        print("LEDGER_BACKEND and LEDGER_TARGET are required", file=sys.stderr)
        sys.exit(2)

    record = json.load(sys.stdin)
    record.setdefault("ledger_appended_at", datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))
    try:
        if backend == "s3_object_lock":
            result = _append_s3(record, target)
        elif backend == "azure_immutable_blob":
            result = _append_azure(record, target)
        else:
            raise ValueError(f"unsupported LEDGER_BACKEND: {backend}")
    except Exception as exc:
        print(f"ledger append failed: {exc}", file=sys.stderr)
        sys.exit(1)

    json.dump(result, sys.stdout, sort_keys=True)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
