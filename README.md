# IĀTŌ — Intent-to-Auditable-Trust-Object

## 1. Index Overview

The process is read-only and does not perform remediation. It operates as part of the practice and interacts with client environments using least-privilege access. It retrieves configuration state through read-only API calls, evaluates that state against predefined Rego policies, and records the resulting evidence and evaluation outcome in a write-once-read-many (WORM) ledger using cryptographic hashing. Its scope is observation, evaluation, and logging. It does not modify, create, or delete resources in the source environment.
The process ends when the evidence and control evaluation, e.g., `PASS`/`FAIL` or `CONTROL_FAILED` are written to the WORM storage system. After this point, there is no further interaction with the client environment. It does not execute corrective actions and does not perform remediation. The output is limited to recorded evidence and evaluation results.

Remediation is performed manually and outside the process. The practitioner reviews the `CONTROL_FAILED` result, traces it to the underlying infrastructure configuration, and applies changes using Terraform, PowerShell scripts, or IAM policy updates. This is the only point where the client environment is modified, and it is controlled through change-management procedures.
From a controls mapping perspective, the process aligns to logging, monitoring, and evidence collection requirements in frameworks such as NZISM, ISM, Essential Eight Maturity Level 3. It does not implement corrective controls. Corrective controls are implemented through change management procedures. For IRAP assessment, the process provides machine-verifiable evidence of control state. 

Remediation evidence is provided through change history and approved change records. Access is restricted to read-only service principals or IAM roles. No administrative credentials are used. Permissions are limited to configuration retrieval and state verification. This ensures the process cannot modify production resources. Remediation remains separate and is performed through controlled engineering procedures.


### 1.1 Delivery Posture
| Stage                | Component                     | Mechanism                                         | Cloud Services / Tools                                                            | Data State                                | Security Model                                                    | Output / Control Outcome                    |
| -------------------- | ----------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| 1. Evidence Emission | Configuration State Retrieval | Scheduled or event-driven read-only API execution | AWS EventBridge, Azure Logic Apps, AWS Lambda, Azure Functions, AWS IAM, Azure AD | Raw JSON tenant configuration snapshot    | Least-privilege read-only identity (IAM role/service principal) | Structured, immutable configuration dataset |
| 2. Ingestion Model   | Identity Trust Boundary       | Cross-account / cross-tenant trust establishment  | IAM trust policies, Azure service principals, external ID constraints             | Authenticated execution context           | Scoped read-only access boundary                                  | Secure evaluation channel established       |
| 3. Evaluation Engine | Policy-as-Code Processing     | JSON evaluation against Rego / schema definitions | Open Policy Agent (OPA), Rego, JSON Schema                                        | Compliance evaluation result (true/false) | Deterministic policy enforcement (stateless evaluation)           | Control pass/fail decision output           |
| 4. Runtime Context   | Execution Environment         | Serverless in-memory processing                   | AWS Lambda, Azure Functions                                                       | Ephemeral payload processing              | No persistence, no side effects                                   | Isolated evaluation execution               |


---

| Stage                | Component              | Mechanism                                                  | Cloud Services / Tools                                                  | Data State                   | Security Model                          | Output / Control Outcome                          |
| -------------------- | ---------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------- | --------------------------------------- | ------------------------------------------------- |
| 5. Ledger Commit     | Evidence Finalization  | Cryptographic hashing of evidence + evaluation + timestamp | SHA-256, AWS QLDB, AWS S3 Object Lock (WORM), Azure Confidential Ledger | Immutable audit record       | Append-only, tamper-evident storage     | Verifiable compliance artifact                    |
| 6. Integrity Model   | Hash Chaining          | Sequential cryptographic linkage of records                | SHA-256 hash chain                                                      | Historical ledger continuity | Tamper detection via chain break        | Forensic integrity guarantee                      |
| 7. Output State      | Compliance Ledger      | Final persisted record in immutable store                  | QLDB / WORM / ledger databases                                          | Immutable compliance history | Externalized trust boundary             | Audit-ready evidence trail                        |
| 8. Remediation  | Control Gap Resolution | Infrastructure correction workflows                        | Terraform, PowerShell, CI/CD pipelines, cloud consoles                  | Drift correction actions     | Human-controlled or governed automation | Restored compliance state and closed control gaps |


>The intentional constraint is not a barrier but the point of engagement. The practitioner shall trace the immutable log output to its origin within the client environment and shall apply appropriate change-management controls via infrastructure remediation (Terraform or cloud consoles) to remediate the control gap, restore compliance with the applicable policy, standard, or control objective, and transition the corresponding ledger entry from red to green.


### 1.2 E8 ML3 — ASD Essential Eight Maturity Level 3

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
```

This eliminates duplicate evidence production and provides a single auditable trail regardless of which framework is the assurance target for a given engagement.

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

## 4. Evidence Model

All index assertions produce evidence committed to the SIRA/IĀTŌ append-only evidence ledger. Evidence is not assembled retrospectively for audits — it exists continuously as a ledger record.

| Property | Implementation |
|---|---|
| **Append-Only** | `UPDATE` and `DELETE` permissions revoked at schema level. Only `INSERT` permitted. |
| **Hash-Chained** | Every entry embeds `SHA-256(preceding_entry)`. Chain integrity is independently verifiable. |
| **Timestamped** | Every entry carries a cryptographically verified temporal marker. Timeline is forensically reliable. |

Evidence packages for IRAP assessors are structured as append-only ledger extracts — not ad-hoc document collections. Control implementation statements are machine-generated from asserted control states, not authored manually.

## 5. Framework Coverage

| Framework | Coverage Basis |
|---|---|
| E8 ML3 | All eight strategies asserted at ML3; evidence structured for IRAP assessor consumption |
| ISM | Controls mapped as enumerated, addressable assurance targets; each modelled as an observable state |
| NZISM | Controls mapped at classification level appropriate to engagement scope |


The full framework crosswalk is maintained in `docs/COMPLIANCE_CROSSWALK.csv`.

## 6. Scope

| Dimension | Statement |
|---|---|
| **Authority** | No index entry constitutes decision-making authority |
| **Scope** | Index coverage is bounded by declared framework obligations |
| **Output nature** | Assertions are diagnostic and audit-ready; they do not substitute for registered assessor judgement |
| **Governance requirement** | All outputs must be interpreted within the governing framework context |

---

***The IĀTŌ codebase, index documentation, and associated artefacts must not be used to underpin coursework content or submitted as original work in any assessed academic context. This is a practitioner artefact. All analytical claims should be traced to their cited primary sources. See `notebooks/DISCLAIMER.md` for full permitted-use terms.***
