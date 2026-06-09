package iato.ac.iato_ac_013

test_iato_ac_013_denies_standing_privileged_access {
    deny[_] with input as {"accounts": [{"id": "admin@example.com", "privileged": true, "standing_privileged_access": true}]}
}

test_iato_ac_013_allows_jit_privileged_access {
    count(deny) == 0 with input as {"accounts": [{"id": "admin@example.com", "privileged": true, "standing_privileged_access": false}]}
}
