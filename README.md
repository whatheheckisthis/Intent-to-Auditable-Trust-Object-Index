
---

# IĀTŌ — Security Controls Index (High-Assurance)

[![Controls](https://img.shields.io/badge/Controls-ISM%20%7C%20SOC2%20%7C%20E8%20ML4-0A66C2?style=flat-square)](https://github.com/whatheheckisthis/Professional-Practice/blob/main/docs/DELIVERY.md)
[![Assurance](https://img.shields.io/badge/Assurance-Auditable%20%2B%20Reproducible-2E7D32?style=flat-square)](https://github.com/whatheheckisthis/Professional-Practice/blob/main/docs/ETHOS.md)
[![Practice](https://img.shields.io/badge/Practice-SecDevOps%20Assurance-333333?style=flat-square)](https://github.com/whatheheckisthis/Professional-Practice)

---

## 1. Purpose

**Scope & Objectives**

The IĀTŌ Security Controls Index defines a structured control environment to support operational security assurance across engineering, platform, and model execution workflows.

**The index is aligned to:**

| Framework                          | Issuing Authority                                  | Type                         | Assurance Scope                                                                                |
| ---------------------------------- | -------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Information Security Manual (ISM)  | Australian Cyber Security Centre                   | Government security standard | Baseline and enhanced controls for system security, risk management, and operational hardening |
| SOC 2 Trust Services Criteria      | American Institute of Certified Public Accountants | Assurance framework          | Controls covering security, availability, processing integrity, confidentiality, and privacy   |
| Essential Eight (Maturity Level 4) | Australian Cyber Security Centre                   | Maturity model               | Advanced resilience benchmark for mitigation strategies and continuous security uplift         |


**The objective of this index is to:**

- Establish traceable control mappings across recognised frameworks
- Enforce evidence-based validation of control operation
- Enable continuous monitoring and repeatable assurance processes
- Provide an audit-ready control baseline for internal and external review

This repository operates as a control definition and evidence reference layer and does not constitute:

A certification artefact
An independent assurance opinion
A substitute for a formal audit or regulatory assessment

---

## 2. Governance Model

### 2.1 Authoritative Sources

| Document    | Location                   | Authority                             |
| ----------- | -------------------------- | ------------------------------------- |
| ETHOS.md    | Professional-Practice/docs | Architecture and design principles    |
| DELIVERY.md | Professional-Practice/docs | Control mappings and engagement model |

**Control Principle:**
Governing documents remain authoritative at the source repository. This index is a **dependent implementation layer** and does not override governance definitions.

---

### 2.2 Scope Boundary

All artefacts within this repository:

* Exist solely to satisfy defined control objectives
* Have no independent governance authority
* Must not extend or reinterpret the governing model

---

## 3. Assurance Architecture

The IĀTŌ assurance model operates as a **two-layer control system**:

| Layer                 | System                | Function                                                          |
| --------------------- | --------------------- | ----------------------------------------------------------------- |
| Quantitative Control  | SIRA                  | Stochastic modelling, stress testing, risk signal generation      |
| Orchestration Control | IĀTŌ-MCP              | Deterministic execution control, audit logging, state enforcement |
| Governance Backbone   | Professional-Practice | Control definitions and assurance framework                       |

**Control Assertion:**
Assurance validity requires both:

* Controlled execution conditions
* Verifiable analytical outputs

Neither layer is independently sufficient.

---

## 4. Control Domains

Controls are structured into four domains:

| Domain                | Prefix   | Objective                           |
| --------------------- | -------- | ----------------------------------- |
| Auditability          | CTRL-AUD | Traceability and evidence integrity |
| Observability         | CTRL-OBS | Telemetry and system visibility     |
| Continuous Monitoring | CTRL-CON | Ongoing control validation          |
| Governance            | CTRL-GOV | Oversight and risk management       |

---

## 5. Controls Matrix

| Control ID  | Control Objective             | ISM Mapping              | SOC 2 Mapping | E8 ML4 |
| ----------- | ----------------------------- | ------------------------ | ------------- | ------ |
| CTRL-AUD-01 | Immutable audit logging       | Event Logging            | CC6, CC7      | ML4    |
| CTRL-AUD-02 | Change traceability           | Change Management        | CC8           | ML4    |
| CTRL-AUD-03 | Evidence retention            | Records Management       | CC2, CC3      | ML4    |
| CTRL-OBS-01 | Service telemetry             | Monitoring               | CC7           | ML4    |
| CTRL-OBS-02 | Alert integrity and fidelity  | Incident Detection       | CC7           | ML4    |
| CTRL-OBS-03 | Time synchronisation          | Time Source Security     | CC7           | ML3    |
| CTRL-CON-01 | Continuous control validation | Assessment               | CC4, CC5      | ML4    |
| CTRL-CON-02 | Vulnerability management      | Vulnerability Management | CC7           | ML4    |
| CTRL-CON-03 | Supply chain assurance        | Provenance               | CC6, CC7      | ML4    |
| CTRL-GOV-01 | Segregation of duties         | Privileged Access        | CC6           | ML4    |
| CTRL-GOV-02 | Exception governance          | Risk Acceptance          | CC3           | ML4    |
| CTRL-GOV-03 | Assurance reporting           | Governance Oversight     | CC2           | ML4    |

### 5.1 SIRA-Control Extensions

| Control ID  | Implementation Detail                                   |
| ----------- | ------------------------------------------------------- |
| CTRL-AUD-01 | Deterministic run audit with seeded outputs             |
| CTRL-AUD-02 | Configuration traceability via TOML version control     |
| CTRL-AUD-03 | Session log retention (`audit/session/*.log`)           |
| CTRL-OBS-01 | Structured pipeline telemetry (stdout)                  |
| CTRL-OBS-02 | Scenario-based signal classification (SELL/HOLD/BREACH) |
| CTRL-CON-01 | Control coverage and gap register                       |
| CTRL-CON-03 | SHA-256 data manifest validation                        |
| CTRL-GOV-01 | Explicit non-goals register                             |
| CTRL-GOV-02 | Evidence gap register                                   |
| CTRL-GOV-03 | Risk governance and challenge register                  |

---

## 6. Control Requirements

### 6.1 Auditability

All control-relevant actions must be:

* Attributable (identity-linked)
* Time-bound (trusted timestamp)
* Tamper-evident

**Minimum Evidence:**

* Change and approval records
* Deployment and commit traceability
* Access and privileged activity logs
* Incident records (where applicable)
* Control test results

---

### 6.2 Observability

Systems must emit structured telemetry enabling full state reconstruction.

**Required Dimensions:**

| Attribute      | Requirement               |
| -------------- | ------------------------- |
| Identity       | Actor attribution         |
| Action         | Executed operation        |
| Timestamp      | Trusted time source       |
| Source         | Origin system             |
| Outcome        | Result status             |
| Correlation ID | Cross-system traceability |

---

### 6.3 Continuous Monitoring

**Control Lifecycle:**

1. Define control objective
2. Implement measurable validation
3. Execute on fixed cadence
4. Track exceptions
5. Revalidate and close

**Monitoring Cadence:**

| Frequency | Scope                                   |
| --------- | --------------------------------------- |
| Daily     | High-risk controls and alerts           |
| Weekly    | Control effectiveness review            |
| Monthly   | Assurance reporting                     |
| Quarterly | Framework alignment and maturity review |

---

## 7. Evidence Model

### 7.1 Core Evidence Types

| Artefact              | Purpose                             | Retention | Owner                |
| --------------------- | ----------------------------------- | --------- | -------------------- |
| Control Design    | Control specification               | 7 years   | Security Engineering |
| Execution Reports     | Control validation results          | 3 years   | Platform/SRE         |
| Change Records        | Full change lifecycle trace         | 7 years   | Engineering          |
| Incident Evidence     | Response and remediation            | 7 years   | Security Operations  |
| Access Reviews        | Privilege validation                | 7 years   | IAM                  |
| Vulnerability Reports | Risk identification and remediation | 3 years   | Security             |

---

### 7.2 SIRA Evidence Mapping

| Control     | Artefact             | Location                             |
| ----------- | -------------------- | ------------------------------------ |
| CTRL-AUD-01 | Session logs         | `audit/session/*.log`                |
| CTRL-AUD-02 | Config history       | `config/sira.toml`                   |
| CTRL-AUD-03 | Compliance crosswalk | `docs/COMPLIANCE_CROSSWALK.csv`      |
| CTRL-OBS-01 | Execution logs       | `run_all.R`                          |
| CTRL-OBS-02 | Signal outputs       | `output/*`                           |
| CTRL-CON-01 | Gap register         | `docs/SIRA_EVIDENCE_GAP_REGISTER.md` |
| CTRL-CON-03 | Data manifest        | `data/manifest/data_manifest.toml`   |
| CTRL-GOV-01 | Non-goals register   | `notebooks/*`                        |
| CTRL-GOV-02 | Risk register        | `docs/RISK_COMMITTEE.md`             |

---

## 8. Change Control and Reproducibility

All assurance outputs must record:

* Commit hash and branch
* Applicable control IDs
* Framework mappings
* Execution procedure
* Environment and reviewer

**Control Objective:**
Ensure all results are **reproducible, reviewable, and audit-ready**.

---

## 9. Scope Definition

### In Scope

* Framework-aligned control mappings (ISM, SOC 2, E8 ML4)
* Auditability, observability, and monitoring controls
* Evidence and artefact model
* SIRA analytical control layer
* IĀTŌ-MCP execution governance layer

### Out of Scope

* Product implementation not governed by this index
* Legal or regulatory interpretation
* Certification or audit opinions
* Live data outputs and calibration artefacts

---

## 10. Assurance Positioning

This index supports **operational assurance**, defined as:

* Continuous control execution
* Evidence-backed validation
* Runtime governance and telemetry

It is distinct from product certification frameworks (e.g. Common Criteria) and must not be interpreted as equivalent.

---

## 11. Control Principles

* Control ownership is formally assigned
* Evidence is mandatory for all control assertions
* Segregation of duties is enforced
* Monitoring operates on defined cadence
* Documentation is version-controlled and evidence-linked

---

## 12. Terminology (Selected)

| Term              | Definition                                      |
| ----------------- | ----------------------------------------------- |
| Assurance Case    | Evidence-supported argument of system security  |
| Auditability      | Ability to reconstruct actions from records     |
| Control Objective | Intended security outcome                       |
| Evidence Artefact | Verifiable proof of control operation           |
| Residual Risk     | Risk remaining post-control                     |
| Traceability      | End-to-end linkage across controls and evidence |
| Binary Assertion  | Pass/fail control state record                  |
| Provenance        | Verifiable origin of artefacts                  |

---

