#!/usr/bin/env python3
"""Hash canonical compliance result JSON from a file path or stdin."""

import hashlib
import json
import sys
from datetime import datetime, timezone


def _read_json():
    if len(sys.argv) == 2:
        with open(sys.argv[1], "r", encoding="utf-8") as handle:
            return json.load(handle)
    if len(sys.argv) == 1:
        return json.load(sys.stdin)
    print("usage: hash_result.py [result.json]", file=sys.stderr)
    sys.exit(2)


def main():
    obj = _read_json()
    canonical = json.dumps(obj, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    output = {
        "control_id": obj["control_id"],
        "result": obj["result"],
        "sha256": digest,
        "timestamp_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "evidence_ref": obj["evidence_ref"],
    }
    json.dump(output, sys.stdout, sort_keys=True, separators=(",", ":"))
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
