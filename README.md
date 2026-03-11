# High-Assurance Security Controls Index

This repository is organized as a control index for high-assurance engineering and assurance activities.

It maps controls and evidence expectations across:

- **ISM** (Australian Information Security Manual)
- **SOC 2** (Trust Services Criteria)
- **E8 ML4** (Engineering maturity level 4 expectations)
- **IATO series** (`v2`, `v5`, `v7`)


---

## Purpose and Audience

This index supports teams building or evaluating security-sensitive tooling where:

- design controls must be **traceable to recognized frameworks**,
- operations must be **auditable and observable**,
- ongoing compliance requires **continuous monitoring**, and
- assurance claims must be **reproducible and evidence-backed**.

Primary audience:

- Security engineering teams
- Platform/SRE teams
- Internal audit and compliance teams
- External assessors and accreditation stakeholders

---

## Version Lineage 

The IATO stream is incremental and should be interpreted as one lineage.

- **v2**: baseline milestone
- **v5**: control refinement and operational hardening milestone
- **v7**: current reference milestone

### Version precedence

- `v7` supersedes `v5`
- `v5` supersedes `v2`

### Version use guidance

- Use `v2` for historical baseline comparison.
- Use `v5` for transition and maturity uplift analysis.
- Use `v7` as the default reference for active operations and assurance claims.

---

## Control Mapping 

Each control in this index is defined by:

1. **Control objective** (what risk is reduced)
2. **Implementation expectation** (what must exist in practice)
3. **Evidence expectation** (what proves it works)
4. **Mapped references** (ISM, SOC 2, E8 ML4, IATO versions)

Control IDs use a practical format:

- `CTRL-AUD-*` for auditability
- `CTRL-OBS-*` for observability
- `CTRL-CON-*` for continuous monitoring
- `CTRL-GOV-*` for governance/assurance practice

---

## Controls Matrix

| Control ID | Control Objective | ISM Mapping | SOC 2 Mapping | E8 ML4 Mapping | IATO v2 | IATO v5 | IATO v7 |
|---|---|---|---|---|---|---|---|
| CTRL-AUD-01 | Immutable audit logging | Event logging, integrity protection | CC7 (system operations), CC6 (logical access) | Managed telemetry baseline | Partial | Full | Full + automated verification |
| CTRL-AUD-02 | Change traceability | Configuration/change management | CC8 (change management) | Versioned change gates | Partial | Full | Full + policy-as-code |
| CTRL-AUD-03 | Evidence retention lifecycle | Records management, retention | CC2/CC3 governance & oversight | Evidence quality controls | Partial | Full | Full + retention enforcement |
| CTRL-OBS-01 | End-to-end service telemetry | Monitoring and event collection | CC7 monitoring controls | SLO-driven instrumentation | Partial | Full | Full + coverage SLI tracking |
| CTRL-OBS-02 | Alert fidelity and triage | Incident detection requirements | CC7 anomaly detection | Runbook maturity and response loops | Partial | Full | Full + false-positive tuning |
| CTRL-OBS-03 | Time synchronization integrity | Time source security | CC7 reliable monitoring context | Correlation-ready data quality | Full | Full | Full + drift alerts |
| CTRL-CON-01 | Continuous control validation | Security assessment cadence | CC4/CC5 control monitoring | Automated assurance pipelines | Partial | Full | Full + scheduled attestation |
| CTRL-CON-02 | Vulnerability and exposure management | Vulnerability management requirements | CC7 risk detection | Risk burn-down governance | Partial | Full | Full + risk SLA enforcement |
| CTRL-CON-03 | Dependency and supply-chain monitoring | Software assurance and provenance | CC6/CC7 | Build provenance and SBOM discipline | Partial | Full | Full + signed provenance checks |
| CTRL-GOV-01 | Segregation of duties | Privileged access governance | CC6 control activities | Multi-party approval gates | Partial | Full | Full + preventive controls |
| CTRL-GOV-02 | Exception and waiver governance | Security risk acceptance controls | CC3 risk management | Exception lifecycle maturity | Partial | Full | Full + expiry/renewal automation |
| CTRL-GOV-03 | Assurance reporting cadence | Security governance oversight | CC2 communication and reporting | KPI/KRI review rhythm | Partial | Full | Full + board-level reporting pack |

---

## Auditability Requirements

### Core requirements

- All security-relevant actions are attributable to identity, time, and source.
- Audit records are tamper-evident and protected from unauthorized modification.
- Every control claim has at least one reproducible evidence artifact.

### Minimum evidence set

- Change request + approval trail
- Deployment record and commit hash
- Access logs and privileged action logs
- Incident records (when applicable)
- Control test results and reviewer sign-off

---

## Observability Requirements

### Core requirements

- Structured logs, metrics, and traces are enabled for critical paths.
- Service and control health indicators are measurable and versioned.
- Alert routing and escalation paths are explicit and tested.

### Mandatory telemetry dimensions

- **Who** performed action
- **What** action occurred
- **When** it occurred (trusted time)
- **Where** it originated
- **Outcome** (success/failure + reason)
- **Correlation ID** for cross-system traceability

---

## Continuous Monitoring Requirements

### Control lifecycle

1. Define control and risk linkage.
2. Implement measurable control checks.
3. Execute checks on a fixed cadence.
4. Track exceptions with owner and due date.
5. Re-test and close with evidence.

### Monitoring cadences

- **Daily:** high-risk drift checks, exposure scans, critical alert review
- **Weekly:** control effectiveness review, incident trend review
- **Monthly:** assurance summary, exception status review
- **Quarterly:** framework mapping recalibration and maturity assessment

---

## Evidence and Artifact Index

| Evidence Type | Description | Owner | Retention | Review Frequency |
|---|---|---|---|---|
| Control design record | Defines objective, implementation, test method | Security Engineering | 7 years | Quarterly |
| Control execution report | Result of scheduled control checks | Platform/SRE | 3 years | Monthly |
| Change audit trail | Ticket, approval, commit, deployment chain | Engineering | 7 years | Monthly |
| Incident response evidence | Detection, triage, containment, lessons learned | Security Operations | 7 years | Monthly |
| Access governance evidence | Access review and privilege attestation outcomes | IAM/Security | 7 years | Quarterly |
| Vulnerability management report | Detection, prioritization, remediation status | Security + Engineering | 3 years | Weekly |

---

## Professional Practice Expectations

High-assurance professional practice requires:

- **Control ownership clarity:** each control has a named accountable owner.
- **Separation of duties:** no single actor can define, approve, and deploy high-risk changes alone.
- **Documentation quality:** procedures are versioned, reviewable, and linked to evidence.
- **Repeatable validation:** control tests run consistently and produce reviewable outputs.
- **Ethical and legal alignment:** practice aligns to policy, contract, and regulatory obligations.

---

## Scope

In scope for this index:

- Control mapping structure for ISM, SOC 2, E8 ML4, and IATO v2/v5/v7
- Auditability, observability, and continuous monitoring expectations
- Evidence model and assurance-oriented documentation discipline

## Out of Scope

Out of scope for this index:

- Product-specific implementation code or deployment scripts
- Jurisdiction-specific legal interpretation
- Certification decision authority or auditor sign-off decisions

## Boundaries

Boundary conditions for applying this index:

- Applies to security-sensitive tooling and supporting delivery/operations workflows.
- Does not replace organization-specific policy or regulator directives.
- Must be tailored by system classification, threat model, and data sensitivity.

## Non-Goals

This index does **not** aim to:

- Guarantee certification outcomes by itself
- Replace formal risk assessments
- Substitute assessor judgment
- Serve as a complete secure development standard

---

## Common Criteria vs Operational Assurance

To avoid category confusion:

- **Common Criteria (CC):** product security evaluation framework focused on assurance packages and evaluated configurations.
- **Operational assurance in this index:** ongoing governance, telemetry, control operation, and evidence quality in live environments.

This repository focuses on **operational assurance practice** and framework-aligned control traceability, not product certification under Common Criteria.

---

## Glossary of Security Literature Terms

- **Assurance Case:** structured argument, supported by evidence, that a system is acceptably secure for a context.
- **Auditability:** ability to reconstruct actions and decisions from trustworthy records.
- **Attestation:** formal statement asserting control status, often signed by an accountable role.
- **Control Objective:** specific security outcome a control is intended to achieve.
- **Control Owner:** role accountable for design and operation of a control.
- **Continuous Monitoring:** ongoing collection and analysis of security-relevant signals.
- **Evidence Artifact:** tangible output used to validate that a control exists and works.
- **Exception (Waiver):** approved, time-bounded deviation from required control behavior.
- **High Assurance:** elevated confidence based on rigorous design, operation, and verification.
- **IATO:** versioned internal assurance track used in this repository (`v2`, `v5`, `v7`).
- **KPI/KRI:** key performance/risk indicators used to track effectiveness and exposure.
- **Observability:** ability to infer internal system state from emitted telemetry.
- **Policy-as-Code:** machine-enforceable policy implementation in CI/CD or runtime controls.
- **Provenance:** verifiable origin and transformation history of software artifacts.
- **Residual Risk:** risk remaining after control implementation.
- **SOC 2:** attestation framework based on trust services criteria.
- **ISM:** Australian government security control guidance framework.
- **Traceability:** ability to link requirements, changes, controls, and evidence end-to-end.

---

## Change Control and Reproducibility

For any assurance claim derived from this index, record:

1. Commit hash and branch reference
2. Control IDs involved
3. Framework mapping references used
4. Exact commands or procedures executed
5. Date, environment, and responsible reviewer

This ensures outcomes remain reviewable, reproducible, and audit-ready.
