import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from iato.cli import collect, main


class MultiSourceCliTests(unittest.TestCase):
    def test_combines_sailpoint_and_saved_entra_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            xml = root / "iiq.xml"
            entra = root / "entra.json"
            xml.write_text('<sailpoint><Rule name="ReviewRule"><Source>return true;</Source></Rule></sailpoint>')
            entra.write_text('{"accounts": [{"id": "user@example.com"}]}')
            combined = collect(xml, entra)
        self.assertIn("sailpoint_iiq", combined["sources"])
        self.assertEqual(combined["sources"]["entra"]["accounts"][0]["id"], "user@example.com")

    def test_live_entra_collection_uses_collector(self):
        with patch("iato.cli.collect_snapshot", return_value={"accounts": []}) as collector:
            result = collect(live_entra=True)
        collector.assert_called_once_with()
        self.assertEqual(result["sources"]["entra"], {"accounts": []})

    def test_requires_at_least_one_source(self):
        with self.assertRaisesRegex(ValueError, "provide"):
            collect()

    def test_rejects_both_entra_modes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "entra.json"
            path.write_text("{}")
            with self.assertRaisesRegex(ValueError, "mutually exclusive"):
                collect(entra_json=path, live_entra=True)

    def test_invalid_entra_json_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "entra.json"
            path.write_text("[]")
            with self.assertRaisesRegex(ValueError, "JSON object"):
                collect(entra_json=path)


if __name__ == "__main__":
    unittest.main()
