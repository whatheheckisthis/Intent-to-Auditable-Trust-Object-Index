# ARM Virtualisation Execution Correctness

This repository includes an ARM virtualisation and execution-correctness scaffold for Azure Cobalt-class Neoverse infrastructure.  The model treats execution correctness as a register-level property over the global state:

```text
S = ⟨S_EL2, S_Stage2, S_SVE2, S_QEMU, S_KVM, S_Microarch⟩
```

Component state is explicit:

```text
S_EL2       = ⟨HCR_EL2, VTTBR_EL2, VTCR_EL2, DAIF, ELR_EL2, SPSR_EL2⟩
S_Stage2    = ⟨VMID, IPA→PA_table, fault_log⟩
S_SVE2      = ⟨Z₀..₃₁, P₀..₁₅, FFR, VL⟩
S_QEMU      = ⟨Σ_stable, ID_reg_mask, VCPU_cfg⟩
S_KVM       = ⟨S_VCPU, exit_reason, run_state⟩
S_Microarch = ⟨BTB_state, BHB_state, LLC_state, RSB_state, pipeline_state⟩
```

No component state is inferred, defaulted, or implicitly carried across VM entry or VM exit. Every transition is explicit, bounded, and verifiable at the named register, table, or architectural state element.

## Correctness Definition

```text
CORRECT(S) ⟺
  Arch_Correct(S)
  ∧ Isolation_Correct(S)
  ∧ Microarch_Noninterference(S)
  ∧ Projection_Correct(S)
```

- `Arch_Correct(S)`: `S_EL2`, `S_Stage2`, `S_SVE2`, and `S_KVM` transitions conform to ARM ARM DDI0487K and KVM/ARM64 behaviour.
- `Isolation_Correct(S)`: no guest observes another guest or EL2 through architectural instruction or exception mechanisms.
- `Microarch_Noninterference(S)`: cache timing, `BTB_state`, `BHB_state`, `RSB_state`, and `pipeline_state` do not reveal protected memory access patterns or branch behaviour.
- `Projection_Correct(S)`: `Σ_stable ⊆ Σ_host`; QEMU exposes only fleet-stable architectural features through ID register masking.

## Core Invariants

```text
I₁:  HCR_EL2.VM = 1               ∀ S_VCPU ∈ {running, vmexit}
I₂:  VTCR_EL2.PS ≥ host_PA_range  at VCPU creation; not modifiable thereafter
I₃:  VL ∈ {128, 256, 512, 1024, 2048} ∧ VL ≤ VL_max(substrate)
I₄:  VL invariant ∀ t ≥ t_configured
I₅:  Σ_stable = Σ_host ∩ Σ_guest   computed once at VCPU creation
I₆:  SVE_SAVE_EXTRA: Z then P then FFR; violation is a correctness fault
I₇:  DAIF restored atomically at EL1 re-entry; partial restoration not permitted
I₈:  VMID(VTTBR_EL2) unique across all S_VCPU = running instances
I₉:  (V3/RME) No Stage-2 PTE maps Realm or Secure PAS
I₁₀: BRBE disabled or context-saved before each VM entry unless guest BRBE granted
I₁₁: RDVL result × 8 = configured VL; divergence is an observable fault
I₁₂: MTE3 VCPU not migrated to host where MTE3 absent; silent downgrade rejected
I₁₃: QARMA3 PAC keys not masked from guest on V3-homogeneous fleet only
I₁₄: CLEARBHB issued at EL2 entry on N2/V3 hosts regardless of CSV2 field value
```

## Correctness Artefacts

- [`el2_control.md`](el2_control.md): `HCR_EL2`, `DAIF`, VM entry/exit, EL2 save/restore, `ZCR_EL2`.
- [`stage2_isolation.md`](stage2_isolation.md): `VTTBR_EL2`, `VTCR_EL2`, `VMID`, `IPA→PA_table`, Stage-2 fault invariants.
- [`sve2_execution.md`](sve2_execution.md): `Z₀..Z₃₁`, `P₀..P₁₅`, `FFR`, `VL`, SVE2 feature detection, save/restore ordering.
- [`kvm_lifecycle.md`](kvm_lifecycle.md): `S_VCPU`, `KVM_RUN`, `KVM_SET_ONE_REG`, `KVM_GET_ONE_REG`, migration constraints.
- [`qemu_projection.md`](qemu_projection.md): `Σ_host ∩ Σ_guest → Σ_stable`, ID register masking, heterogeneous substrate projection.
- [`threat_model.md`](threat_model.md): Spectre-v1/v2/BHB, Meltdown, cache timing, RSB underflow, BRBE, pipeline observability.
- [`cobalt_constraints.md`](cobalt_constraints.md): Azure Cobalt 100/200, Neoverse N2/V3, PAC, MTE, RME constraints.
- [`correctness_model.md`](correctness_model.md): full invariant set, correctness conjunction, NTT cryptographic execution constraints.

---

