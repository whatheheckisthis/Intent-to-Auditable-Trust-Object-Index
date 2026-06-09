#!/usr/bin/env python3
"""Run mutation fixtures against Rego policies with regopy."""

import json
import re
import sys
from pathlib import Path

from regopy import Interpreter

PACKAGE_RE = re.compile(r"^package\s+([A-Za-z0-9_.]+)\s*$")
MANIFEST_PATH = Path("test/mutations/mutation-manifest.json")


def load_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def package_from_source(source, policy_path):
    for line in source.splitlines():
        match = PACKAGE_RE.match(line.strip())
        if match:
            return match.group(1)
    raise ValueError(f"package declaration not found in {policy_path}")


def evaluate(policy_path, fixture_path):
    rego_source = policy_path.read_text(encoding="utf-8")
    fixture = load_json(fixture_path)
    package = package_from_source(rego_source, policy_path)

    interp = Interpreter()
    interp.add_module(policy_path.name, rego_source)
    interp.set_input(fixture)
    result = interp.query(f"data.{package}.deny")

    raw = json.loads(result.node().json())
    expression = raw["expressions"][0]
    deny_msgs = list(expression.keys()) if expression else []
    return "FAIL" if deny_msgs else "PASS"


def main():
    manifest = load_json(MANIFEST_PATH)
    failed = False

    for case in manifest:
        fixture_path = Path(case["fixture"])
        policy_path = Path(case["policy"])
        expected = case["expected"]
        actual = evaluate(policy_path, fixture_path)
        if actual == expected:
            print(f"PASS {fixture_path}")
        else:
            failed = True
            print(f"FAIL {fixture_path} (expected {expected}, got {actual})")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
