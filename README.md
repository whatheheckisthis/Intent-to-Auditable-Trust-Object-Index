# IĀTŌ — Intent-to-Auditable-Trust-Object


## Overview

IĀTŌ is a read-only compliance assertion pipeline. Configuration state is retrieved from cloud tenants through least-privilege API calls, evaluated against Rego policies, and committed as cryptographically hashed evidence to a write-once-read-many (WORM) ledger. The pipeline produces audit-ready artefacts for IRAP assessors and regulated enterprise engagements.

The process ends at ledger commit. Remediation is out of scope. No resources in the source environment are modified, created, or deleted by the pipeline.

## Pipeline Stages

| Stage | Component | Output |
|---|---|---|
| 1. Evidence Emission | Read-only API collectors (Lambda / Functions) | Raw JSON tenant configuration snapshot |
| 2. Ingestion | Cross-account / cross-tenant trust boundary | Authenticated evaluation context |
| 3. Evaluation | OPA / Rego policy-as-code assertion engine | `PASS` / `FAIL` per control ID |
| 4. Runtime | Serverless ephemeral execution | Isolated, stateless evaluation |
| 5. Ledger Commit | SHA-256 hash chain → WORM store | Immutable, tamper-evident audit record |
| 6. Remediation | Manual — Terraform / PowerShell / change management | Restored compliance state (out of pipeline scope) |

## Repository Structure

```
iato-root/
├── .github/
│   └── workflows/
│       ├── validate.yml          # PR validation: regopy mutation fixture runner
│       └── ledger-commit.yml     # Merge-to-main: hash results and append to immutable store
├── docs/
│   └── COMPLIANCE_CROSSWALK.csv  # Assertion library and multi-framework mapping table
├── collectors/
│   ├── aws/
│   │   └── iam_snapshot.py       # Read-only boto3: IAM users, MFA status, password policy
│   └── azure/
│       └── entra_snapshot.py     # Read-only MS Graph: users, MFA registration, conditional access
├── policies/
│   ├── ac/                       # Access Control domain
│   │   ├── IATO-AC-012.rego      # MFA enforcement — privileged accounts
│   │   └── IATO-AC-013.rego      # Standing access elimination — PIM/JIT
│   ├── ai/                       # AI Governance domain
│   └── bk/                       # Backup and Recovery domain
├── test/
│   ├── mutations/
│   │   ├── mutation-manifest.json
│   │   └── fixtures/             # PASS and FAIL input fixtures per policy
│   └── unit/                     # Rego unit test files (_test.rego)
├── ledger/
│   ├── scripts/
│   │   ├── hash_result.py        # SHA-256 canonical JSON hashing
│   │   └── append_ledger.py      # Append-only write to S3 Object Lock or Azure Immutable Blob
│   └── storage/
│       └── README.md             # Backend configuration reference
└── requirements.txt
```

## Control ID Schema

```
Format:  IATO-{DOMAIN}-{SEQ}
Example: IATO-AC-012

IATO  = namespace
AC    = domain code
012   = zero-padded sequence number
```

The control ID is a primary key. Rego policies reference IATO IDs exclusively. External framework identifiers (ISM, NZISM, SOC 2, etc.) are maintained in `docs/COMPLIANCE_CROSSWALK.csv` as satisfier columns. There is no coupling between policy code and external framework numbering.

### Domain Registry

| Code | Domain |
|---|---|
| `AC` | Access Control |
| `BK` | Backup and Recovery |
| `CM` | Configuration Management |
| `IM` | Incident Management |
| `SC` | Supply Chain Integrity |
| `AI` | AI Governance / LLM Safety |

## Crosswalk Model

A single index entry satisfies obligations across multiple frameworks simultaneously. Evidence is produced once and applies to every framework tag the entry carries.

```yaml
control_id: IATO-AC-012
title:      Privileged Access — Standing Access Elimination
assertion:  no standing privileged accounts outside defined break-glass scope
evidence:   IAM role inventory extract, last-reviewed timestamp, exception register
frameworks:
  - NZISM:   AC-7
  - ISM:     ISM-1175, ISM-1507
  - E8 ML3:  Restrict Administrative Privileges — ML3
```

The full crosswalk is maintained in [`docs/COMPLIANCE_CROSSWALK.csv`](docs/COMPLIANCE_CROSSWALK.csv).

## Evidence Model

| Property | Implementation |
|---|---|
| **Append-Only** | `UPDATE` and `DELETE` permissions revoked at schema level. Only `INSERT` permitted. |
| **Hash-Chained** | Every entry embeds `SHA-256(preceding_entry)`. Chain integrity is independently verifiable. |
| **Timestamped** | Every entry carries a cryptographically verified temporal marker. |

Evidence packages for IRAP assessors are structured as append-only ledger extracts. Control implementation statements are machine-generated from asserted control states.

## CI/CD

### PR Validation — `validate.yml`

Trigger: `pull_request`

Installs `regopy==1.4.0` via direct wheel fetch from `files.pythonhosted.org`. Executes `test/run_tests.py` against `test/mutations/mutation-manifest.json`. Fails the PR if any fixture produces an unexpected result.

> `conftest` and the OPA static binary are not used. The proxy environment blocks GitHub release artifact fetches. `regopy` is the confirmed Rego evaluation runtime for this pipeline. `test/unit/*_test.rego` files are retained as artefacts for environments where a native OPA binary is available.

### Ledger Commit — `ledger-commit.yml`

Trigger: `push` to `main`

Runs `ledger/scripts/hash_result.py` then `ledger/scripts/append_ledger.py` for each JSON file in the configured `results/` directory. Backend target is set via `LEDGER_BACKEND` and `LEDGER_TARGET` environment variables (GitHub Actions secrets). Supported backends: `s3_object_lock`, `azure_immutable_blob`.

## Framework Coverage

| Framework | Coverage Basis |
|---|---|
| E8 ML3 | All eight strategies asserted at ML3; evidence structured for IRAP assessor consumption |
| ISM | Controls mapped as enumerated, addressable assurance targets modelled as observable states |
| NZISM | Controls mapped at classification level appropriate to engagement scope |

ML3 is the baseline floor for all AU government and regulated enterprise engagements.

## Scaling Model

Scale is achieved by expanding the assertion library.

| Action | Implementation |
|---|---|
| Add a domain | Add domain code to registry; add Rego policies under `policies/<domain>/` |
| Add a framework | Add a column to `docs/COMPLIANCE_CROSSWALK.csv` |
| Add a collector | Add a read-only script under `collectors/<platform>/` |

## Scope

| Dimension | Statement |
|---|---|
| **Authority** | No index entry constitutes decision-making authority |
| **Scope** | Index coverage is bounded by declared framework obligations |
| **Output nature** | Assertions are diagnostic and audit-ready; they do not substitute for registered assessor judgement |
| **Governance** | All outputs must be interpreted within the governing framework context |


 | Authority | Title | Publisher | Date |
|---|---|---|---|
| Australian Signals Directorate | [Information Security Manual](https://www.cyber.gov.au/resources-business-and-government/essential-cyber-security/ism) | cyber.gov.au | Mar. 2025 |
| Government Communications Security Bureau | [New Zealand Information Security Manual](https://nzism.gcsb.govt.nz) | nzism.gcsb.govt.nz | Feb. 2024 |
 
>The IĀTŌ codebase, index documentation, policy artefacts, crosswalk data, evidence outputs, and all associated materials (collectively, "the Artefact") are the work product of an independent assurance practitioner and shall remain subject to the governance terms specified in `notebooks/DISCLAIMER.md`. The Artefact shall not be reproduced, redistributed, sublicensed, or transmitted in any form or by any means without prior written authorisation.
The Artefact shall not be submitted, in whole or in part, as original work in any assessed academic context, nor shall it be adapted or paraphrased for such purposes. The Artefact is developed exclusively for professional assurance engagements and shall therefore be interpreted within that context alone.

>No provision of this Artefact shall be construed as constituting legal, regulatory, or certifying authority.
All analytical claims contained herein shall be traceable to their cited primary sources; no claim shall be treated as authoritative in the absence of such traceability. Any use of the Artefact inconsistent with these terms, or with the full permitted-use terms specified in `notebooks/DISCLAIMER.md`, shall constitute a breach of the governance conditions under which the Artefact is maintained and may give rise to appropriate remedial action.


