"""Compiler regressions, not clinical or live model validation."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import simulation_builder as builder
import learning_modes
from authored_text import render_text


class SimulationBuilderTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)

    def write(self, name, value):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value) if isinstance(value, dict) else value, encoding='utf-8')

    def fixture(self):
        """Invented nonclinical fixture: no Linda or faculty decisions implied."""
        case_ref = 'pipeline/cases/example/case.json'
        self.activity_ref = 'pipeline/activities/example/activity.json'
        self.write(case_ref, {'schema_version': 1, 'id': 'example-person', 'component_index_ref': 'pipeline/cases/example/components.json',
                              'record_definitions_ref': 'pipeline/cases/example/records.json'})
        self.write('pipeline/cases/example/components.json', {'schema_version': 1, 'case_id': 'example-person',
            'components': [{'id': 'patient', 'heading': 'preamble', 'role': 'patient',
                            'path': 'pipeline/cases/example/patient.md'}]})
        self.write('pipeline/cases/example/patient.md', '# Example patient\n\nSupplied fact: favorite color is blue.\n')
        self.write('pipeline/cases/example/records.json', {'schema_version': 1, 'case_id': 'example-person', 'records': []})
        self.write('pipeline/activities/example/release.json', {'schema_version': 1, 'case_id': 'example-person',
                   'activity_id': 'example-activity', 'rules': []})
        self.write('pipeline/activities/example/facilitator.json', {'activity_id': 'example-activity',
                   'instructional_intervention': {'enabled': False, 'rules': []}})
        self.write('inputs/source.txt', 'Synthetic review source.\n')
        self.write('inputs/base.md', 'Respond using supplied facts and ordinary language.\n')
        self.write('inputs/skill.md', '# Example portrayal\n')
        self.write('inputs/policy.md', 'Release only requested supplied information.\n')
        self.write('inputs/modes.md', 'Use the selected activity controls.\n')
        self.guide = {'schema_version': 1, 'case_id': 'example-person', 'activity_id': 'example-activity',
            'numeric_scoring': False, 'source_ref': 'inputs/source.txt',
            'reviewed_source_sha256': hashlib.sha256((self.root / 'inputs/source.txt').read_bytes()).hexdigest(),
            'limitations': 'Fixture only. No numeric ratings.', 'additional_observations': 'Use human learner evidence.',
            'domains': [{'id': name, 'source_section': 'Example', 'criteria': f'Example criterion {name}.'}
                        for name in ['listening', 'clarity', 'reflection']]}
        self.write('inputs/guide.json', self.guide)
        self.activity = {'schema_version': 1, 'id': 'example-activity', 'case_id': 'example-person',
            'case_ref': case_ref, 'facilitator_ref': 'pipeline/activities/example/facilitator.json',
            'assessment': {'scoring_enabled': False}, 'component_bindings': {},
            'record_release_ref': 'pipeline/activities/example/release.json',
            'record_catalog_ref': 'exports/example-records.json',
            'shared_instructions_ref': 'inputs/base.md', 'portrayal_ref': 'inputs/skill.md',
            'release_policy_ref': 'inputs/policy.md',
            'feedback': {'guide_ref': 'inputs/guide.json', 'modes_ref': 'inputs/modes.md', 'title': 'Example feedback'},
            'deployment': {'adapter': 'native-v1', 'bundle_dir': 'exports/example',
                'archive_path': 'exports/example.zip', 'standalone_path': 'exports/example.md',
                'standalone_title': 'Example encounter', 'assets': []}}
        self.save_activity()

    def save_activity(self):
        self.write(self.activity_ref, self.activity)

    def test_shannon_rebuild_preserves_all_runtime_bytes(self):
        # Build in isolation so the regression cannot pass on stale exports.
        for directory in ['pipeline', 'cases', 'case-files', 'instructions', 'assets', 'packages', 'scripts']:
            shutil.copytree(ROOT / directory, self.root / directory)
        for path in ROOT.glob('*.md'):
            shutil.copyfile(path, self.root / path.name)
        baseline = json.loads((ROOT / 'tests/shannon-build-baseline.json').read_text())
        # Remove generated references while retaining the historical author SKILL.md.
        shutil.rmtree(self.root / 'packages/fnp-shannon-anderson/references')
        shutil.rmtree(self.root / 'packages/fnp-shannon-anderson/assets')
        for generated in ['fnp-shannon-anderson-single-file.md', 'cases/case-b-diagnostic-records.json',
                          'packages/fnp-shannon-anderson.zip']:
            (self.root / generated).unlink()
        result = builder.build(self.root, 'pipeline/activities/fnp-telehealth-practice/activity.json')
        for name, digest in baseline.items():
            with self.subTest(file=name):
                self.assertEqual(hashlib.sha256((self.root / name).read_bytes()).hexdigest(), digest)
        with ZipFile(result['archive']) as archive:
            self.assertIsNone(archive.testzip())
            self.assertEqual(len(archive.namelist()), 6)
            for name in archive.namelist():
                self.assertEqual(archive.read(name), (self.root / 'packages/fnp-shannon-anderson' / name).read_bytes())

    def test_native_case_uses_selected_files_and_arbitrary_feedback_domains(self):
        self.fixture()
        self.write('inputs/handout.txt', 'Fixture asset.')
        self.activity['deployment']['assets'] = [{'source_ref': 'inputs/handout.txt', 'package_path': 'assets/handout.txt'}]
        self.save_activity()
        result = builder.build(self.root, self.activity_ref)
        with ZipFile(result['archive']) as archive:
            self.assertEqual(archive.read('references/case.md'), (self.root / 'pipeline/cases/example/patient.md').read_bytes())
            self.assertEqual(archive.read('SKILL.md'), (self.root / 'inputs/skill.md').read_bytes())
            self.assertEqual(archive.read('assets/handout.txt'), b'Fixture asset.')
            guide = archive.read('references/summary-guide.md').decode()
        single = result['standalone'].read_text()
        for domain in self.guide['domains']:
            self.assertIn(domain['criteria'], guide)
            self.assertIn(domain['criteria'], single)
        self.assertTrue(single.startswith('# Example encounter\n'))
        self.assertIn('Supplied fact: favorite color is blue.', single)
        self.assertIn('Use the selected activity controls.', single)
        self.assertNotIn('Shannon', single)
        self.assertNotIn('foot', single)
        self.assertNotIn('FNP', single)
        self.assertFalse((self.root / 'packages/fnp-shannon-anderson').exists())

    def test_native_record_catalog_uses_selected_facts_and_release_policy(self):
        self.fixture()
        self.write('pipeline/cases/example/patient.md', '# Example patient\n\nRecorded favorite color: blue.\n')
        self.write('pipeline/cases/example/records.json', {'schema_version': 1, 'case_id': 'example-person',
            'records': [{'id': 'color-note', 'title': 'Color note', 'date': 'fixture date', 'aliases': ['color note'],
                'conflicting_terms': [], 'result_evidence': ['blue'],
                'content_refs': ['pipeline/cases/example/patient.md']}]})
        self.write('pipeline/activities/example/release.json', {'schema_version': 1, 'case_id': 'example-person',
            'activity_id': 'example-activity', 'rules': [{'id': 'color-note', 'owner': 'patient',
            'release_on_firm_plan': False, 'availability': 'Existing note; requested contents only.'}]})
        result = builder.build(self.root, self.activity_ref)
        self.assertIn('### color-note', result['standalone'].read_text())
        self.assertIn('Release on firm plan: no', result['standalone'].read_text())
        catalog = json.loads((self.root / 'exports/example-records.json').read_text())
        self.assertEqual(catalog['case_id'], 'example-person')
        self.assertFalse(catalog['reports'][0]['release_on_firm_plan'])

    def test_wrong_guide_binding_source_change_and_numeric_scoring_fail_before_writes(self):
        self.fixture()
        original = dict(self.guide)
        for key, value in [('case_id', 'other'), ('activity_id', 'other'),
                           ('numeric_scoring', True), ('reviewed_source_sha256', 'stale'),
                           ('domains', []), ('domains', [original['domains'][0]] * 2)]:
            with self.subTest(key=key):
                self.write('inputs/guide.json', {**original, key: value})
                with self.assertRaises(ValueError):
                    builder.build(self.root, self.activity_ref)
                self.assertFalse((self.root / 'exports').exists())

    def test_invalid_output_and_member_selections_fail_before_writes(self):
        self.fixture()
        original = dict(self.activity['deployment'])
        variants = [
            {'adapter': 'unknown'}, {'adapter': 'shannon-compat-v1'},
            {'standalone_path': '../escaped.md'},
            {'standalone_path': 'inputs/base.md'},
            {'archive_path': 'exports/example.md'},
            {'standalone_path': 'exports/example/SKILL.md'},
            {'assets': [{'source_ref': 'inputs/base.md', 'package_path': '../bad'}]},
            {'assets': [{'source_ref': 'inputs/base.md', 'package_path': '.'}]},
            {'assets': [{'source_ref': 'inputs/base.md', 'package_path': 'SKILL.md'}]},
        ]
        for variant in variants:
            with self.subTest(variant=variant):
                self.activity['deployment'] = {**original, **variant}
                self.save_activity()
                with self.assertRaises(ValueError):
                    builder.build(self.root, self.activity_ref)
                self.assertFalse((self.root / 'exports').exists())

    def visual_fixture(self):
        self.fixture()
        self.write('inputs/picture.bin', 'Synthetic asset bytes')
        with ZipFile(self.root / 'inputs/picture-source.docx', 'w') as archive:
            archive.writestr('word/document.xml', '<root><docPr descr="Reviewed sample metadata"/></root>')
        self.visual = {'schema_version': 1, 'case_id': 'example-person', 'approved': True,
            'reviewed_embedded_alt_text': ['Reviewed sample metadata'],
            'visible_description': 'A blue circle.', 'symptom_location': 'Center of sample.',
            'location_answer': 'The center.', 'visual_answer': 'A blue circle is visible.'}
        self.write('inputs/visual.json', self.visual)
        path = self.root / self.activity['case_ref']
        case = json.loads(path.read_text())
        case.update({'patient': {'name': 'Alex Example'}, 'encounter_date': 'fixture-date',
            'visual_ref': 'inputs/visual.json', 'photo_ref': 'inputs/picture.bin',
            'visual_source_document_ref': 'inputs/picture-source.docx'})
        self.write(self.activity['case_ref'], case)
        self.activity['deployment']['assets'] = [{'source_ref': 'inputs/picture.bin', 'package_path': 'assets/sample.bin'}]
        self.save_activity()

    def test_supplied_case_metadata_visual_paths_and_format_variants(self):
        self.visual_fixture()
        self.write('pipeline/cases/example/patient.md',
                   '## Example portrayal\n{{case.patient.name}} · {{case.encounter_date}}\n{{visual.visible_description}}\n')
        self.write('pipeline/cases/example/inline.md',
                   '## Inline portrayal\n{{case.patient.name}}\n{{visual.visual_answer}}\n')
        self.write('pipeline/cases/example/components.json', {'schema_version': 1, 'case_id': 'example-person',
            'components': [{'id': 'patient', 'heading': 'Example portrayal', 'role': 'patient',
                'path': 'pipeline/cases/example/patient.md',
                'standalone': {'path': 'pipeline/cases/example/inline.md', 'heading': 'Inline portrayal'}}]})
        self.write('inputs/base.md', 'Use the package for {{case.patient.name}}.\n')
        self.write('inputs/inline-base.md', 'Use the inline text for {{case.patient.name}}.\n')
        self.activity['standalone_instructions_ref'] = 'inputs/inline-base.md'
        self.activity['deployment']['base_instructions_path'] = 'exports/base.md'
        self.save_activity()
        result = builder.build(self.root, self.activity_ref)
        with ZipFile(result['archive']) as archive:
            packaged = archive.read('references/case.md').decode()
            self.assertIn('Alex Example · fixture-date', packaged)
            self.assertIn('A blue circle.', packaged)
            self.assertNotIn('Reviewed sample metadata', packaged)
            self.assertEqual(archive.read('assets/sample.bin'), b'Synthetic asset bytes')
        inline = result['standalone'].read_text()
        self.assertIn('## Inline portrayal', inline)
        self.assertIn('A blue circle is visible.', inline)
        self.assertIn('Use the inline text for Alex Example.', inline)
        self.assertNotIn('## Example portrayal', inline)
        self.assertEqual(result['base_instructions'].read_text(), 'Use the package for Alex Example.\n')
        self.assertEqual((self.root / 'inputs/base.md').read_text(), 'Use the package for {{case.patient.name}}.\n')

    def test_activity_fragment_format_variants_keep_author_scope(self):
        self.fixture()
        self.write('pipeline/cases/example/components.json', {'schema_version': 1, 'case_id': 'example-person',
            'components': [{'id': 'dialogue', 'heading': 'preamble', 'role': 'patient', 'activity_binding': 'dialogue'}]})
        self.write('pipeline/activities/example/package.md', 'Package-specific instructions.\n')
        self.write('pipeline/activities/example/inline.md', 'Inline-specific instructions.\n')
        fragment = {'scope': 'activity', 'path': 'pipeline/activities/example/package.md',
                    'standalone_path': 'pipeline/activities/example/inline.md'}
        self.activity['component_bindings'] = {'dialogue': [fragment]}
        self.save_activity()
        result = builder.build(self.root, self.activity_ref)
        with ZipFile(result['archive']) as archive:
            self.assertEqual(archive.read('references/case.md'), b'Package-specific instructions.\n')
        self.assertIn('Inline-specific instructions.', result['standalone'].read_text())
        fragment['standalone_path'] = 'inputs/base.md'
        self.save_activity()
        with self.assertRaisesRegex(ValueError, 'declared case/activity'):
            builder.build(self.root, self.activity_ref)

    def test_changed_or_mismatched_visual_evidence_fails_before_writes(self):
        self.visual_fixture()
        original = dict(self.visual)
        for change in [{'case_id': 'different-case'}, {'approved': False},
                       {'reviewed_embedded_alt_text': []}, {'visual_answer': ''}]:
            with self.subTest(change=change):
                self.write('inputs/visual.json', {**original, **change})
                with self.assertRaises(ValueError):
                    builder.build(self.root, self.activity_ref)
                self.assertFalse((self.root / 'exports').exists())
        self.write('inputs/visual.json', original)
        self.activity['deployment']['assets'] = []
        self.save_activity()
        with self.assertRaisesRegex(ValueError, 'photograph is missing'):
            builder.build(self.root, self.activity_ref)

    def test_unknown_and_private_placeholders_cannot_be_published(self):
        self.visual_fixture()
        for key in ['visual.reviewed_embedded_alt_text', 'visual.faculty_alternative_text',
                    'case.visual_source_document_ref', 'case.missing']:
            with self.subTest(key=key):
                self.write('pipeline/cases/example/patient.md', '{{' + key + '}}')
                with self.assertRaisesRegex(ValueError, 'Unknown or unavailable'):
                    builder.build(self.root, self.activity_ref)
                self.assertFalse((self.root / 'exports').exists())
        self.assertEqual(render_text('{{value}}', {'value': '{{never_evaluate}}'}), '{{never_evaluate}}')
        with self.assertRaisesRegex(ValueError, 'Malformed'):
            render_text('{{broken', {})

    def test_supplied_legacy_default_build_does_not_require_reference_case(self):
        self.fixture()
        shutil.copytree(ROOT / 'scripts', self.root / 'scripts')
        self.write('pipeline/default-build.json', {'schema_version': 1, 'activity_ref': self.activity_ref})
        result = subprocess.run([sys.executable, '-B', str(self.root / 'scripts/build-copilot-case.py')],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.root / 'exports/example.zip').exists())
        self.assertNotIn('Shannon', result.stdout)

    def test_validator_uses_selected_case_and_source_inventory(self):
        self.fixture()
        shutil.copytree(ROOT / 'scripts', self.root / 'scripts')
        shutil.copytree(ROOT / 'pipeline/schemas', self.root / 'pipeline/schemas')
        self.activity.update({'version': 'fixture-v1', 'status': 'faculty-review-draft',
            'profession': 'example profession', 'program': 'example program', 'mode': 'example mode',
            'setting': 'example setting', 'learner_briefing': {}, 'builder_ref': 'scripts/build-simulation.py',
            'runtime_revision': 'fixture-runtime', 'variation': {}, 'unresolved': [],
            'deployment_status': 'Synthetic fixture only.'})
        self.save_activity()
        case = json.loads((self.root / self.activity['case_ref']).read_text())
        case['source_map_ref'] = 'inputs/source-map.json'
        self.write(self.activity['case_ref'], case)
        self.write('inputs/source-map.json', {'sources': [{'id': 'one', 'path': 'inputs/source.txt'}],
            'inventory': {'directory': 'inputs', 'patterns': ['*.txt']}})
        facilitator_ref = self.activity['facilitator_ref']
        facilitator = json.loads((self.root / facilitator_ref).read_text())
        facilitator['faculty_source_refs'] = ['inputs/source.txt']
        self.write(facilitator_ref, facilitator)
        builder.build(self.root, self.activity_ref)
        command = [sys.executable, '-B', str(self.root / 'scripts/validate-pipeline.py'),
                   '--activity', self.activity_ref]
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('1 sources', result.stdout)
        self.write('inputs/unindexed.txt', 'An additional supplied source')
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Source inventory mismatch', result.stderr)

    def test_template_inputs_are_not_overwritten_by_exports(self):
        self.fixture()
        self.write('inputs/base.md', 'Case {{case.id}}')
        with self.assertRaisesRegex(ValueError, 'separate base_instructions_path'):
            builder.build(self.root, self.activity_ref)
        self.assertFalse((self.root / 'exports').exists())
        self.write('inputs/base.md', 'Original base')
        self.write('inputs/inline-base.md', 'Standalone base')
        self.activity['standalone_instructions_ref'] = 'inputs/inline-base.md'
        self.activity['deployment']['standalone_path'] = 'inputs/inline-base.md'
        self.save_activity()
        with self.assertRaisesRegex(ValueError, 'overwrite author input'):
            builder.build(self.root, self.activity_ref)
        self.assertEqual((self.root / 'inputs/inline-base.md').read_text(), 'Standalone base')

    def test_standalone_budget_still_applies_to_native_case(self):
        self.fixture()
        self.write('pipeline/cases/example/patient.md', 'x' * 48000)
        with self.assertRaisesRegex(ValueError, 'safety budget'):
            builder.build(self.root, self.activity_ref)
        self.assertFalse((self.root / 'exports').exists())

    def test_shared_cli_requires_explicit_activity(self):
        result = subprocess.run([sys.executable, '-B', str(ROOT / 'scripts/build-simulation.py')],
                                capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('--activity', result.stderr)

    def test_stale_bundle_files_are_rejected(self):
        self.fixture()
        self.write('exports/example/assets/old.txt', 'Old unselected material')
        with self.assertRaisesRegex(ValueError, 'unselected files'):
            builder.build(self.root, self.activity_ref)
        self.assertFalse((self.root / 'exports/example.md').exists())
