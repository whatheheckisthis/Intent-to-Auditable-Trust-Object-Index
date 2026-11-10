import unittest
from unittest.mock import patch

from collectors.azure.entra_snapshot import (
    _has_mfa_method,
    _is_standing_assignment,
    _validate_graph_url,
)


class EntraSnapshotHelpersTests(unittest.TestCase):
    def test_password_only_is_not_mfa_registration(self):
        with patch("collectors.azure.entra_snapshot._request_json", return_value={"value": [
            {"@odata.type": "#microsoft.graph.passwordAuthenticationMethod"}
        ]}) as request:
            self.assertFalse(_has_mfa_method("user/id", "token"))
            self.assertIn("user%2Fid", request.call_args.args[0])

    def test_non_password_authentication_method_is_registered(self):
        with patch("collectors.azure.entra_snapshot._request_json", return_value={"value": [
            {"@odata.type": "#microsoft.graph.microsoftAuthenticatorAuthenticationMethod"}
        ]}):
            self.assertTrue(_has_mfa_method("user-id", "token"))

    def test_only_assigned_role_is_standing(self):
        self.assertTrue(_is_standing_assignment({"assignmentType": "Assigned"}))
        self.assertFalse(_is_standing_assignment({"assignmentType": "Activated"}))
        self.assertFalse(_is_standing_assignment({}))

    def test_rejects_untrusted_pagination_url(self):
        with self.assertRaises(ValueError):
            _validate_graph_url("https://attacker.example/v1.0/users")


if __name__ == "__main__":
    unittest.main()
