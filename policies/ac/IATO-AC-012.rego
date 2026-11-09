package iato.ac.iato_ac_012

import rego.v1

deny contains msg if {
    some account in input.accounts
    # technical_parameter: accounts[].mfa_enabled
    account.privileged == true
    # technical_parameter: accounts[].mfa_enabled
    account.mfa_enabled != true
    msg := sprintf("IATO-AC-012 failed: privileged account %q does not have MFA enabled", [account.id])
}
