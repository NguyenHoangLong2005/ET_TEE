import re
import unicodedata


def slugify(text, max_len=None):
    text = (text or '').replace('đ', 'd').replace('Đ', 'D')
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    text = re.sub(r'[^a-zA-Z0-9]+', '-', text).strip('-').lower()
    if max_len:
        text = text[:max_len].rstrip('-')
    return text


def color_code(name):
    """Stable short code for a colour name, used to tie variants to their gallery images."""
    return slugify(name, 30) or None
