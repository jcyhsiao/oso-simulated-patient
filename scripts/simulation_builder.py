"""Activity-selected compilation and offline packaging.

Inputs supply all clinical and portrayal text, metadata and format variants.
This module assembles and packages them without case-specific transformations.
"""
import argparse
import json
from pathlib import Path, PurePosixPath
from zipfile import ZIP_DEFLATED, ZipFile

import learning_modes
import pipeline_components as compiler
from record_catalog import render_catalog
from authored_text import render_text
from visual_inputs import load_visual


def output_path(root, name):
    """Validate a project-relative output even when it does not exist yet."""
    if not isinstance(name, str) or not name:
        raise ValueError('Output path is required')
    path = (root / name).resolve()
    if Path(name).is_absolute() or root.resolve() not in path.parents:
        raise ValueError(f'Output reference escapes project: {name}')
    return path


def package_name(name):
    path = PurePosixPath(name)
    if (not name or not path.parts or '\\' in name or path.is_absolute() or '..' in path.parts
            or path.as_posix() != name):
        raise ValueError(f'Invalid package member: {name}')
    return name


def validate_selections(activity):
    """Only the implemented single-guide and offline deployment contracts apply."""
    fields = {
        'feedback': {'guide_ref', 'modes_ref', 'title'},
        'deployment': {'adapter', 'bundle_dir', 'archive_path', 'standalone_path',
                       'standalone_title', 'assets'},
    }
    for name, expected in fields.items():
        value = activity.get(name)
        optional = {'inventory_format', 'base_instructions_path'} if name == 'deployment' else set()
        if not isinstance(value, dict) or not expected <= set(value) or not set(value) <= expected | optional:
            raise ValueError(f'Missing or unsupported {name} selection fields')
        for key in (expected | (set(value) & optional)) - {'assets'}:
            if not isinstance(value[key], str) or not value[key].strip():
                raise ValueError(f'Missing {name}.{key}')
    if activity['deployment'].get('inventory_format', 'explicit') not in {'compact', 'explicit'}:
        raise ValueError('Unsupported record inventory format')
    assets = activity['deployment']['assets']
    if not isinstance(assets, list):
        raise ValueError('Deployment assets must be an explicit list')
    for asset in assets:
        if (not isinstance(asset, dict) or set(asset) != {'source_ref', 'package_path'}
                or any(not isinstance(v, str) or not v.strip() for v in asset.values())):
            raise ValueError('Invalid deployment asset selection')


def compile_case_inputs(root, activity, activity_ref):
    """Compile supplied author content for each format without case-specific edits."""
    case = json.loads(compiler.local_file(root, activity['case_ref']).read_text(encoding='utf-8'))
    if case['id'] != activity['case_id']:
        raise ValueError('Activity case binding mismatch')
    inventory = compiler.compile_records(root, activity)
    context = {}

    def scalars(prefix, value):
        if isinstance(value, dict):
            for key, item in value.items():
                scalars(f'{prefix}.{key}', item)
        elif isinstance(value, (str, int, float)) and not isinstance(value, bool):
            context[prefix] = value

    # Deliberately exclude source paths, raw metadata and faculty-only review
    # fields. They never become implicitly publishable template variables.
    for key in ('id', 'version', 'encounter_date', 'patient'):
        if key in case:
            scalars('case.' + key, case[key])
    for key in ('id', 'runtime_revision'):
        if key in activity:
            scalars('activity.' + key, activity[key])
    scalars('visual', load_visual(root, case, activity['deployment']['assets']))
    catalog = render_catalog(inventory, include_policy=activity['deployment'].get('inventory_format', 'explicit') == 'explicit')
    context['records.inventory'] = catalog
    outputs = []
    for output_format in ('package', 'standalone'):
        text = compiler.assemble_case(root, activity['case_ref'], activity_ref,
                                     output_format=output_format, context=context)
        if text.count(catalog) > 1:
            raise ValueError('Duplicate record inventory placement')
        if inventory['reports'] and catalog not in text:
            text = text.rstrip() + '\n\n' + catalog
        outputs.append(text)
    return *outputs, context, inventory


def build(root, activity_ref):
    root = Path(root).resolve()
    activity = compiler.load_activity(root, activity_ref)
    validate_selections(activity)
    deployment = activity['deployment']
    if deployment['adapter'] != 'native-v1':
        raise ValueError(f"Unsupported deployment adapter: {deployment['adapter']}")
    case, single_case, context, inventory = compile_case_inputs(root, activity, activity_ref)
    modes, review = learning_modes.references(root, activity)
    base = render_text(compiler.local_file(root, activity['shared_instructions_ref']).read_text(encoding='utf-8'), context)
    standalone_ref = activity.get('standalone_instructions_ref', activity['shared_instructions_ref'])
    single_base = render_text(compiler.local_file(root, standalone_ref).read_text(encoding='utf-8'), context)
    skill = render_text(compiler.local_file(root, activity['portrayal_ref']).read_text(encoding='utf-8'), context).encode('utf-8')
    policy = render_text(compiler.local_file(root, activity['release_policy_ref']).read_text(encoding='utf-8'), context)
    if len(base.encode('utf-16-le')) // 2 > 8000:
        raise ValueError('Base Instructions exceed 8,000 characters')
    if len(skill.decode('utf-8').encode('utf-16-le')) // 2 >= 20000:
        raise ValueError('Skill instructions must be under 20,000 characters')
    single = learning_modes.standalone(single_base, policy, single_case, modes, review,
                                       deployment['standalone_title'])
    members = {
        'SKILL.md': skill,
        'references/case.md': case.encode('utf-8'),
        'references/result-release.md': policy.encode('utf-8'),
        'references/learning-modes.md': modes.encode('utf-8'),
        'references/summary-guide.md': review.encode('utf-8'),
    }
    asset_sources = []
    for asset in deployment['assets']:
        name = package_name(asset['package_path'])
        if name in members:
            raise ValueError(f'Duplicate package member: {name}')
        source = compiler.local_file(root, asset['source_ref'])
        asset_sources.append(source)
        members[name] = source.read_bytes()
    # Resolve every destination and reject collisions before writing anything.
    bundle = output_path(root, deployment['bundle_dir'])
    archive = output_path(root, deployment['archive_path'])
    single_path = output_path(root, deployment['standalone_path'])
    catalog_path = output_path(root, activity['record_catalog_ref'])
    base_source = compiler.local_file(root, activity['shared_instructions_ref'])
    base_path = (output_path(root, deployment['base_instructions_path'])
                 if 'base_instructions_path' in deployment else base_source)
    if base.encode('utf-8') != base_source.read_bytes() and base_path == base_source:
        raise ValueError('Rendered base instructions require a separate base_instructions_path')
    outputs = {bundle / name: data for name, data in members.items()}
    destinations = [*outputs, archive, single_path, catalog_path]
    if 'base_instructions_path' in deployment:
        destinations.append(base_path)
    resolved = [output_path(root, p.relative_to(root).as_posix()) for p in destinations]
    if len(set(resolved)) != len(resolved):
        raise ValueError('Output destinations collide')
    if any(a in b.parents for a in resolved for b in resolved if a != b):
        raise ValueError('Output file/directory destinations collide')
    # Never replace authored inputs. SKILL.md may retain its historical location
    # inside the bundle, but must be byte-identical when used as both input/output.
    inputs = set(asset_sources)
    visited = set()
    def collect_refs(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if key.endswith('_ref') and isinstance(item, str) and key != 'record_catalog_ref':
                    path = compiler.local_file(root, item)
                    inputs.add(path)
                    if path.suffix == '.json' and path not in visited:
                        visited.add(path)
                        collect_refs(json.loads(path.read_text(encoding='utf-8')))
                elif key.endswith('_refs') and isinstance(item, list):
                    for name in item:
                        inputs.add(compiler.local_file(root, name))
                elif (key == 'path' or key == 'standalone_path' and 'scope' in value) and isinstance(item, str):
                    inputs.add(compiler.local_file(root, item))
                else:
                    collect_refs(item)
        elif isinstance(value, list):
            for item in value:
                collect_refs(item)
    inputs.add(compiler.local_file(root, activity_ref))
    collect_refs(activity)
    portrayal = compiler.local_file(root, activity['portrayal_ref'])
    for path in resolved:
        if path.is_dir():
            raise ValueError(f'Output file is an existing directory: {path}')
        if path in inputs and not (path == portrayal == bundle / 'SKILL.md'
                                   and members['SKILL.md'] == portrayal.read_bytes()):
            raise ValueError(f'Output would overwrite author input: {path.relative_to(root)}')
    # A previous bundle can contain obsolete assets/policies. Do not silently
    # leave those files available to a runtime after switching compositions.
    if bundle.exists():
        stale = {p.relative_to(bundle).as_posix() for p in bundle.rglob('*') if p.is_file()} - members.keys()
        if stale:
            raise ValueError(f'Bundle contains unselected files; choose a clean bundle directory: {sorted(stale)}')
    if 'base_instructions_path' in deployment:
        outputs[base_path] = base.encode('utf-8')
    outputs[single_path] = single.encode('utf-8')
    outputs[catalog_path] = (json.dumps(inventory, indent=2) + '\n').encode('utf-8')
    for path, data in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    archive.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(archive, 'w', ZIP_DEFLATED) as zipped:
        for name in members:
            zipped.write(bundle / name, arcname=name)
    return {'activity_id': activity['id'], 'archive': archive, 'members': len(members),
            'standalone': single_path, 'base_instructions': base_path}


def main(default_activity=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--activity', default=default_activity, required=default_activity is None,
                        help='Project-relative activity manifest path')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    result = build(root, args.activity)
    print(f"Built {result['activity_id']}: {result['archive'].relative_to(root)} "
          f"({result['members']} files), {result['standalone'].relative_to(root)}")
