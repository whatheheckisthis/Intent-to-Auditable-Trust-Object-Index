package iato.ac.iato_ac_012

test_iato_ac_012_denies_privileged_account_without_mfa {
    deny[_] with input as {"accounts": [{"id": "admin@example.com", "privileged": true, "mfa_enabled": false}]}
}

test_iato_ac_012_allows_privileged_account_with_mfa {
    count(deny) == 0 with input as {"accounts": [{"id": "admin@example.com", "privileged": true, "mfa_enabled": true}]}
}
