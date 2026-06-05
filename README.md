# IĀTŌ — Intent-to-Auditable-Trust-Object

## 1. Index Overview

Conventional control registers are document artefacts maintained manually, assessed periodically, and structurally incapable of producing machine evidence. When an auditor or IRAP assessor requests evidence of control implementation, the response is typically a collection of screenshots, policy documents, and prose attestations assembled after the fact.

IĀTŌ replaces this model with a closed control index.

Every security obligation across NZISM, ISM, E8 ML3, DISP, and APRA CPS 220 is represented as a single enumerated entry in the index. Each entry carries a defined assertion, a specified evidence artefact class, and a crosswalk to every framework identifier it satisfies. Control coverage is not claimed; it is asserted against observable state and committed to an immutable evidence ledger.

The index operates as the taxonomy of the SIRA/IĀTŌ dual assurance architecture. 

SIRA produces quantified risk outputs from ledger observations. 

Defines what is observed, how it is asserted, and what constitutes valid evidence.

### E8 ML3 — ASD Essential Eight Maturity Level 3

ML3 is the baseline floor for all AU government and regulated enterprise engagements.

| Strategy | ML3 Assertion Scope |
|---|---|
| Application control | Allowlist enforcement, scope coverage, exception governance |
| Patch applications | Patch currency SLA, automated detection, gap evidence |
| Configure MS Office macros | Macro signing, sandbox enforcement, user override controls |
| User application hardening | Browser plugin governance, JScript/ActiveX control surface |
| Restrict admin privileges | PAM coverage, standing access elimination, JIT attestation |
| Patch operating systems | OS patch currency, EOL enforcement, unsupported asset register |
| MFA | Phishing, resistant MFA, privileged and unprivileged coverage |
| Regular backups | RTO/RPO-bound, restoration tested, integrity-chained |

All eight strategies are asserted at ML3. Evidence is structured for direct IRAP assessor consumption and committed to the append only evidence ledger as artefacts.

---

## 2. Index Structure

### 2.1 Control Entry Model

Each entry in the IĀTŌ index is a single, self-contained assurance target. No control exists as a prose description alone. Every entry specifies:

| Field | Definition |
|---|---|
| `control_id` | Unique enumerated identifier within the index |
| `title` | Plain-language control name |
| `assertion` | Machine-evaluable statement of required control state |
| `evidence` | Defined artefact class and source; committed to ledger on assertion |
| `frameworks` | Every framework identifier this entry satisfies |

### 2.2 Crosswalk Model

Controls are not maintained as per-framework silos. A single index entry satisfies obligations across multiple frameworks simultaneously. Evidence is produced once and applies to every framework tag the entry carries.

```yaml
control_id: IATO-AC-012
title:      Privileged Access — Standing Access Elimination
assertion:  no standing privileged accounts outside defined break-glass scope
evidence:   IAM role inventory extract, last-reviewed timestamp, exception register
frameworks:
  - NZISM:        AC-7
  - ISM:          ISM-1175, ISM-1507
  - E8 ML3:       Restrict Administrative Privileges — ML3
  - DISP:         ICT-04
  - APRA CPS 220: ORM-3.2 (operational risk control)
```

This eliminates duplicate evidence production and provides a single auditable trail regardless of which framework is the assurance target for a given engagement.

---

## 3. E8 ML3 Control Domains

The following index domains map directly to the eight Essential Eight strategies at ML3. Each domain entry is an assertion against observable control state — not a documentation claim.

### 3.1 Application Control

| Control Scope | Assertion |
|---|---|
| Allowlist enforcement | Only explicitly permitted executables run; all others are blocked by policy |
| Scope coverage | Allowlist coverage extends to all user workstations, servers, and internet-facing systems |
| Exception governance | All allowlist exceptions are time-bound, approved, and ledger-recorded |

### 3.2 Patch Applications

| Control Scope | Assertion |
|---|---|
| Patch currency SLA | Critical patches applied within defined SLA; evidence emitted per patch cycle |
| Automated detection | Vulnerability scanning runs on schedule; results committed to ledger |
| Gap evidence | Unpatched assets are enumerated, risk-accepted, and tracked in the exception register |

### 3.3 Configure Microsoft Office Macros

| Control Scope | Assertion |
|---|---|
| Macro signing | Only macros signed by a trusted publisher execute; unsigned macros are blocked |
| Sandbox enforcement | Macro execution is isolated; network and filesystem access is constrained |
| User override controls | Users cannot modify macro execution policy; override attempts are logged |

### 3.4 User Application Hardening

| Control Scope | Assertion |
|---|---|
| Browser plugin governance | Only explicitly approved plugins are permitted; unapproved plugins are blocked |
| JScript/ActiveX control surface | JScript and ActiveX execution is disabled or constrained to approved contexts |

### 3.5 Restrict Administrative Privileges

| Control Scope | Assertion |
|---|---|
| PAM coverage | All privileged accounts are managed under a PAM solution; coverage is complete |
| Standing access elimination | No standing privileged accounts exist outside defined break-glass scope |
| JIT attestation | Just-in-time privilege elevation is logged, time-bound, and ledger-committed |

### 3.6 Patch Operating Systems

| Control Scope | Assertion |
|---|---|
| OS patch currency | OS patches applied within defined SLA; evidence emitted per patch cycle |
| EOL enforcement | No end-of-life operating systems in production; EOL assets are enumerated and scheduled for remediation |
| Unsupported asset register | Unsupported assets are tracked, risk-accepted, and subject to compensating controls |

### 3.7 Multi-Factor Authentication

| Control Scope | Assertion |
|---|---|
| Phishing-resistant MFA | FIDO2/hardware token MFA enforced for all internet-facing and privileged access |
| Privileged coverage | All privileged accounts require phishing-resistant MFA; no exceptions without ledger-recorded approval |
| Unprivileged coverage | MFA enforced for all standard user access to organisational systems and data |

### 3.8 Regular Backups

| Control Scope | Assertion |
|---|---|
| RTO/RPO-bound | Recovery time and recovery point objectives are defined, documented, and asserted |
| Restoration tested | Backup restoration is tested on a defined schedule; test results committed to ledger |
| Integrity-chained | Backup integrity is cryptographically verified; tampering is detectable |

---

## 4. Evidence Model

All index assertions produce evidence committed to the SIRA/IĀTŌ append-only evidence ledger. Evidence is not assembled retrospectively for audits — it exists continuously as a ledger record.

| Property | Implementation |
|---|---|
| **Append-Only** | `UPDATE` and `DELETE` permissions revoked at schema level. Only `INSERT` permitted. |
| **Hash-Chained** | Every entry embeds `SHA-256(preceding_entry)`. Chain integrity is independently verifiable. |
| **Timestamped** | Every entry carries a cryptographically verified temporal marker. Timeline is forensically reliable. |

Evidence packages for IRAP assessors are structured as append-only ledger extracts — not ad-hoc document collections. Control implementation statements are machine-generated from asserted control states, not authored manually.

---

## 5. Framework Coverage

| Framework | Coverage Basis |
|---|---|
| E8 ML3 | All eight strategies asserted at ML3; evidence structured for IRAP assessor consumption |
| ISM | Controls mapped as enumerated, addressable assurance targets; each modelled as an observable state |
| NZISM | Controls mapped at classification level appropriate to engagement scope |
| DISP | Evidence structures consistent with ISM/IRAP same ledger, same schema, separate crosswalk layer |
| APRA CPS 220 | Risk governance overlay; quantified residual exposure output structured for board and prudential reviewer consumption |

The full framework crosswalk is maintained in `docs/COMPLIANCE_CROSSWALK.csv`.

---

## 6. Scope

| Dimension | Statement |
|---|---|
| **Authority** | No index entry constitutes decision-making authority |
| **Scope** | Index coverage is bounded by declared framework obligations |
| **Output nature** | Assertions are diagnostic and audit-ready; they do not substitute for registered assessor judgement |
| **Governance requirement** | All outputs must be interpreted within the governing framework context |

---

## 7. License and Academic Use Notice

Licensed under the Apache License, Version 2.0. See `LICENSE` and `NOTICE` at repository root.

**Academic use:** The IĀTŌ codebase, index documentation, and associated artefacts must not be used to underpin coursework content or submitted as original work in any assessed academic context. This is a practitioner artefact. All analytical claims should be traced to their cited primary sources. See `notebooks/DISCLAIMER.md` for full permitted-use terms.
