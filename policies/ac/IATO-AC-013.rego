package iato.ac.iato_ac_013

import rego.v1

deny contains msg if {
    some account in input.accounts
    # technical_parameter: accounts[].standing_privileged_access
    account.privileged == true
    # technical_parameter: accounts[].standing_privileged_access
    account.standing_privileged_access == true
    msg := sprintf("IATO-AC-013 failed: privileged account %q has standing privileged access", [account.id])
}
