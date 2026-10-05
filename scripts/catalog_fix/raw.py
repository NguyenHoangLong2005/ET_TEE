"""Loaders for the crawled source files in scripts/raw_data/.

Nested fields in the raw dumps were written with str(dict), so they are parsed back with
ast.literal_eval rather than json.
"""
import ast
import html
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

RAW = Path(__file__).resolve().parents[1] / 'raw_data'


def _load(name):
    data = json.loads((RAW / name).read_text(encoding='utf-8'))
    return data if isinstance(data, list) else data.get('products', data)


def lit(value):
    if isinstance(value, str) and value[:1] in '[{(':
        try:
            return ast.literal_eval(value)
        except (ValueError, SyntaxError):
            return value
    return value


def url_path(url):
    return urlsplit(url).path


def html_to_text(raw_html):
    """Strip tags/entities into plain paragraphs."""
    if not raw_html:
        return ''
    text = re.sub(r'(?is)<(script|style).*?</\1>', ' ', raw_html)
    text = re.sub(r'(?i)<\s*(br|/p|/li|/h[1-6]|/div)\s*/?>', '\n', text)
    text = re.sub(r'(?i)<\s*li[^>]*>', '\n- ', text)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text).replace('\xa0', ' ')
    lines = [re.sub(r'[ \t]+', ' ', ln).strip() for ln in text.split('\n')]
    out = []
    for ln in lines:
        if ln and ln != '-' and (not out or out[-1] != ln):
            out.append(ln)
    return '\n'.join(out)


def gumac():
    """Index GUMAC products by every gallery image path."""
    by_path = {}
    for p in _load('gumac_raw.json'):
        p['colors'] = lit(p.get('colors')) or []
        p['sku'] = lit(p.get('sku')) or []
        p['sizes'] = lit(p.get('sizes')) or []
        p['outstandingFeatures'] = lit(p.get('outstandingFeatures')) or []
        for c in p['colors']:
            for g in (c.get('media') or {}).get('gallery') or []:
                by_path['/' + g['path'].lstrip('/')] = (p, c)
    return by_path


def yame():
    """YaMe products by Shopify image path."""
    by_path = {}
    for p in _load('yame_raw.json'):
        p['variants'] = lit(p.get('variants')) or []
        p['images'] = lit(p.get('images')) or []
        p['options'] = lit(p.get('options')) or []
        for img in p['images']:
            src = img.get('src') if isinstance(img, dict) else img
            if src:
                by_path[url_path(src)] = p
    return by_path


def coolmate():
    out = {}
    for p in _load('coolmate_raw.json'):
        p['mapped_variants'] = lit(p.get('mapped_variants')) or {}
        p['tags'] = lit(p.get('tags')) or []
        out[p['title'].strip().lower()] = p
    return out


def yody():
    out = {}
    for p in _load('yody_raw.json'):
        sv = lit(p.get('select_variant')) or {}
        p['select_variant'] = sv
        p['product_colors'] = lit(p.get('product_colors')) or []
        if sv.get('name'):
            out.setdefault(sv['name'].strip().lower(), p)
    return out
