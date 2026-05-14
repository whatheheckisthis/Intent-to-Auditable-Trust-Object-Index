
## Formal Grammar Specification - **BNF / State-Semantic DSL**


 ### 1. Lexical Definitions

```bnf
<IDENT>        ::= letter { letter | digit | "_" }

<REGISTER>     ::= "HCR_EL2"
                | "VTTBR_EL2"
                | "VTCR_EL2"
                | "ELR_EL2"
                | "SPSR_EL2"
                | "DAIF"

<VECTOR_REG>   ::= "Z" "[" <INT> ".." <INT> "]"
<PRED_REG>     ::= "P" "[" <INT> ".." <INT> "]"

<INT>          ::= digit { digit }

<VM_STATE>     ::= "created"
                | "configured"
                | "running"
                | "vmexit"
                | "migrating"
                | "destroyed"
```

---

 ### 2. Global System State

```bnf
<S> ::= "⟨" <S_EL2> "," <S_Stage2> "," <S_SVE2> "," <S_QEMU> "," <S_KVM> "," <S_Microarch> "⟩"
```

Constraint:

* All execution states MUST be represented inside S
* No external state exists

---

 ### 3. EL2 State Model

```bnf
<S_EL2> ::= "⟨"
              <REGISTER> ","
              <REGISTER> ","
              <REGISTER> ","
              "DAIF" ","
              "ELR_EL2" ","
              "SPSR_EL2"
            "⟩"
```

Interpretation constraint:

* HCR_EL2 controls execution mode
* VTTBR_EL2 defines Stage-2 base
* VTCR_EL2 defines translation rules
* DAIF defines interrupt mask state

Invariant:

```bnf
∀ S_t : EL2_state is fully materialised at VM entry/exit
```

---

 ### 4. Stage-2 MMU Model

```bnf
<S_Stage2> ::= "⟨" <VMID> "," <IPA_PA_MAP> "," <TLB_STATE> "⟩"

<VMID>        ::= <INT>

<IPA_PA_MAP>  ::= "IPA→PA"

<TLB_STATE>   ::= <IDENT>
```

Constraints:

```bnf
∀ VM_i, VM_j :
  VM_i ≠ VM_j ⇒ VMID_i ≠ VMID_j
```

```bnf
IPA→PA is injective per VMID domain
```

---

 ### 5. SVE2 Vector State Model

```bnf
<S_SVE2> ::= "⟨" <Z_BLOCK> "," <P_BLOCK> "," "FFR" "," <VL> "⟩"
```

---

 ### 5.1 Register Blocks

```bnf
<Z_BLOCK> ::= "Z[" "0" ".." "31" "]"
<P_BLOCK> ::= "P[" "0" ".." "15" "]"
```

---

 ### 5.2 Vector Length

```bnf
<VL> ::= <INT>
```

Constraint system:

```bnf
VL ∈ {128, 256, 512, 1024, 2048}
∀ S_VCPU : VL is invariant over lifecycle
```

---

 ### 5.3 SVE2 Atomicity Rule

```bnf
ATOMIC(S_SVE2) :=
  SAVE(Z[0..31]) ∧
  SAVE(P[0..15]) ∧
  SAVE(FFR)
```

Constraint:

```bnf
No partial SVE state may exist at VM exit boundary
```

---

 ### 6. QEMU Projection Model

```bnf
<S_QEMU> ::= "⟨" <SIGMA_STABLE> "," <ID_MASK> "," <VCPU_FEATURES> "⟩"
```

---

 ### 6.1 Feature Set Relation

```bnf
<SIGMA_STABLE> ::= "Σ_host ∩ Σ_guest"
```

Constraint:

```bnf
Σ_guest ⊆ Σ_host
```

---

 ### 6.2 ID Register Masking

```bnf
<ID_MASK> ::= <IDENT>
```

Semantics:

* bit-level suppression of ISA features

---

 ### 7. KVM Execution Model

```bnf
<S_KVM> ::= "⟨" <VCPU_STATE> "," <EXIT_REASON> "," <RUN_CONTEXT> "⟩"
```

---

 ### 7.1 VCPU State Machine

```bnf
<VCPU_STATE> ::= <VM_STATE>
```

Transition relation:

```bnf
created → configured → running → vmexit → migrating → destroyed
```

Formal rule:

```bnf
T_KVM(S_t) ⊆ S_t+1
```

---

 ### 8. Microarchitectural State Model (Adversarial Domain)

```bnf
<S_Microarch> ::= "⟨" <BTB> "," <BHB> "," <RSB> "," <CACHE> "," <PIPELINE> "⟩"
```

Where:

```bnf
<BTB>       ::= <IDENT>
<BHB>       ::= <IDENT>
<RSB>       ::= <IDENT>
<CACHE>     ::= <IDENT>
<PIPELINE>  ::= <IDENT>
```

Constraint:

```bnf
∀ S_i, S_j :
  S_Microarch must not encode observable cross-VM channel
```

---

 ### 9. Transition System Definition

```bnf
<SYSTEM_TRANSITION> ::= "T(S)" ":" S "→" S
```

Decomposition rule:

```bnf
T(S) =
  T_EL2(S_EL2) ∪
  T_Stage2(S_Stage2) ∪
  T_SVE2(S_SVE2) ∪
  T_QEMU(S_QEMU) ∪
  T_KVM(S_KVM)
```

Constraint:

* Microarchitectural state is **not directly controllable**
* It is only constrained indirectly

---

 ### 10. Projection Function (QEMU)

```bnf
<PROJECTION> ::= "Proj(QEMU)" "=" "Σ_host ∩ Σ_guest"
```

Invariant:

```bnf
∀ execution :
  Σ_stable is computed at VCPU creation only
```

---

 ### 11. Isolation Predicate (Stage-2)

```bnf
<ISO> ::= "Iso(Stage2)"
```

Definition:

```bnf
Iso(Stage2) :=
  ∀ VM_i, VM_j :
    VM_i ≠ VM_j ⇒ IPA_i ∩ IPA_j = ∅
```

---

 ### 12. Vector Correctness Predicate

```bnf
<VEC_CORRECT> ::= "Vec(SVE2)"
```

Definition:

```bnf
Vec(SVE2) :=
  VL invariant ∧
  ATOMIC(Z, P, FFR)
```

---

 ### 13. System Correctness Predicate

```bnf
<CORRECT> ::= "CORRECT(S)"
```

Definition:

```bnf
CORRECT(S) :=
  Arch_Correct(S)
  ∧ Iso(Stage2)
  ∧ Vec(SVE2)
  ∧ Proj(QEMU)
  ∧ Microarch_Noninterference(S)
```

---

 ### 14. Grammar Summary

This DSL defines:

* A single global state space S
* Fully decomposed substate domains
* Deterministic transition functions over EL2/KVM/Stage-2/QEMU
* Constrained vector execution semantics (SVE2)
* Explicit adversarial microarchitectural leakage model
* Feature projection as set intersection semantics

