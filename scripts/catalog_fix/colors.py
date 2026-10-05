"""Colour-name cleanup and name -> hex resolution for crawled variants."""
import colorsys
import hashlib
import re

# Leading words that describe a pattern/pack rather than the colour itself.
_PREFIX = re.compile(r'^(?:màu|kẻ sọc|kẻ|sọc|hoạ tiết|họa tiết|tiết|phối màu|phối|combo|pack|mix)\s+', re.I)
# Trailing supplier codes: "ĐEN 002", "Rêu-SI041", "Nâu - SN251", "Tím than.".
_CODE = re.compile(r'[\s\-_.]*(?:[A-Z]{1,3}\d{2,}|\d{2,})?[\s.]*$')

# First match wins; checked against the cleaned, lower-cased name with pattern prefixes removed.
_FAMILIES = [
    (r'tím than|tim than', '#2E3550'),
    (r'xanh navy|navy', '#1F2A44'),
    (r'xanh than|xanh bóng đêm|xanh đen|than nhạt|lam thẫm', '#1E293B'),
    (r'than chì|chì|ghi|xám|xam|grey|gray|melange|bạc|silver|ánh bạc|thiếc|nickel|nickle|tarmac|shark', '#8E9196'),
    (r'đen|den\b|black', '#111111'),
    (r'trắng|white', '#FFFFFF'),
    (r'kem|cream|egret', '#F3EBDD'),
    (r'be|beige|bee|begie|kaki|khaki|camel|cát|trench', '#D6C2A0'),
    (r'nâu|brown|mocha|coffee|cà phê|socola|chocolate|ganache|iron', '#7B4B2A'),
    (r'đỏ|do\b|red|đô|đun|dahlia|marsala|barbados|rhythmic|rthymic|apple', '#C62828'),
    (r'hồng|pink|lotus|rose', '#EC8FB0'),
    (r'cam|orange|đào|xoài|tigerlily|camelia|sadalwood', '#EF7D22'),
    (r'vàng|vang|yellow|gold|chanh|haze', '#F2C230'),
    (r'tím|purple|lavender|lan\b|iris', '#7E57C2'),
    (r'chàm|indigo', '#3F4C9E'),
    (r'xanh ngọc|ngọc lam|ngọc|aqua|cổ vịt|teal|mint|xanh hồ|hồ\b|turquoise', '#1E9E95'),
    (r'xanh lá|xanh rêu|rêu|reu|olive|ôliu|lục|xanh chuối|hunter|evergreen|botanical|laurel|forest', '#3E7D3A'),
    (r'xanh|blue|lam|da trời|biển|coban|cobalt|jean|denim|wash|poseidon|adriatic|danube|royal|french', '#2F6FBF'),
]
_FAMILIES = [(re.compile(rf'(?<!\w)(?:{p})'), h) for p, h in _FAMILIES]
_DARK = re.compile(r'đậm|sẫm|tối|dark|deep|thẫm')
_LIGHT = re.compile(r'nhạt|sáng|light|phớt|pastel|baby')

PLACEHOLDER = {'mặc định', 'default title', 'free size', 'freesize', 'không màu', ''}
# GUMAC colour abbreviations.
ABBR = {'xdam': 'Xanh đậm', 'hnhat': 'Hồng nhạt', 'hdam': 'Hồng đậm', 'xdtr': 'Xanh da trời'}


def clean_name(name):
    if name is None:
        return None
    s = re.sub(r'\s+', ' ', name).strip()
    s = _CODE.sub('', s).strip(' -.')
    s = re.sub(r'^màu\s+', '', s, flags=re.I)
    if not s:
        return None
    if s.lower() in PLACEHOLDER:
        return None
    if s.lower() in ABBR:
        return ABBR[s.lower()]
    if s.isdigit():
        return f'Mẫu {s}'
    return s[0].upper() + s[1:].lower()


def _adjust(hex_, factor):
    r, g, b = (int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    l = max(0.05, min(0.95, l * factor if factor < 1 else l + (1 - l) * (factor - 1)))
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return '#%02X%02X%02X' % (round(r * 255), round(g * 255), round(b * 255))


def hex_for(name):
    """Best-effort hex for a cleaned colour name; deterministic fallback for unknown names."""
    s = name.lower()
    core = s
    while True:
        stripped = _PREFIX.sub('', core)
        if stripped == core:
            break
        core = stripped
    # The colour named first is the dominant one ("Đen - xám - trắng" is black); ties go to
    # the more specific family listed first ("xanh navy" before "xanh").
    hits = [(m.start(), i) for i, (pat, _) in enumerate(_FAMILIES) if (m := pat.search(core))]
    if not hits:
        digest = hashlib.md5(s.encode()).hexdigest()
        return '#' + digest[:6].upper()
    hex_ = _FAMILIES[min(hits)[1]][1]
    if _DARK.search(core) and hex_ not in ('#111111',):
        hex_ = _adjust(hex_, 0.7)
    elif _LIGHT.search(core) and hex_ not in ('#FFFFFF',):
        hex_ = _adjust(hex_, 1.35)
    return hex_


def valid_hex(hex_):
    """Normalise '#abc'/'#AABBCC' to '#AABBCC'; None for anything else (incl. the #000000 seed default)."""
    m = re.fullmatch(r'#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})', (hex_ or '').strip())
    if not m:
        return None
    h = m[1] if len(m[1]) == 6 else ''.join(c * 2 for c in m[1])
    h = '#' + h.upper()
    return None if h == '#000000' else h


def distinct(hex_, used):
    """Nudge lightness until the swatch differs from the ones already used in the product.
    The storefront groups variants by colorHex, so two colours sharing a hex would merge."""
    step = 0
    candidate = hex_.upper()
    while candidate in used:
        step += 1
        candidate = _adjust(hex_, 1 + 0.12 * step if step % 2 else 1 - 0.12 * step)
        if step > 12:
            candidate = '#' + hashlib.md5(f'{hex_}{step}'.encode()).hexdigest()[:6].upper()
    return candidate


SIZE_MAP = {
    'free size': 'One Size', 'freesize': 'One Size', 'default title': 'One Size', 'onesize': 'One Size',
    'one size': 'One Size', 'xxxl': '3XL', '3xl': '3XL', '2xl': 'XXL', '4xl': '4XL',
}


def clean_size(size):
    if size is None:
        return None
    s = re.sub(r'\s+', ' ', size).strip()
    return SIZE_MAP.get(s.lower(), s)
