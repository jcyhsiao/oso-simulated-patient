"""Check extraction coverage, confidentiality boundaries and stale-output detection."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('reference_views', ROOT / 'scripts/extract-reference-views.py')
VIEWS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VIEWS)


class ReferenceViewTests(unittest.TestCase):
    def test_unclassified_or_renamed_section_blocks_extraction(self):
        text = (ROOT / VIEWS.SOURCE).read_text()
        with self.assertRaisesRegex(ValueError, 'classification'):
            VIEWS.split_sections(text + '\n## New assessment key\nHidden answer\n')

    def test_all_runtime_bytes_are_preserved(self):
        outputs = VIEWS.outputs()
        manifest = json.loads(outputs['manifest.json'])
        self.assertEqual(b''.join(outputs[s['path']] for s in manifest['sections']),
                         (ROOT / VIEWS.SOURCE).read_bytes())
        self.assertEqual(len(manifest['original_source_sha256']), 9)

    def test_faculty_key_does_not_enter_patient_or_learner_views(self):
        outputs = VIEWS.outputs()
        key = outputs['faculty-source-text.md'].decode()
        # Exact source-key statements must remain in the faculty-only extraction.
        for phrase in ['Start Lisinopril 10mg', 'no point deduction if ordered or not']:
            self.assertIn(phrase, key)
            for name in ['patient-reference.md', 'learner-briefing.md']:
                self.assertNotIn(phrase, outputs[name].decode())
        learner = outputs['learner-briefing.md'].decode()
        self.assertNotIn('Faculty distribute', learner)
        self.assertNotIn('Uric Acid (Serum)', learner)

    def test_stale_view_is_detected_without_overwriting(self):
        outputs = VIEWS.outputs()
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            for name, data in outputs.items():
                path = target / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
            path = target / 'learner-briefing.md'
            path.write_text('changed')
            with patch.object(VIEWS, 'OUTPUT', target), patch.object(sys, 'argv', ['extract', '--check']):
                with self.assertRaisesRegex(ValueError, 'stale view'):
                    VIEWS.main()
            self.assertEqual(path.read_text(), 'changed')
