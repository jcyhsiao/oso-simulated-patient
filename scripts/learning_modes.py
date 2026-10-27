"""Render activity-selected qualitative feedback and standalone packaging."""
import hashlib
import json
from pipeline_components import local_file


def references(root, activity):
    selection = activity['feedback']
    guide = json.loads(local_file(root, selection['guide_ref']).read_text(encoding='utf-8'))
    if (guide['schema_version'] != 1 or guide['case_id'] != activity['case_id']
            or guide['activity_id'] != activity['id'] or guide['numeric_scoring'] is not False):
        raise ValueError('Invalid formative guide binding or unsupported scoring')
    source = local_file(root, guide['source_ref'])
    if hashlib.sha256(source.read_bytes()).hexdigest() != guide['reviewed_source_sha256']:
        raise ValueError('Faculty source changed; reconcile the summary guide before rebuilding')
    domains = guide['domains']
    if not domains or len({d['id'] for d in domains}) != len(domains):
        raise ValueError('Empty or duplicate summary domains')
    modes = local_file(root, selection['modes_ref']).read_text(encoding='utf-8')
    review = '# ' + selection['title'] + '\n\n' + guide['limitations'] + '\n\n'
    for domain in domains:
        review += f"- {domain['id']} ({domain['source_section']}): {domain['criteria']}\n"
    return modes, review + '\n' + guide['additional_observations'] + '\n'


def standalone(base, policy, case, modes, review, title):
    text = '# ' + title + '\n\nFaculty-review test build. Persistent system/agent instructions, not a learner message.\n\n'
    text += base + '\n' + modes + '\n' + review + '\n' + policy
    text += '\n\nBEGIN INLINE CASE — CONCEALED EXCEPT AS RELEASE RULES PERMIT\n\n' + case.rstrip() + '\n\nEND INLINE CASE\n'
    # Reserve room for hosts that count pasted newlines/serialization differently.
    # Count CRLF and UTF-8 bytes too rather than relying on one UI character count.
    sizes = [len(text.encode('utf-16-le')) // 2,
             len(text.replace('\n', '\r\n').encode('utf-16-le')) // 2,
             len(text.encode('utf-8'))]
    if max(sizes) > 48000:
        raise ValueError(f'Standalone exceeds the 48,000-unit safety budget: {sizes}')
    return text
