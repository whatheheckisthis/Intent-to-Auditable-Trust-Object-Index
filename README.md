# IĀTO Series Versioning Index

## Start Here

This README is a versioning index for the IĀTO series.

If you only read one section, read **Version Map** first.

---

## Version Map

The IĀTO series is incremental:

- **v2** → baseline milestone
- **v5** → refinement milestone after v3
- **v7** → current milestone and latest reference point

### Ordering Rule

`v7` supersedes `v5`, and `v2` supersedes `v1`.

### Continuity Rule

All versions are part of one lineage, so comparisons should be made as **evolution**, not separate products.

---

## How to Read Versions

### v2

- Foundation release for the series timeline.
- Use mainly as historical baseline.

### v5

- Intermediate refinement in the same track.
- Use for delta comparisons against v3 and v6.

### v7

- Current reference version.
- Use as the default point for docs and discussion.

---

## Scope of This Index

This document is intentionally limited to versioning clarity:

- defines the relationship between `v2`, `v5`, and `v7`
- states precedence and continuity rules
- gives a simple reading order for series history

Out of scope:

- detailed operational tutorials
- implementation deep dives
- policy/process guidance outside version lineage

---

## Auditability Notes

For any version claim, verify with:

1. Git history and tags/commits.
2. README statements for version precedence.
3. Diff comparisons between target milestones.

---

## Reproducibility Notes

When documenting or validating behavior across versions:

1. Record the exact commit hash.
2. Record the compared version pair (for example `v4` vs `v6`).
3. Record the exact commands used during comparison.

This keeps conclusions reproducible and reviewable.


