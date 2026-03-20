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

- Control mapping structure for ISM, SOC 2, E8 ML4, and IĀTŌ v2/v5/v7
- Auditability, observability, and continuous monitoring requirements
- Evidence model and assurance-oriented documentation discipline

**Out of scope:**

- Product-specific implementation code or deployment scripts
- Jurisdiction-specific legal interpretation
- Certification decision authority or auditor sign-off

**Boundary conditions:**

- Applies to security-sensitive tooling and supporting delivery/operations workflows
- Does not replace organisation-specific policy or regulator directives
- Must be tailored by system classification, threat model, and data sensitivity

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
