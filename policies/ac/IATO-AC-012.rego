package iato.ac.iato_ac_012

deny[msg] {
    account := input.accounts[_]
    # technical_parameter: accounts[].mfa_enabled
    account.privileged == true
    # technical_parameter: accounts[].mfa_enabled
    account.mfa_enabled != true
    msg := sprintf("IATO-AC-012 failed: privileged account %q does not have MFA enabled", [account.id])
}
