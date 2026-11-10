#!/usr/bin/env python3
"""Secure, read-only normalization of SailPoint IdentityIQ XML exports.

This deliberately extracts governance-object metadata only. It does not execute
Rule source or infer that a TaskDefinition is scheduled/effective from its XML.
"""

import argparse
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

MAX_XML_BYTES = 10 * 1024 * 1024
OBJECT_TYPES = {"Rule", "TaskDefinition", "EmailTemplate"}


def _local_name(tag):
    return tag.rsplit("}", 1)[-1]


def _text(element, name):
    child = next((node for node in element if _local_name(node.tag) == name), None)
    if child is None or child.text is None:
        return None
    value = child.text.strip()
    return value or None


def normalize_xml(xml_bytes):
    """Return a stable normalized governance-object document from IIQ XML bytes."""
    if len(xml_bytes) > MAX_XML_BYTES:
        raise ValueError(f"XML input exceeds the {MAX_XML_BYTES}-byte limit")
    upper = xml_bytes.upper()
    if b"<!DOCTYPE" in upper or b"<!ENTITY" in upper:
        raise ValueError("DOCTYPE and entity declarations are not accepted")
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as error:
        raise ValueError(f"Invalid SailPoint XML: {error}") from error
    if _local_name(root.tag) != "sailpoint":
        raise ValueError("Expected a SailPoint <sailpoint> document root")

    objects = []
    for element in root.iter():
        object_type = _local_name(element.tag)
        if object_type not in OBJECT_TYPES:
            continue
        record = {
            "object_type": object_type,
            "name": element.get("name"),
            "id": element.get("id"),
            "description": _text(element, "Description"),
        }
        if object_type == "TaskDefinition":
            # Surface explicit enablement only. Missing values remain unknown.
            record["enabled"] = element.get("enabled")
        objects.append(record)

    objects.sort(key=lambda item: (item["object_type"], item.get("name") or "", item.get("id") or ""))
    return {"source": "sailpoint_iiq_xml", "objects": objects}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xml_file", type=Path, help="IdentityIQ XML export")
    args = parser.parse_args(argv)
    try:
        normalized = normalize_xml(args.xml_file.read_bytes())
    except (OSError, ValueError) as error:
        print(f"sailpoint ingestion failed: {error}", file=sys.stderr)
        return 2
    json.dump(normalized, sys.stdout, sort_keys=True, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
