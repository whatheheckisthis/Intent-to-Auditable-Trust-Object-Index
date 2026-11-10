#!/usr/bin/env python3
"""Combine offline SailPoint IIQ XML and/or Microsoft Entra snapshots."""

import argparse
import json
import sys
from pathlib import Path

from collectors.azure.entra_snapshot import collect_snapshot
from ingest.sailpoint_iiq import normalize_xml


def _load_json(path):
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise ValueError(f"cannot read valid JSON from {path}: {error}") from error
    if not isinstance(value, dict):
        raise ValueError(f"expected a JSON object in {path}")
    return value


def collect(sailpoint_xml=None, entra_json=None, live_entra=False):
    if not any((sailpoint_xml, entra_json, live_entra)):
        raise ValueError("provide --sailpoint-xml, --entra-json, and/or --live-entra")
    if entra_json and live_entra:
        raise ValueError("--entra-json and --live-entra are mutually exclusive")

    result = {"schema_version": "1.0", "sources": {}}
    if sailpoint_xml:
        result["sources"]["sailpoint_iiq"] = normalize_xml(sailpoint_xml.read_bytes())
    if entra_json:
        result["sources"]["entra"] = _load_json(entra_json)
    elif live_entra:
        result["sources"]["entra"] = collect_snapshot()
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sailpoint-xml", type=Path, help="read-only IIQ XML export")
    parser.add_argument("--entra-json", type=Path, help="previously collected Entra JSON snapshot")
    parser.add_argument("--live-entra", action="store_true", help="collect a live read-only Entra snapshot")
    args = parser.parse_args(argv)
    try:
        result = collect(args.sailpoint_xml, args.entra_json, args.live_entra)
    except (OSError, ValueError, KeyError) as error:
        print(f"iato collection failed: {error}", file=sys.stderr)
        return 2
    json.dump(result, sys.stdout, sort_keys=True, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
