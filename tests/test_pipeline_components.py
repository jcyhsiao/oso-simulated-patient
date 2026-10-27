"""Verify component migration and rejection of unsafe input references."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import copy
import sys
import hashlib

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from simulation_builder import compile_case_inputs

SPEC = importlib.util.spec_from_file_location('components', ROOT / 'scripts/pipeline_components.py')
COMPILER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COMPILER)


class PipelineComponentTests(unittest.TestCase):
    def test_authored_components_preserve_reviewed_runtime(self):
        activity_ref = 'pipeline/activities/fnp-telehealth-practice/activity.json'
        activity = COMPILER.load_activity(ROOT, activity_ref)
        packaged, _, _, _ = compile_case_inputs(ROOT, activity, activity_ref)
        baseline = json.loads((ROOT / 'tests/shannon-build-baseline.json').read_text())
        self.assertEqual(hashlib.sha256(packaged.encode()).hexdigest(),
                         baseline['packages/fnp-shannon-anderson/references/case.md'])

    def test_generated_reference_cannot_be_component_input(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'case.json').write_text(json.dumps({'id': 'case', 'component_index_ref': 'index.json'}))
            (root / 'index.json').write_text(json.dumps({'schema_version': 1, 'case_id': 'case',
                'components': [{'id': 'one', 'path': 'generated.md', 'heading': 'preamble', 'role': 'patient'}]}))
            (root / 'generated.md').write_text('generated')
            with self.assertRaisesRegex(ValueError, 'author inputs'):
                COMPILER.assemble_case(root, 'case.json')

    def test_path_escape_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'escapes'):
            COMPILER.local_file(ROOT, '../outside.md')

    def test_activity_bindings_are_required(self):
        with self.assertRaisesRegex(ValueError, 'bindings are missing'):
            COMPILER.assemble_case(ROOT, 'pipeline/cases/shannon-anderson/case.json')

    def test_compiled_records_preserve_compatibility_catalog(self):
        activity = json.loads((ROOT / 'pipeline/activities/fnp-telehealth-practice/activity.json').read_text())
        expected = json.loads((ROOT / activity['record_catalog_ref']).read_text())
        self.assertEqual(COMPILER.compile_records(ROOT, activity), expected)

    def test_release_policy_cannot_override_facts_or_omit_records(self):
        activity = json.loads((ROOT / 'pipeline/activities/fnp-telehealth-practice/activity.json').read_text())
        case = json.loads((ROOT / activity['case_ref']).read_text())
        definitions = json.loads((ROOT / case['record_definitions_ref']).read_text())
        original = json.loads((ROOT / activity['record_release_ref']).read_text())
        for mutation in ['fact-override', 'missing-rule', 'duplicate-rule']:
            policy = copy.deepcopy(original)
            if mutation == 'fact-override':
                policy['rules'][0]['date'] = 'today'
            elif mutation == 'missing-rule':
                policy['rules'].pop()
            else:
                policy['rules'].append(copy.deepcopy(policy['rules'][0]))
            with patch.object(COMPILER.json, 'loads', side_effect=[case, definitions, policy]):
                with self.assertRaises(ValueError):
                    COMPILER.compile_records(ROOT, activity)

    def test_unsupported_scoring_or_intervention_cannot_silently_activate(self):
        activity_ref = 'pipeline/activities/fnp-telehealth-practice/activity.json'
        activity = json.loads((ROOT / activity_ref).read_text())
        facilitator = json.loads((ROOT / activity['facilitator_ref']).read_text())
        for target, key in [(activity['assessment'], 'scoring_enabled'),
                            (facilitator['instructional_intervention'], 'enabled')]:
            target[key] = True
            with patch.object(COMPILER.json, 'loads', side_effect=[activity, facilitator]):
                with self.assertRaisesRegex(ValueError, 'not implemented'):
                    COMPILER.load_activity(ROOT, activity_ref)
            target[key] = False
