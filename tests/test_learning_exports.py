"""Content and packaging checks only; mode behavior needs live chatbot trials."""
import hashlib
import json
from pathlib import Path
import unittest
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]


class LearningExportTests(unittest.TestCase):
    def test_inline_clinical_tables_match_case_reference(self):
        case = (ROOT / 'packages/fnp-shannon-anderson/references/case.md').read_text()
        single = (ROOT / 'fnp-shannon-anderson-single-file.md').read_text()
        inline = single[single.index('BEGIN INLINE CASE'):]
        rows = lambda text: [line for line in text.splitlines() if line.startswith('|')]
        self.assertEqual(rows(case), rows(inline))

    def test_limits_and_package_members(self):
        text = (ROOT / 'fnp-shannon-anderson-single-file.md').read_text()
        for size in [len(text.encode('utf-16-le')) // 2,
                     len(text.replace('\n', '\r\n').encode('utf-16-le')) // 2,
                     len(text.encode('utf-8'))]:
            self.assertLessEqual(size, 48000)
        self.assertLessEqual(len((ROOT / 'copilot-agent-instructions.md').read_text().encode('utf-16-le')) // 2, 8000)
        bundle = ROOT / 'packages/fnp-shannon-anderson'
        expected = {'SKILL.md', 'references/case.md', 'references/result-release.md',
                    'references/learning-modes.md', 'references/summary-guide.md', 'assets/foot.jpeg'}
        with ZipFile(ROOT / 'packages/fnp-shannon-anderson.zip') as archive:
            self.assertIsNone(archive.testzip())
            self.assertEqual(set(archive.namelist()), expected)
            for name in expected:
                self.assertEqual(archive.read(name), (bundle / name).read_bytes())

    def test_guide_is_traceable_and_no_numeric_instrument_is_implied(self):
        guide = json.loads((ROOT / 'pipeline/activities/fnp-telehealth-practice/summary-guide.json').read_text())
        self.assertEqual(guide['reviewed_source_sha256'], hashlib.sha256((ROOT / guide['source_ref']).read_bytes()).hexdigest())
        self.assertIs(guide['numeric_scoring'], False)
        self.assertEqual(len(guide['domains']), 8)
        exported = (ROOT / 'packages/fnp-shannon-anderson/references/summary-guide.md').read_text()
        for domain in guide['domains']:
            self.assertIn(domain['criteria'], exported)
        self.assertNotIn('Start Lisinopril 10mg', exported)
        self.assertNotIn('ibuprofen 800', exported)

    def test_both_formats_include_same_learning_rules_and_guide(self):
        single = (ROOT / 'fnp-shannon-anderson-single-file.md').read_text()
        bundle = ROOT / 'packages/fnp-shannon-anderson/references'
        self.assertIn((ROOT / 'instructions/learning-modes.md').read_text(), single)
        self.assertIn((bundle / 'summary-guide.md').read_text(), single)
        self.assertEqual((ROOT / 'instructions/learning-modes.md').read_bytes(), (bundle / 'learning-modes.md').read_bytes())
