# IĀTŌ — High-Assurance Security Controls Index

[![Controls](https://img.shields.io/badge/Controls-ISM%20%7C%20SOC2%20%7C%20E8%20ML4-0A66C2?style=flat-square)](https://github.com/whatheheckisthis/Professional-Practice/blob/main/docs/DELIVERY.md)
[![Assurance](https://img.shields.io/badge/Assurance-Auditable%20%2B%20Reproducible-2E7D32?style=flat-square)](https://github.com/whatheheckisthis/Professional-Practice/blob/main/docs/ETHOS.md)
[![Practice](https://img.shields.io/badge/Practice-SecDevOps%20Contractor-333333?style=flat-square)](https://github.com/whatheheckisthis/Professional-Practice)

---

## Intent

This repository is the control index for the IĀTŌ assurance programme. It is an operating
reference, not a certification package. The scope is framework-aligned control traceability
across active delivery and operations workflows — not product evaluation under Common Criteria.

The IĀTŌ Index is the technical proof layer for the practice defined at
[`whatheheckisthis/Professional-Practice`](https://github.com/whatheheckisthis/Professional-Practice).
Read the following documents for the engagement model, architectural philosophy, and delivery
artefacts that this index supports:

- [`Professional-Practice / docs/ETHOS.md`](https://github.com/whatheheckisthis/Professional-Practice/blob/main/docs/ETHOS.md) — architectural philosophy and stack rationale
- [`Professional-Practice / docs/DELIVERY.md`](https://github.com/whatheheckisthis/Professional-Practice/blob/main/docs/DELIVERY.md) — engagement model, delivery artefacts, and GRC control mappings
- [`Professional-Practice / README.md`](https://github.com/whatheheckisthis/Professional-Practice/blob/main/README.md) — practice statement and contractor engagement scope

Controls and evidence expectations are mapped across:

- ISM — Australian Information Security Manual
- SOC 2 — Trust Services Criteria
- E8 ML4 — Essential Eight Maturity Level 4

---

## Programme architecture

**Scope:** This repository is bounded by the governing
documents below. All operative content — determinative
schemas, versioned scripts, and auditable artefacts —
exists exclusively to satisfy the obligations defined
within them and carries no independent scope beyond
that purpose. Any work product, configuration, script,
or governance document outside those boundaries is
outside the declared scope of this practice and must
not be interpreted as extending, modifying, or
superseding the operating model or engagement framework
they define.

| Document | Location | Governs |
|---|---|---|
| ETHOS.md | [`Professional-Practice/docs/ETHOS.md`](https://github.com/whatheheckisthis/Professional-Practice/blob/main/docs/ETHOS.md) | Architectural philosophy and stack rationale |
| DELIVERY.md | [`Professional-Practice/docs/DELIVERY.md`](https://github.com/whatheheckisthis/Professional-Practice/blob/main/docs/DELIVERY.md) | Engagement model, delivery artefacts, and GRC control mappings |

---

## Two-layer assurance architecture

SIRA (Stochastic Invalidation and Risk Architecture)
is the quantitative control layer — a governed
stochastic modelling pipeline executing
scenario-conditioned stress testing, distressed bond
recovery simulation, and binary risk signal generation
across five defined adverse conditions. It produces
attributable, scenario-specific outputs for risk
triage, solvency surveillance, and deal intelligence
review, with full traceability across control
objectives mapped to SR 11-7, FRTB, Basel III IRB,
BCBS 239, SOC 2, and Essential Eight ML4.

IĀTŌ-MCP (Input-Action-Trace-Output Model Context
Protocol) is the orchestration control layer — a
governed execution gateway implemented as a hardened
TypeScript/Node.js server operating over the Model
Context Protocol. It enforces deterministic, auditable
action execution across the workspace: container
lifecycle management, pre-flight validation, state
assertion, and decommission authority. It does not
infer configuration from context. It does not permit
uncontrolled execution. Every action is enumerated,
every invocation is timestamped, and every outcome
is logged as a binary assertion record.

Together, SIRA and IĀTŌ-MCP constitute a two-layer
assurance architecture: SIRA produces the evidence;
IĀTŌ-MCP governs the conditions under which that
evidence can be produced. Neither layer is
independently sufficient. A quantitative engine
without a governed execution boundary is an
uncontrolled model. A governed execution boundary
without an analytical engine produces audit records
of nothing. The architecture is the intersection
of both.

| Layer | System | Role | Repository |
|---|---|---|---|
| Quantitative control | SIRA | Stochastic modelling, stress testing, signal generation | [`Stochastic-Invalidation-Risk-Architecture`](https://github.com/whatheheckisthis/Stochastic-Invalidation-Risk-Architecture) |
| Orchestration control | IĀTŌ-MCP | Governed execution gateway, audit log, binary assertion | This repository |
| Governance backbone | Professional-Practice | Engagement model, ETHOS, DELIVERY | [`Professional-Practice`](https://github.com/whatheheckisthis/Professional-Practice) |

---

## Ethos

```
IĀTŌ Control Index Ethos
├── Purpose
│   ├── Control traceability to recognised frameworks
│   ├── Auditable and observable operations
│   ├── Continuous monitoring with evidence-backed claims
│   └── Reproducible assurance outputs — not claim-based assertions
├── Audience
│   ├── Security engineering teams
│   ├── Platform and SRE teams
│   ├── Internal audit and compliance functions
│   └── External assessors and accreditation stakeholders
├── Control Surface
│   ├── CTRL-AUD-* — auditability
│   ├── CTRL-OBS-* — observability
│   ├── CTRL-CON-* — continuous monitoring
│   └── CTRL-GOV-* — governance and assurance practice
└── Version Lineage
    ├── v2 → baseline milestone
    ├── v5 → control refinement and operational hardening
    └── v7 → current reference (default for active operations)
```

## Operating Themes

* Control ownership is explicit — each control has a named accountable role.
* Evidence is reproducible — every assurance claim traces to a verifiable artefact.
* Separation of duties is enforced — no single actor defines, approves, and deploys high-risk changes.
* Monitoring cadences are fixed — not ad hoc.
* Documentation is versioned and linked to evidence — not narrative.

---

## Version Lineage

The IĀTŌ stream is a single incremental lineage. Versions are not independent releases.

| Version | Role | Repo |
|---|---|---|
| v2 | Historical baseline | [Intent-to-Auditable-Trust-Object-v2](https://github.com/whatheheckisthis/Intent-to-Auditable-Trust-Object-v2) |
| v5 | Transition reference | [Intent-to-Auditable-Trust-Object-v5](https://github.com/whatheheckisthis/Intent-to-Auditable-Trust-Object-v5) |
| v7 | Active reference | [Intent-to-Auditable-Trust-Object-v7](https://github.com/whatheheckisthis/Intent-to-Auditable-Trust-Object-v7) |
| SIRA | Quantitative control layer | [`Stochastic-Invalidation-Risk-Architecture`](https://github.com/whatheheckisthis/Stochastic-Invalidation-Risk-Architecture) |

---

## Controls Matrix

| Control ID | Objective | ISM | SOC 2 | E8 ML4 |
|---|---|---|---|---|
| CTRL-AUD-01 | Immutable audit logging | Event logging | CC6, CC7 | ML4 |
| CTRL-AUD-02 | Change traceability | Change management | CC8 | ML4 |
| CTRL-AUD-03 | Evidence retention | Records management | CC2, CC3 | ML4 |
| CTRL-OBS-01 | Service telemetry | Monitoring | CC7 | ML4 |
| CTRL-OBS-02 | Alert fidelity | Incident detection | CC7 | ML4 |
| CTRL-OBS-03 | Time synchronisation | Time source security | CC7 | ML3 |
| CTRL-CON-01 | Continuous control validation | Assessment cadence | CC4, CC5 | ML4 |
| CTRL-CON-02 | Vulnerability management | Vuln management | CC7 | ML4 |
| CTRL-CON-03 | Supply-chain monitoring | Software provenance | CC6, CC7 | ML4 |
| CTRL-GOV-01 | Segregation of duties | Privileged access | CC6 | ML4 |
| CTRL-GOV-02 | Exception governance | Risk acceptance | CC3 | ML4 |
| CTRL-GOV-03 | Assurance reporting | Governance oversight | CC2 | ML4 |
| CTRL-AUD-01 | SIRA: Immutable run audit — seeded deterministic output | Event logging | CC6, CC7 | ML4 |
| CTRL-AUD-02 | SIRA: TOML parameter change traceability — config diff evidence | Change management | CC8 | ML4 |
| CTRL-AUD-03 | SIRA: Session log retention — `audit/session/*.log` | Records management | CC2, CC3 | ML4 |
| CTRL-OBS-01 | SIRA: Terminal emission — structured stdout per pipeline stage | Monitoring | CC7 | ML4 |
| CTRL-OBS-02 | SIRA: SELL/HOLD/BREACH signal fidelity — scenario-level alert | Incident detection | CC7 | ML4 |
| CTRL-CON-01 | SIRA: Crosswalk coverage assessment — per-component gap register | Assessment cadence | CC4, CC5 | ML4 |
| CTRL-CON-03 | SIRA: SHA-256 manifest verification — `data/manifest/data_manifest.toml` | Software provenance | CC6, CC7 | ML4 |
| CTRL-GOV-01 | SIRA: Non-goals register — explicit scope boundary declaration | Privileged access | CC6 | ML4 |
| CTRL-GOV-02 | SIRA: Evidence gap register — `docs/SIRA_EVIDENCE_GAP_REGISTER.md` | Risk acceptance | CC3 | ML4 |
| CTRL-GOV-03 | SIRA: Risk committee register — pre-structured challenge and response | Governance oversight | CC2 | ML4 |

---

## Auditability Requirements

All security-relevant actions are attributable to identity, time, and source. Audit records are
tamper-evident. Every control claim has at least one reproducible evidence artefact.

**Minimum evidence set:**

- Change request and approval trail
- Deployment record and commit hash
- Access logs and privileged action logs
- Incident records (where applicable)
- Control test results and reviewer sign-off

---

## Observability Requirements

Structured logs, metrics, and traces are enabled for critical paths. Service and control health
indicators are measurable and versioned. Alert routing and escalation paths are explicit and tested.

**Mandatory telemetry dimensions:**

| Dimension | Description |
|---|---|
| Who | Identity of actor |
| What | Action performed |
| When | Trusted timestamp |
| Where | Origin system or source |
| Outcome | Success/failure with reason |
| Correlation ID | Cross-system traceability reference |

---

## Continuous Monitoring

**Control lifecycle:**

1. Define control and risk linkage.
2. Implement measurable control checks.
3. Execute checks on a fixed cadence.
4. Track exceptions with owner and due date.
5. Re-test and close with evidence.

**Monitoring cadences:**

| Cadence | Scope |
|---|---|
| Daily | High-risk drift checks, exposure scans, critical alert review |
| Weekly | Control effectiveness review, incident trend review |
| Monthly | Assurance summary, exception status review |
| Quarterly | Framework mapping recalibration, maturity assessment |

---

## Evidence and Artefact Index

| Evidence Type | Description | Owner | Retention | Review Frequency |
|---|---|---|---|---|
| Control design record | Objective, implementation method, test criteria | Security Engineering | 7 years | Quarterly |
| Control execution report | Result of scheduled control checks | Platform/SRE | 3 years | Monthly |
| Change audit trail | Ticket, approval, commit, deployment chain | Engineering | 7 years | Monthly |
| Incident response evidence | Detection, triage, containment, lessons learned | Security Operations | 7 years | Monthly |
| Access governance evidence | Access review and privilege attestation outcomes | IAM/Security | 7 years | Quarterly |
| Vulnerability management report | Detection, prioritisation, remediation status | Security + Engineering | 3 years | Weekly |


## SIRA evidence artefact index

The following artefacts are produced by the SIRA
quantitative control layer and satisfy evidence
requirements declared in the IĀTŌ Controls Matrix.

| IĀTŌ Control | SIRA Artefact | Location | Evidence type | Owner |
|---|---|---|---|---|
| CTRL-AUD-01 | Session audit log | `audit/session/*.log` | Machine-generated | R |
| CTRL-AUD-01 | Seeded run metadata | `output/capital_stack_metadata.rds` | Machine-generated | R |
| CTRL-AUD-02 | TOML configuration diff | `config/sira.toml` (git history) | Version-controlled | R |
| CTRL-AUD-03 | Compliance crosswalk | `docs/COMPLIANCE_CROSSWALK.csv` | Version-controlled | R |
| CTRL-OBS-01 | Pipeline execution log | `run_all.R` stdout | Machine-generated | R |
| CTRL-OBS-01 | Scenario visualisation | `output/sell_hold_signals.png` | Machine-generated | R |
| CTRL-OBS-02 | SELL/HOLD signal table | `output/capital_stack_spread.png` | Machine-generated | R |
| CTRL-CON-01 | Evidence gap register | `docs/SIRA_EVIDENCE_GAP_REGISTER.md` | Version-controlled | R |
| CTRL-CON-01 | Assumptions registry | `notebooks/SIRA_ASSUMPTIONS.md` | Version-controlled | R |
| CTRL-CON-03 | Data manifest | `data/manifest/data_manifest.toml` | Version-controlled | O |
| CTRL-GOV-01 | Non-goals register | `notebooks/sira_non_goals_table.md` | Version-controlled | R |
| CTRL-GOV-02 | Risk committee register | `docs/RISK_COMMITTEE.md` | Version-controlled | R |
| CTRL-GOV-03 | Defense appendix | `docs/DEFENSE_APPENDIX.md` | Version-controlled | R |

Owner key: R = Repository (produced by engine) |
O = Operator (produced by deploying organisation)

---

## Change Control and Reproducibility

For any assurance claim derived from this index, record:

- Commit hash and branch reference
- Control IDs involved
- Framework mapping references used
- Exact commands or procedures executed
- Date, environment, and responsible reviewer

This ensures outcomes remain reviewable, reproducible, and audit-ready. Control IDs and
cross-walk references align to [`docs/governance/control-crosswalk.csv`](https://github.com/whatheheckisthis/Professional-Practice/blob/6cc883965fb396be931307231f0487ce9ceb9147/docs/governance/control-crosswalk.csv#L4) and
[`Professional-Practice / docs/DELIVERY.md`](https://github.com/whatheheckisthis/Professional-Practice/blob/main/docs/DELIVERY.md).

---

## Scope

**In scope:**

- Control mapping structure for ISM, SOC 2, E8 ML4,
  and IĀTŌ v2/v5/v7
- Auditability, observability, and continuous
  monitoring requirements
- Evidence model and assurance-oriented documentation
  discipline
- SIRA quantitative control layer — stochastic
  modelling pipeline, signal generation, and
  compliance crosswalk artefacts
- IĀTŌ-MCP orchestration control layer — governed
  execution gateway, binary assertion log, and
  pre-flight validation

**Out of scope:**

- Product-specific implementation code or deployment
  scripts not governed by this index
- Jurisdiction-specific legal interpretation
- Certification decision authority or auditor sign-off
- Executed model outputs (pre-data stage — see
  `docs/SIRA_EVIDENCE_GAP_REGISTER.md EG-001`)
- Empirical distribution calibration (operator action
  item — see `docs/SIRA_EVIDENCE_GAP_REGISTER.md
  EG-002`)
- Backtesting evidence (operator action item — see
  `docs/SIRA_EVIDENCE_GAP_REGISTER.md EG-003`)

**Boundary conditions:**

- Applies to security-sensitive tooling and supporting
  delivery and operations workflows
- Does not replace organisation-specific policy or
  regulator directives
- Must be tailored by system classification, threat
  model, and data sensitivity
- SIRA outputs are analytical stress instrumentation —
  not regulatory capital models, not compliance
  attestations, not investment advice
  (see `notebooks/sira_non_goals_table.md`)

---

## Common Criteria vs Operational Assurance

These are distinct categories. Common Criteria is a product security evaluation framework —
assurance packages, evaluated configurations, certification outcomes. This index addresses
operational assurance: ongoing governance, telemetry, control operation, and evidence quality
in live environments. The two are not interchangeable and should not be treated as equivalent
evidence bodies.

---

## Security Terminology

| Term | Definition |
|---|---|
| Assurance Case | Structured argument, supported by evidence, that a system is acceptably secure for a given context |
| Attestation | Formal statement asserting control status, typically signed by an accountable role |
| Auditability | Ability to reconstruct actions and decisions from trustworthy records |
| Control Objective | Specific security outcome a control is intended to achieve |
| Control Owner | Role accountable for the design and operation of a control |
| Continuous Monitoring | Ongoing collection and analysis of security-relevant signals |
| Evidence Artefact | Tangible output used to validate that a control exists and functions |
| Exception (Waiver) | Approved, time-bounded deviation from required control behaviour |
| High Assurance | Elevated confidence based on rigorous design, operation, and verification |
| KPI/KRI | Key performance and risk indicators used to track effectiveness and exposure |
| Observability | Ability to infer internal system state from emitted telemetry |
| Policy-as-Code | Machine-enforceable policy implementation in CI/CD or runtime controls |
| Provenance | Verifiable origin and transformation history of software artefacts |
| Residual Risk | Risk remaining after control implementation |
| Traceability | Ability to link requirements, changes, controls, and evidence end-to-end |
| Stochastic Invalidation | The process by which scenario-conditioned recovery draws fall below the declared ruin threshold, triggering a SELL signal. The invalidation event is the primary output of the SIRA analytical layer. |
| Binary Assertion | A logged control state record with result 1 (pass) or 0 (fail). The compliance state of an engagement is the Boolean AND of all binary assertions. No partial states are valid. |
| Ruin Threshold | The scenario-specific recovery floor declared in `config/sira.toml`. A recovery at or below this value is classified as a ruin event. Threshold governance is CTRL-GOV-02. |
| Signal Triage | The SELL/HOLD classification produced per asset per scenario by the SIRA engine. Pre-trade analytical output only — not an execution instruction (NG-002). |
| Epsilon | The per-step stochastic shock in the invalidation simulation. The highest-leverage source of local stochastic instability. Primary defense object alongside sigma. Governed by CTRL-OPT-* controls in `docs/DEFENSE_APPENDIX.md`. |
| Governed Execution Boundary | The constraint surface enforced by IĀTŌ-MCP. Claude Code can invoke exactly six enumerated actions. No others exist. Unknown action strings halt immediately and are logged. |
| Pre-data Stage | The lifecycle phase in which the SIRA engine is governed at the architecture and documentation layer prior to live data ingestion. Three evidence gaps (EG-001 to EG-003) are declared for this stage. |
