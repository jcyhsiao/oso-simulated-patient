"""Expand explicit scalar placeholders once; never interpret source text as code."""
import re

TOKEN = re.compile(r'\{\{\s*([A-Za-z_][A-Za-z0-9_.]*)\s*\}\}')


def render_text(text, context):
    unmatched = TOKEN.sub('', text)
    if '{{' in unmatched or '}}' in unmatched:
        raise ValueError('Malformed author placeholder')

    def substitute(match):
        key = match[1]
        if key not in context:
            raise ValueError(f'Unknown or unavailable author placeholder: {key}')
        value = context[key]
        if not isinstance(value, (str, int, float)) or isinstance(value, bool):
            raise ValueError(f'Author placeholder is not scalar text: {key}')
        return str(value)

    # Values are not evaluated again, including text that resembles placeholders.
    return TOKEN.sub(substitute, text)
