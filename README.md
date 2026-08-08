# IĀTŌ — Identity Assurance & Auditable Trust Object

![Identity Engineering](https://img.shields.io/badge/Practice-Identity%20Engineering-blue)
![IGA](https://img.shields.io/badge/Domain-Identity%20Governance%20%26%20Administration-blue)
![IAM](https://img.shields.io/badge/Focus-IAM%20%7C%20Access%20Governance-blue)
![Security](https://img.shields.io/badge/Assurance-ISM%20%7C%20NZISM-blue)

## Overview

IĀTŌ is an identity assurance framework for the structured representation, evaluation, and evidencing of identity and access states across enterprise IAM environments.

The project applies policy-as-code and formal control assertions to identity governance and access-control domains, including Identity Governance and Administration (IGA), entitlement management, access certification, Segregation of Duties (SoD), privileged access, authentication, authorisation, and identity migration assurance.

>Operates over established enterprise identity and access relationships, providing a machine-verifiable assurance wrapper for evaluating control state, entitlement relationships, and governance conditions against defined security requirements.


The project is aligned with practical IAM use cases involving:

* Microsoft Entra ID
* Active Directory
* SailPoint IGA
* Azure RBAC
* Conditional Access
* Identity and entitlement data
* Access certification
* Entitlement governance
* Segregation of Duties
* Privileged access
* Federation and authentication
* Cloud identity migration
* IAM assurance and audit evidence

The implementation is read-only. Source identity, access, entitlement, role, group, and policy resources are not modified by the assurance process.

## Practice

| Attribute          | Position                                                      |
| ------------------ | ------------------------------------------------------------- |
| Practice           | Identity Engineering                                          |
| Domain             | Identity and Access Management                                |
| Specialisation     | Identity Governance and Administration                        |
| Primary focus      | Identity governance, access governance and identity assurance |
| IGA                | SailPoint Identity Governance and Administration              |
| Cloud identity     | Microsoft Entra ID                                            |
| Directory services | Active Directory                                              |
| Authorisation      | Azure RBAC                                                    |
| Access controls    | Conditional Access                                            |
| Governance         | Access certification, entitlement management and SoD          |
| Assurance          | IAM control validation and auditable evidence                 |
| Migration          | Identity and access migration assurance                       |

## IAM Assurance Model

IĀTŌ treats identity and access state as structured evidence that can be evaluated against defined IAM control assertions.

```yaml
identity_assurance:
  source:
    identity:
      - identity_records
      - account_relationships
    access:
      - role_assignments
      - group_memberships
      - entitlements
      - application_access
    governance:
      - access_reviews
      - certification_state
      - privileged_access
      - sod_relationships

  evaluation:
    control_assertions:
      - access_governance
      - entitlement_validation
      - privileged_access
      - segregation_of_duties
      - authentication
      - migration_assurance

  output:
    result:
      - pass
      - fail
      - exception
    evidence:
      - evaluated_identity_state
      - control_assertion
      - evaluation_result
      - timestamp
```

The purpose is to provide a structured representation of the observed IAM state and the resulting control evaluation.

## Identity Governance and Administration

The project is aligned to established IGA concepts rather than treating identity data as a generic configuration dataset.

Relevant IGA activities include:

* Identity lifecycle governance
* Account and entitlement management
* Role and access governance
* Access certification
* Entitlement validation
* Privileged access review
* Segregation-of-Duties analysis
* Application access governance
* Identity migration assurance

SailPoint IGA is treated as an enterprise IGA platform within the broader IAM operating environment. IĀTŌ does not attempt to replace SailPoint or reproduce proprietary SailPoint functionality.

## Identity and Access Relationships

The project evaluates relationships between identity objects and their associated access.

```yaml
access_relationship:
  identity: user
  account: enterprise_account
  application: enterprise_application
  role: assigned_role
  entitlement: assigned_entitlement
  access_state: active
  governance_state: approved
```

These relationships provide the basis for access governance and assurance activities.

The analysis can be applied to identify conditions such as:

* Unauthorised access
* Excessive access
* Orphaned access
* Conflicting entitlements
* Unreviewed access
* Privileged access requiring governance
* Unexpected access changes during migration

## Segregation of Duties

SoD analysis is a core IAM governance capability represented within the project.

A SoD control defines incompatible access combinations and evaluates identity entitlement relationships against those definitions.

```yaml
sod_control:
  control_id: IATO-SD-001
  domain: segregation_of_duties
  assertion: conflicting_entitlements_must_not_be_assigned
  evaluation:
    identity: user
    entitlement_a: entitlement_a
    entitlement_b: entitlement_b
    result: fail
  evidence:
    conflict_definition: defined
    entitlement_relationship: detected
    evaluation_timestamp: recorded
```

The purpose is to identify potentially conflicting access combinations for governance review and remediation through established IAM processes.

## Entitlement Governance

Entitlement governance focuses on whether access relationships remain attributable, appropriate, and reviewable.

```yaml
entitlement_control:
  control_id: IATO-EN-001
  domain: entitlement_management
  assertion: entitlement_relationship_must_be_attributable
  evidence:
    identity: recorded
    entitlement: recorded
    application: recorded
    relationship: recorded
    governance_state: recorded
```

This provides a structured basis for entitlement validation and access-governance activities.

## Access Certification

Access certification is treated as an ongoing governance activity rather than a one-time compliance exercise.

```yaml
access_certification:
  identity: user
  application: application
  entitlement: entitlement
  reviewer: authorised_reviewer
  decision:
    state: approved
  review:
    status: completed
    timestamp: recorded
```

Certification evidence can be associated with the underlying identity and entitlement state to support governance and audit activities.

## Privileged Access

Privileged access is evaluated as a distinct IAM governance concern.

```yaml
privileged_access:
  identity: user
  account: privileged_account
  privilege: privileged_role
  governance:
    attributable: true
    approved: true
    reviewed: true
```

The project focuses on the identity and access governance aspects of privileged access rather than implementing a separate privileged-access management platform.

## Microsoft Entra ID and Active Directory

IĀTŌ is applicable to hybrid identity environments incorporating Microsoft Entra ID and Active Directory.

Relevant identity and access state includes:

```yaml
identity_platform:
  cloud:
    platform: microsoft_entra_id
    controls:
      - conditional_access
      - role_assignments
      - group_membership
      - authentication

  directory:
    platform: active_directory
    controls:
      - accounts
      - groups
      - group_membership
      - privileged_access
```

The project focuses on the resulting identity and access relationships rather than treating either platform as an isolated security domain.

## Azure RBAC

Azure RBAC relationships can form part of the access state evaluated during identity governance and migration assurance.

```yaml
azure_rbac:
  principal: user
  scope: subscription_or_resource
  role: assigned_role
  assignment_state: active
  governance_state: approved
```

The resulting relationship can be evaluated alongside other identity and entitlement relationships when assessing access governance.

## Identity Migration Assurance

IĀTŌ supports analysis of identity and access relationships during cloud identity migration.

The project is particularly relevant to migration scenarios involving legacy IAM relationships and Microsoft Entra ID or Azure RBAC target states.

```yaml
migration_assurance:
  source:
    platform: legacy_iam
    identity_state: captured
    access_state: captured

  target:
    platform: microsoft_entra_id
    access_state: captured
    rbac_state: captured

  comparison:
    identities: evaluated
    entitlements: evaluated
    roles: evaluated
    access_relationships: evaluated
    sod_relationships: evaluated

  outcome:
    migration_state: evaluated
    evidence: generated
```

The purpose is to support assurance that identity and access relationships have been appropriately represented following migration.

IĀTŌ does not perform the migration itself.

## Policy-as-Code

IAM control assertions can be expressed as policy-as-code and evaluated against structured identity and access data.

```yaml
control:
  control_id: IATO-AC-001
  domain: access_control
  title: Authorised Access
  assertion: active_access_must_have_an_attributable_identity_relationship
  evaluation:
    expected_state: compliant
    failure_state: non_compliant
```

OPA/Rego provides the policy evaluation mechanism for the project.

The policy layer remains independent from external framework numbering.

## Control Identification

IAM controls use an internal identifier for implementation and evidence purposes.

```yaml
control_id:
  namespace: IATO
  domain: IAM
  sequence: 001
```

Domain-specific identifiers may be represented using:

```text
IATO-AC
IATO-AU
IATO-EN
IATO-GV
IATO-PA
IATO-SD
IATO-IM
```

Where:

| Identifier | Domain                 |
| ---------- | ---------------------- |
| `AC`       | Access Control         |
| `AU`       | Authentication         |
| `EN`       | Entitlement Management |
| `GV`       | Identity Governance    |
| `PA`       | Privileged Access      |
| `SD`       | Segregation of Duties  |
| `IM`       | Identity Migration     |

## Evidence Model

The evidence model records the relationship between the observed IAM state, the control assertion, and the resulting evaluation.

```yaml
evidence:
  control_id: IATO-SD-001
  identity_state:
    identity: recorded
    account: recorded
    entitlement_relationships: recorded
  assertion:
    definition: recorded
  evaluation:
    result: fail
    timestamp: recorded
  integrity:
    algorithm: SHA-256
    digest: recorded
```

Evidence is generated from structured IAM data and is intended to support:

* IAM governance
* Access reviews
* Migration assurance
* Audit activities
* Control validation
* Compliance evidence

The evidence does not itself constitute an access decision.

## Framework Alignment

IĀTŌ uses existing security frameworks as contextual references for applicable IAM controls.

### NZISM

Relevant areas include:

* Identity management
* Authentication
* Access control
* Privileged access
* Identity assurance
* Access governance

### ISM

Relevant areas include:

* Identity and access management
* Authentication
* Privileged access
* Access control
* Identity assurance

### Essential Eight

Where applicable, IAM-related controls include:

* Restrict Administrative Privileges
* Multi-Factor Authentication
* User Application Hardening

Framework mappings are maintained separately from IAM control implementation.

```yaml
framework_mapping:
  control_id: IATO-PA-001
  domain: privileged_access
  references:
    - framework: NZISM
      applicability: identity_and_access_control
    - framework: ISM
      applicability: identity_and_access_control
    - framework: E8
      control: restrict_administrative_privileges
```

Framework references do not create new compliance obligations and do not replace formal control interpretation or assessment.

## Read-Only Operation

IĀTŌ is designed for observation and assurance.

```yaml
operation:
  source_environment:
    read: permitted
    create: prohibited
    update: prohibited
    delete: prohibited

  output:
    analysis: permitted
    evidence_generation: permitted
    remediation: out_of_scope
```

Remediation remains within established IAM operational processes and change-management controls.

## Repository Structure

```text
iato-root/
├── .github/
│   └── workflows/
│       ├── validate.yml
│       └── ledger-commit.yml
│
├── docs/
│   ├── IAM_CONTROL_CROSSWALK.csv
│   └── IDENTITY_DATA_MODEL.md
│
├── collectors/
│   ├── azure/
│   │   └── entra_snapshot.py
│   └── active_directory/
│       └── ad_snapshot.py
│
├── policies/
│   ├── access/
│   ├── authentication/
│   ├── entitlement/
│   ├── governance/
│   ├── privileged/
│   └── sod/
│
├── test/
│   ├── mutations/
│   └── unit/
│
├── evidence/
│   ├── generate_evidence.py
│   └── schemas/
│
├── ledger/
│   ├── scripts/
│   │   ├── hash_result.py
│   │   └── append_ledger.py
│   └── storage/
│       └── README.md
│
└── requirements.txt
```

## Scope

| Dimension            | Scope                                                |
| -------------------- | ---------------------------------------------------- |
| Practice             | Identity Engineering                                 |
| Job family           | Identity and Access Management                       |
| Specialisation       | Identity Governance and Administration               |
| Primary IGA platform | SailPoint IGA                                        |
| Cloud identity       | Microsoft Entra ID                                   |
| Directory            | Active Directory                                     |
| Authorisation        | Azure RBAC                                           |
| Governance           | Access certification, entitlement management and SoD |
| Assurance            | IAM control validation and evidence                  |
| Migration            | Identity and access migration assurance              |
| Operation            | Read-only                                            |
| Remediation          | Out of scope                                         |

## Summary

IĀTŌ explores how enterprise identity and access relationships can be represented as structured data, evaluated against explicit IAM control assertions, and converted into machine-verifiable evidence.

The project is centred on:

```yaml
practice:
  identity_engineering:
    domain: identity_and_access_management
    specialisation: identity_governance_and_administration

capabilities:
  - identity_governance
  - entitlement_management
  - access_certification
  - segregation_of_duties
  - privileged_access_governance
  - authentication
  - access_control
  - identity_migration_assurance

platforms:
  - sailpoint_iga
  - microsoft_entra_id
  - active_directory
  - azure_rbac

assurance:
  - iam_control_validation
  - migration_assurance
  - auditable_identity_evidence
```

The project is intended to demonstrate practical application of IAM governance and assurance concepts across hybrid enterprise identity environments, with particular emphasis on identity state, entitlement relationships, access governance, SoD analysis, and migration assurance.
