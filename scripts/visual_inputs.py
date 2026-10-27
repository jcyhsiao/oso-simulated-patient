"""Validate supplied visual evidence without publishing raw source metadata."""
import json
from zipfile import ZipFile
from xml.etree import ElementTree as ET

from pipeline_components import local_file

APPROVED_FIELDS = ('visible_description', 'symptom_location', 'location_answer', 'visual_answer')


def embedded_alt_text(document):
    """Read Word picture title/description metadata; never execute it."""
    with ZipFile(document) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    return [text.strip() for element in root.iter()
            if element.tag.rsplit('}', 1)[-1] in {'docPr', 'cNvPr'}
            for key in ('title', 'descr')
            if (text := element.get(key, '')).strip()]


def approved_visual_fields(spec, metadata, expected_case_id):
    if spec.get('schema_version') != 1 or spec.get('case_id') != expected_case_id:
        raise ValueError('Visual description case binding mismatch')
    if spec.get('approved') is not True:
        raise ValueError('Visual description needs faculty approval')
    if metadata != spec.get('reviewed_embedded_alt_text'):
        raise ValueError('Image alternative text changed; reconcile with case facts and approve descriptions before rebuilding')
    for key in APPROVED_FIELDS:
        if not isinstance(spec.get(key), str) or not spec[key].strip():
            raise ValueError(f'Missing approved visual field: {key}')
    return {key: spec[key] for key in APPROVED_FIELDS}


def load_visual(root, case, assets):
    """An absent visual selection requires no image or document input."""
    if case.get('photo_ref'):
        photograph = local_file(root, case['photo_ref'])
        if photograph not in {local_file(root, asset['source_ref']) for asset in assets}:
            raise ValueError('Case photograph is missing from the selected deployment assets')
    if not case.get('visual_ref'):
        if case.get('visual_source_document_ref'):
            raise ValueError('Visual source document requires a visual description selection')
        return {}
    spec = json.loads(local_file(root, case['visual_ref']).read_text(encoding='utf-8'))
    source = case.get('visual_source_document_ref')
    metadata = embedded_alt_text(local_file(root, source)) if source else []
    return approved_visual_fields(spec, metadata, case['id'])
