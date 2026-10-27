"""Assemble ordered author components without reading generated output."""
import json
from pathlib import Path

from authored_text import render_text


def local_file(root, name):
    path = (root / name).resolve()
    if Path(name).is_absolute() or root.resolve() not in path.parents:
        raise ValueError(f'Component reference escapes project: {name}')
    if not path.is_file():
        raise ValueError(f'Missing component input: {name}')
    return path


def default_activity_ref(root):
    """Legacy commands get their default from supplied project configuration."""
    selection = json.loads(local_file(root, 'pipeline/default-build.json').read_text(encoding='utf-8'))
    if (selection.get('schema_version') != 1 or set(selection) != {'schema_version', 'activity_ref'}
            or not isinstance(selection['activity_ref'], str) or not selection['activity_ref']):
        raise ValueError('Invalid default build selection')
    return selection['activity_ref']


def load_activity(root, activity_ref):
    activity = json.loads(local_file(root, activity_ref).read_text(encoding='utf-8'))
    facilitator = json.loads(local_file(root, activity['facilitator_ref']).read_text(encoding='utf-8'))
    if activity['schema_version'] != 1 or facilitator['activity_id'] != activity['id']:
        raise ValueError('Activity/facilitator binding mismatch')
    if activity['assessment']['scoring_enabled'] is not False:
        raise ValueError('Scoring is not implemented by this adapter')
    intervention = facilitator['instructional_intervention']
    if intervention['enabled'] is not False or intervention['rules']:
        raise ValueError('Instructional intervention is not implemented by this adapter')
    return activity


def compile_records(root, activity):
    """Join factual definitions with activity release rules by stable record ID."""
    case = json.loads(local_file(root, activity['case_ref']).read_text(encoding='utf-8'))
    definitions = json.loads(local_file(root, case['record_definitions_ref']).read_text(encoding='utf-8'))
    policy = json.loads(local_file(root, activity['record_release_ref']).read_text(encoding='utf-8'))
    if any(d['schema_version'] != 1 or d['case_id'] != case['id'] for d in [definitions, policy]):
        raise ValueError('Record definition/policy case mismatch')
    if policy['activity_id'] != activity['id'] or activity['case_id'] != case['id']:
        raise ValueError('Record activity binding mismatch')
    records, rules = definitions['records'], policy['rules']
    ids = [r['id'] for r in records]
    rule_ids = [r['id'] for r in rules]
    if len(set(ids)) != len(ids) or len(set(rule_ids)) != len(rule_ids) or set(ids) != set(rule_ids):
        raise ValueError('Duplicate, missing or unknown record rule IDs')
    factual = {'id', 'title', 'date', 'aliases', 'conflicting_terms', 'result_evidence', 'content_refs'}
    allowed_policy = {'id', 'owner', 'release_on_firm_plan', 'availability',
                      'disclose_on_prior_evaluation', 'prior_evaluation_topics', 'prior_evaluation_context'}
    indexed = {r['id']: r for r in rules}
    reports = []
    for record in records:
        rule = indexed[record['id']]
        if set(record) != factual or not set(rule) <= allowed_policy:
            raise ValueError('Record facts and release rules must remain separate')
        if rule.get('owner') not in {'patient', 'facilitator'} or type(rule.get('release_on_firm_plan')) is not bool or not rule.get('availability'):
            raise ValueError('Incomplete or invalid release rule')
        if not record['content_refs']:
            raise ValueError('Record content is missing')
        for ref in record['content_refs']:
            local_file(root, ref)
        # Preserve the compatibility catalog's established field order.
        report = {key: record[key] for key in ['id', 'title']}
        report['owner'] = rule['owner']
        report['date'] = record['date']
        report.update({key: rule[key] for key in ['release_on_firm_plan', 'availability']})
        report.update({key: record[key] for key in ['aliases', 'conflicting_terms', 'result_evidence']})
        report.update({key: value for key, value in rule.items()
                       if key not in {'id', 'owner', 'release_on_firm_plan', 'availability'}})
        reports.append(report)
    return {'schema_version': 1, 'case_id': case['id'], 'reports': reports}


def assemble_case(root, case_ref, activity_ref=None, *, output_format='package', context=None):
    if output_format not in {'package', 'standalone'}:
        raise ValueError('Unknown case output format')
    root = root.resolve()
    case = json.loads(local_file(root, case_ref).read_text(encoding='utf-8'))
    index = json.loads(local_file(root, case['component_index_ref']).read_text(encoding='utf-8'))
    if index['schema_version'] != 1 or index['case_id'] != case['id']:
        raise ValueError('Component index does not match case')
    components = index['components']
    activity = load_activity(root, activity_ref) if activity_ref else None
    if activity and (activity['case_id'] != case['id'] or activity['case_ref'] != case_ref):
        raise ValueError('Activity case binding mismatch')
    bindings = activity.get('component_bindings', {}) if activity else {}
    expected = {c['activity_binding'] for c in components if 'activity_binding' in c}
    if set(bindings) != expected:
        raise ValueError('Activity component bindings are missing or unknown')
    if not components or len({c['id'] for c in components}) != len(components):
        raise ValueError('Empty or duplicate component IDs')
    paths = [c['path'] for c in components if 'path' in c]
    if len(set(paths)) != len(paths):
        raise ValueError('Duplicate component path')
    pieces = []
    for component in components:
        if component['role'] not in {'activity', 'learner', 'patient', 'facilitator', 'release'}:
            raise ValueError('Unclassified component role')
        variant = component.get('standalone', component) if output_format == 'standalone' else component
        if 'activity_binding' in component and variant is not component:
            raise ValueError('Bound components use fragment variants, not component overrides')
        fragments = bindings[component['activity_binding']] if 'activity_binding' in component else [{'scope': 'case', 'path': variant['path']}]
        if not fragments:
            raise ValueError('Empty activity composition')
        texts = []
        for fragment in fragments:
            fragment_path = fragment.get('standalone_path', fragment['path']) if output_format == 'standalone' else fragment['path']
            path = local_file(root, fragment_path)
            if fragment['scope'] == 'case':
                prefix = Path(case_ref).parent
                if not prefix.as_posix().startswith('pipeline/cases/'):
                    raise ValueError('Components must be author inputs under pipeline/cases')
            elif fragment['scope'] == 'activity' and activity:
                prefix = Path(activity_ref).parent
            else:
                raise ValueError('Unknown fragment scope')
            if prefix not in path.relative_to(root).parents:
                raise ValueError('Components must be author inputs within their declared case/activity')
            texts.append(path.read_text(encoding='utf-8'))
        text = render_text(''.join(texts), context or {})
        heading = variant['heading']
        if heading != 'preamble' and not text.startswith('## ' + heading + '\n'):
            raise ValueError('Component heading mismatch')
        pieces.append(text)
    return ''.join(pieces)
