import unittest

from ingest.sailpoint_iiq import normalize_xml


class SailPointNormalizerTests(unittest.TestCase):
    def test_normalizes_supported_governance_objects(self):
        xml = b'''<sailpoint><Rule name="SoDValidation"><Description> Check conflicts </Description></Rule><TaskDefinition name="Review" enabled="true" /></sailpoint>'''
        self.assertEqual(normalize_xml(xml), {
            "source": "sailpoint_iiq_xml",
            "objects": [
                {"object_type": "Rule", "name": "SoDValidation", "id": None, "description": "Check conflicts"},
                {"object_type": "TaskDefinition", "name": "Review", "id": None, "description": None, "enabled": "true"},
            ],
        })

    def test_rejects_non_sailpoint_root(self):
        with self.assertRaisesRegex(ValueError, "sailpoint"):
            normalize_xml(b"<root />")

    def test_rejects_entity_declarations(self):
        with self.assertRaisesRegex(ValueError, "entity"):
            normalize_xml(b"<!DOCTYPE sailpoint [<!ENTITY x 'boom'>]><sailpoint>&x;</sailpoint>")

    def test_rejects_oversized_input(self):
        with self.assertRaisesRegex(ValueError, "exceeds"):
            normalize_xml(b" " * (10 * 1024 * 1024 + 1))


if __name__ == "__main__":
    unittest.main()
