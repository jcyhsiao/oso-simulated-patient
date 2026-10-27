#!/usr/bin/env python3
"""Validate the initial author-only manifests; never build runtime prompts.

Supports only the JSON Schema keywords used by the two local root schemas.
This is not a general JSON Schema implementation or clinical validator.
"""
import json
import argparse
from pipeline_components import default_activity_ref
from simulation_builder import compile_case_inputs, validate_selections
import pipeline_components as compiler
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def load(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def check_schema(value, schema, location):
    types = {'object': dict, 'array': list, 'string': str, 'integer': int,
             'boolean': bool}
    kind = schema.get('type')
    if kind:
        require(type(value) is types[kind], f'{location}: expected {kind}')
    if 'const' in schema:
        require(value == schema['const'], f'{location}: invalid constant')
    if 'enum' in schema:
        require(value in schema['enum'], f'{location}: invalid choice')
    if kind == 'object':
        require(set(schema.get('required', [])) <= value.keys(),
                f'{location}: missing required fields')
        properties = schema.get('properties', {})
        if schema.get('additionalProperties') is False:
            require(value.keys() <= properties.keys(), f'{location}: unknown fields')
        for key in value.keys() & properties.keys():
            check_schema(value[key], properties[key], f'{location}.{key}')
    if kind == 'array' and 'items' in schema:
        for index, item in enumerate(value):
            check_schema(item, schema['items'], f'{location}[{index}]')


def check_references(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key.endswith('_ref') and isinstance(item, str):
                check_path(item)
            elif key.endswith('_refs'):
                for path in item:
                    check_path(path)
            check_references(item)
    elif isinstance(value, list):
        for item in value:
            check_references(item)


def check_path(path):
    resolved = (ROOT / path).resolve()
    require(not Path(path).is_absolute() and ROOT in resolved.parents,
            f'Nonportable or escaping reference: {path}')
    require(resolved.is_file(), f'Missing reference: {path}')


def validate(activity_ref=None):
    activity_ref = activity_ref or default_activity_ref(ROOT)
    activity = compiler.load_activity(ROOT, activity_ref)
    case = load(activity['case_ref'])
    facilitator = load(activity['facilitator_ref'])
    for name, value in [('case', case), ('activity', activity)]:
        check_schema(value, load(f'pipeline/schemas/{name}.schema.json'), name)
        check_references(value)
    check_references(facilitator)
    sources = []
    if case.get('source_map_ref'):
        source_map = load(case['source_map_ref'])
        sources = source_map['sources']
        require(len({s['id'] for s in sources}) == len(sources), 'Duplicate source ID')
        for source in sources:
            check_path(source['path'])
        actual = {s['path'] for s in sources}
        if source_map.get('inventory'):
            selection = source_map['inventory']
            directory = (ROOT / selection['directory']).resolve()
            require(not Path(selection['directory']).is_absolute() and ROOT in directory.parents
                    and directory.is_dir(), 'Invalid source inventory directory')
            require(selection['patterns'] and all(isinstance(p, str) and not Path(p).is_absolute()
                    and '..' not in Path(p).parts for p in selection['patterns']), 'Invalid source inventory patterns')
            actual = {p.relative_to(ROOT).as_posix() for pattern in selection['patterns']
                      for p in directory.rglob(pattern) if p.is_file()}
            require({s['path'] for s in sources} == actual, 'Source inventory mismatch')
        require(set(facilitator['faculty_source_refs']) == actual,
                'Faculty view must retain all original source documents')
    require(activity['case_id'] == case['id'], 'Case binding mismatch')
    require(facilitator['activity_id'] == activity['id'], 'Facilitator binding mismatch')
    catalog = load(activity['record_catalog_ref'])
    require(catalog['case_id'] == case['id'], 'Record catalog mismatch')
    require(compiler.compile_records(ROOT, activity) == catalog,
            'Compatibility catalog is stale; rebuild from case definitions/activity rules')
    require(activity['assessment']['scoring_enabled'] is False,
            'This draft has no approved scoring instrument')
    intervention = facilitator['instructional_intervention']
    require(intervention['enabled'] is False and intervention['rules'] == [],
            'This draft has no approved intervention triggers')
    validate_selections(activity)
    compile_case_inputs(ROOT, activity, activity_ref)
    if case.get('clinical_content_ref'):
        content = (ROOT / case['clinical_content_ref']).read_text(encoding='utf-8')
        for section in case.get('clinical_sections', []):
            require(f'## {section}\n' in content or f'### {section}\n' in content,
                    f'Missing clinical section: {section}')
    exam = facilitator.get('releasable_information', {}).get('examination_ref')
    if exam:
        check_path(exam['path'])
        require(f"## {exam['section']}\n" in (ROOT / exam['path']).read_text(),
                'Missing facilitator findings section')
    print(f'Valid author manifests: {len(sources)} sources, case/activity binding, '
          'faculty access, references and draft safeguards. No deployment files written.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--activity', help='Project-relative activity manifest; defaults to project selection')
    validate(parser.parse_args().activity)
