import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('processor', ROOT / 'tools/process_diagnoses.py')
processor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(processor)


class ProcessorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name) / 'synthetic.dta'
        pd.DataFrame({'diag': ['E11.9']*10 + ['I10']*2 + ['UNTRUSTED FREE TEXT', ''],
                      'private_id': ['DO-NOT-EXPORT']*14}).to_stata(self.source, write_index=False, version=118)

    def test_streaming_aggregate_excludes_raw_columns_and_suppresses_rare_codes(self):
        s = processor.aggregate(self.source, 'diag', chunksize=3, synthetic=True)
        self.assertEqual(s['rows'], 14)
        self.assertEqual(s['valid'], 12)
        self.assertEqual(s['invalid'], 1)
        self.assertEqual(s['missing'], 1)
        self.assertEqual(s['groups'], [{'code': 'E11.9', 'count': 10}])
        self.assertEqual(s['suppressed'], 2)
        self.assertNotIn('DO-NOT-EXPORT', json.dumps(s))
        self.assertNotIn('UNTRUSTED', json.dumps(s))

    def test_cli_inspects_names_only_and_writes_separate_aggregate(self):
        script = ROOT / 'tools/process_diagnoses.py'
        result = subprocess.run([sys.executable, str(script), str(self.source), '--inspect'], capture_output=True, text=True, check=True)
        self.assertEqual(json.loads(result.stdout), {'columns': ['diag', 'private_id']})
        output = Path(self.temp.name) / 'summary.json'
        subprocess.run([sys.executable, str(script), str(self.source), '--diagnosis-column', 'diag', '--output', str(output)], capture_output=True, check=True)
        self.assertEqual(json.loads(output.read_text())['mode'], 'USER_AGGREGATE')
        overwrite = subprocess.run([sys.executable, str(script), str(self.source), '--diagnosis-column', 'diag', '--output', str(output)], capture_output=True)
        self.assertNotEqual(overwrite.returncode, 0)

    def test_rejects_small_threshold_and_wrong_mapping(self):
        with self.assertRaises(ValueError):
            processor.aggregate(self.source, 'diag', threshold=1)
        with self.assertRaises(ValueError):
            processor.aggregate(self.source, 'missing_column')
        tiny = Path(self.temp.name) / 'tiny.dta'
        pd.DataFrame({'diag':['E11.9']}).to_stata(tiny, write_index=False)
        with self.assertRaises(ValueError):
            processor.aggregate(tiny, 'diag')


if __name__ == '__main__':
    unittest.main()
