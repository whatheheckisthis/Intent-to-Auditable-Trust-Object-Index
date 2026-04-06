# SIRA — Stochastic Invalidation and Risk Architecture

## Executive Summary

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
is logged as a binary assertion record. It is the
technical control that prevents the analytical layer
from operating outside its governed boundary.

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
superseding the operating model or engagement
framework they define.

| Layer | System | Role | Location |
|---|---|---|---|
| Quantitative control | SIRA | Stochastic modelling, stress testing, signal generation | This repository |
| Orchestration control | IĀTŌ-MCP | Governed execution gateway, audit log, binary assertion | [`IATO-Controls-Index`](https://github.com/whatheheckisthis/Intent-to-Auditable-Trust-Object-v7) |
| Governance backbone | Professional-Practice | Engagement model, ETHOS, DELIVERY | [`Professional-Practice`](https://github.com/whatheheckisthis/Professional-Practice) |

**Primary documents:**

- [`Professional-Practice/docs/ETHOS.md`](https://github.com/whatheheckisthis/Professional-Practice/blob/main/docs/ETHOS.md)
  — architectural philosophy and stack rationale
- [`Professional-Practice/docs/DELIVERY.md`](https://github.com/whatheheckisthis/Professional-Practice/blob/main/docs/DELIVERY.md)
  — engagement model, delivery artefacts, and GRC
  control mappings

Read those two documents first. Everything else in
this repository is the operational substrate that
supports them.

## Governance directionality

SIRA is a governed delivery instance, not the
governing layer. The authoritative architectural
philosophy and engagement model remain in
`Professional-Practice/docs/ETHOS.md` and
`Professional-Practice/docs/DELIVERY.md`. SIRA
implements and evidences those standards through
quantitative artefacts (for example, the compliance
crosswalk, risk committee register, and run logs)
without redefining the governing framework.

## Methodology

SIRA executes scenario-conditioned stress testing across governed parameters declared in
`config/sira.toml`.

## Governance artefacts

| Artefact | Location | IĀTŌ Control | Purpose |
|---|---|---|---|
| Compliance crosswalk | `docs/COMPLIANCE_CROSSWALK.csv` | CTRL-AUD-03 | Component-level coverage assessment across SR 11-7, FRTB, Basel III IRB, BCBS 239, SOC 2, E8 ML4, ISM |
| Risk committee register | `docs/RISK_COMMITTEE.md` | CTRL-GOV-03 | Pre-structured challenge register across model scope, signal integrity, model risk, and operational controls |
| Defense appendix | `docs/DEFENSE_APPENDIX.md` | CTRL-GOV-03 | Epsilon and sigma as co-primary defense objects; controls matrix mapped to ISM, SOC 2, E8 ML4 |
| Credit risk layer | `docs/CREDIT_RISK_LAYER.md` | CTRL-CON-01 | LGD/PD framing, IRB boundary, distribution rationale, committee preparation |
| Evidence gap register | `docs/SIRA_EVIDENCE_GAP_REGISTER.md` | CTRL-GOV-02 | Governed declaration of three pre-data stage gaps with closure paths |
| Data manifest | `data/manifest/data_manifest.toml` | CTRL-CON-03 | Controlled input registry with SHA-256, lineage references, and approval fields |
| Non-goals register | `notebooks/sira_non_goals_table.md` | CTRL-GOV-01 | NG-001 to NG-024 — runtime boundary declaration |
| Assumptions registry | `notebooks/SIRA_ASSUMPTIONS.md` | CTRL-CON-01 | Model criteria, units, formulae, derivation chain |
| Session audit log | `audit/session/*.log` | CTRL-AUD-01 | Machine-generated timestamped execution records |

## Five stress scenarios

| Scenario | Stress mechanism | Distribution | Vol multiplier | IĀTŌ control |
|---|---|---|---|---|
| Baseline | Normal market functioning | Beta | 1.00× | CTRL-OBS-01 |
| Liquidity Crunch | Elevated vol, compressed recoveries | Beta | shock_multiplier | CTRL-OBS-02 |
| Jurisdictional Freeze | Recovery collapses toward ruin threshold | Beta | shock_multiplier | CTRL-OBS-02 |
| Counterparty Default | Gap-down valuation shock | Power Law | exponent-implied | CTRL-OBS-02 |
| Hyper-Inflationary | FX devaluation impairs real bond value | Power Law | fx_devaluation | CTRL-OBS-02 |

All scenario parameters — shape, exponent, ruin
threshold, shock multiplier, FX devaluation, vol
multiplier — declared in `config/sira.toml`. No
scenario definition exists outside the TOML.
CTRL-AUD-02 (change traceability) governs all
parameter updates.

## Non-goals

> **Non-Goals Register:** The full runtime boundary
> declaration for this programme is maintained as a
> governed artefact at
> [`notebooks/sira_non_goals_table.md`](notebooks/sira_non_goals_table.md).
> That document is the authoritative source.
> Reproductions or summaries elsewhere in this
> repository are non-authoritative and must not be
> treated as complete.
>
> The IĀTŌ Controls Index
> ([`Intent-to-Auditable-Trust-Object-v7`](https://github.com/whatheheckisthis/Intent-to-Auditable-Trust-Object-v7))
> declares the governance boundary within which
> SIRA operates. Controls CTRL-GOV-01 through
> CTRL-GOV-03 govern scope enforcement, exception
> management, and assurance reporting for this layer.

SIRA is an analytical risk instrument and is not a compliance attestation (NG-004).
