import unittest
from unittest.mock import MagicMock
from db_probe import check_database

class DatabaseProbeTests(unittest.TestCase):
    def test_missing_url(self):
        self.assertEqual(check_database(None)[1]["database"], "not_configured")
    def test_connection(self):
        connect = MagicMock()
        conn = connect.return_value.__enter__.return_value
        conn.execute.return_value.fetchone.return_value = (1,)
        self.assertEqual(check_database("postgresql://example", connect)[0], 200)
        conn.execute.assert_called_once_with("SELECT 1")
    def test_failure_redacts_secret(self):
        connect = MagicMock(side_effect=RuntimeError("secret-password"))
        code, body = check_database("postgresql://secret-password", connect)
        self.assertEqual(code, 503)
        self.assertNotIn("secret-password", str(body))
    def test_unexpected_response(self):
        connect = MagicMock()
        self.assertEqual(check_database("postgresql://example", connect)[0], 503)
