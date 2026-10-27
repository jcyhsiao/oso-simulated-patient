#!/usr/bin/env python3
"""Extract author review views from the existing runtime, without deploying them."""
import argparse
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'pipeline/reference-views/shannon-anderson'
SOURCE = 'packages/fnp-shannon-anderson/references/case.md'

# Exact section names make new or renamed source sections require classification.
ROLES = {
    'Configuration and source precedence': ['faculty'],
    'Learner-facing briefing': ['faculty'],
    'Patient role and opening': ['patient'],
    'Patient symptom history with progressive disclosure': ['patient'],
    'Patient history': ['patient'],
    'Telehealth examination and facilitator findings': ['facilitator'],
    'Prior assessment of this complaint': ['patient'],
    'Diagnostic record inventory': ['release'],
    'Laboratory and radiology release rules': ['release'],
    'Interaction flow and reactions — concealed from learner': ['patient'],
    'Approved visual reference and symptom location': ['patient'],
    'Packaged foot photograph and release rules': ['patient'],
    'Historical laboratory appendix March 4 2025': ['facilitator'],
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def split_sections(text):
    matches = list(re.finditer(r'^## (.+)$', text, re.M))
    names = [m[1] for m in matches]
    if len(set(names)) != len(names) or set(names) != set(ROLES):
        raise ValueError('Source sections changed; review role classification')
    pieces = [text[:matches[0].start()]]
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        pieces.append(text[match.start():end])
    if ''.join(pieces) != text:
        raise ValueError('Source reconstruction failed')
    return names, pieces


def outputs():
    source_bytes = (ROOT / SOURCE).read_bytes()
    text = source_bytes.decode('utf-8')
    names, pieces = split_sections(text)
    result = {}
    entries = []
    for index, piece in enumerate(pieces):
        filename = f'sections/{index:02}.md'
        result[filename] = piece.encode('utf-8')
        entries.append({'path': filename, 'heading': names[index - 1] if index else 'preamble',
                        'roles': ROLES[names[index - 1]] if index else ['faculty'],
                        'sha256': digest(result[filename])})
    # The briefing's operational introductory paragraph belongs to authors.
    briefing = pieces[names.index('Learner-facing briefing') + 1]
    learner_start = briefing.index('### Intake January 29 2026\n')
    result['learner-briefing.md'] = briefing[learner_start:].encode('utf-8')
    for role in ['patient', 'facilitator', 'release']:
        header = (f'# Shannon {role} reference for author review\n\n'
                  'Not a standalone runtime prompt. Apply the existing shared instructions, '
                  'release policy and activity binding. Faculty retains the complete view.\n\n')
        result[f'{role}-reference.md'] = (header + ''.join(
            piece for entry, piece in zip(entries, pieces) if role in entry['roles'])).encode('utf-8')
    faculty = '# Comprehensive Shannon faculty reference\n\n'
    faculty += 'Author-only. Includes learner-releasable information; release only under the applicable activity rules.\n\n'
    faculty += text
    for path in ['instructions/result-release-policy.md', 'cases/case-b-author-review.md']:
        faculty += f'\n\n# Faculty supporting reference: {path}\n\n' + (ROOT / path).read_text()
    # Keep faculty key in a distinct file, preserving original as the authority.
    import xml.etree.ElementTree as ET
    from zipfile import ZipFile
    source_map = json.loads((ROOT / 'pipeline/cases/shannon-anderson/source-map.json').read_text())
    originals = {s['path']: digest((ROOT / s['path']).read_bytes()) for s in source_map['sources']}
    activity = json.loads((ROOT / 'pipeline/activities/fnp-telehealth-practice/activity.json').read_text())
    facilitator = json.loads((ROOT / activity['facilitator_ref']).read_text())
    key_path = facilitator['concealed_reference']['source_ref']
    with ZipFile(ROOT / key_path) as archive:
        xml = ET.fromstring(archive.read('word/document.xml'))
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    paragraphs = [''.join(t.text or '' for t in p.findall('.//w:t', ns))
                  for p in xml.findall('.//w:p', ns)]
    key = '# Original faculty sheet text for author review\n\n'
    key += f'Source: {key_path}\n\nText extraction only; original document remains authoritative. No clinical recommendations are independently validated.\n\n'
    key += '\n\n'.join(p for p in paragraphs if p) + '\n'
    result['faculty-source-text.md'] = key.encode('utf-8')
    faculty += '\n\nSee faculty-source-text.md for the original faculty sheet and source-map.json for all nine original documents.\n'
    result['faculty-reference.md'] = faculty.encode('utf-8')
    manifest = {'schema_version': 1, 'source': SOURCE, 'source_sha256': digest(source_bytes),
                'original_source_sha256': originals, 'sections': entries,
                'outputs_sha256': {p: digest(data) for p, data in result.items()},
                'limitations': 'Author review views, not technical role isolation or independently deployable prompts. Release reference includes patient-held report contents; facilitator retains full faculty access.'}
    result['manifest.json'] = (json.dumps(manifest, indent=2, ensure_ascii=False) + '\n').encode('utf-8')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check stored views without writing')
    args = parser.parse_args()
    expected = outputs()
    if args.check:
        for name, data in expected.items():
            if not (OUTPUT / name).is_file() or (OUTPUT / name).read_bytes() != data:
                raise ValueError(f'Missing or stale view: {name}')
        manifest = json.loads(expected['manifest.json'])
        reconstructed = b''.join((OUTPUT / s['path']).read_bytes() for s in manifest['sections'])
        if reconstructed != (ROOT / SOURCE).read_bytes():
            raise ValueError('Extracted sections do not reconstruct runtime byte for byte')
        print('Views match sources; all sections reconstruct runtime byte for byte. No deployment files written.')
    else:
        for name, data in expected.items():
            path = OUTPUT / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        print(f'Created {len(expected)} author reference files. Existing runtime untouched.')


if __name__ == '__main__':
    main()
