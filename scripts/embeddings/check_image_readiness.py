"""Kiểm tra readiness nguồn ảnh trước khi chạy notebook Colab. CHỈ ĐỌC: DB chạy READ ONLY, không tạo embedding.

- Đếm sản phẩm theo loại ảnh chính (cùng cách chọn ảnh như notebook: is_primary, sort_order, id).
- Đối chiếu local_images.zip với các đường dẫn /images/... trong DB và decode từng ảnh trong zip.
- Thăm dò mọi URL remote: GET Range 0-65535 -> HTTP status, Content-Type, đọc được header ảnh (định dạng, kích thước).
  Không tải toàn bộ ảnh (notebook mới tải). Ảnh đã có trong cache cũ thì decode toàn bộ.

    python scripts/embeddings/check_image_readiness.py
"""
import hashlib
import io
import json
import zipfile
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

import requests
from PIL import Image
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from common import ROOT, connect

ZIP = ROOT / 'scripts' / 'embeddings' / 'colab_upload' / 'local_images.zip'
OLD_CACHE = ROOT / 'scripts' / 'embeddings' / '.cache' / 'images'
REPORT = ROOT / 'scripts' / 'embeddings' / 'colab_upload' / 'image_readiness.json'

# giống notebook: ảnh chính của mọi sản phẩm (mọi status)
SQL = """
SELECT p.id, p.status,
       (SELECT i.image_url FROM public.product_images i WHERE i.product_id = p.id
        ORDER BY i.is_primary DESC NULLS LAST, i.sort_order NULLS LAST, i.id LIMIT 1) AS image_url,
       (SELECT count(*) FROM public.product_images i WHERE i.product_id = p.id) AS n_images
FROM public.products p ORDER BY p.id
"""


def session():
    s = requests.Session()
    retry = Retry(total=3, backoff_factor=1.0, status_forcelist=(429, 500, 502, 503, 504),
                  allowed_methods=('GET',), raise_on_status=False)
    s.mount('https://', HTTPAdapter(max_retries=retry, pool_maxsize=32))
    s.mount('http://', HTTPAdapter(max_retries=retry, pool_maxsize=32))
    s.headers['User-Agent'] = 'Mozilla/5.0 (product-embedding-pipeline)'
    return s


SESSION = session()


def probe(url):
    cached = OLD_CACHE / hashlib.sha1(url.encode()).hexdigest()
    if cached.exists():
        try:
            with Image.open(io.BytesIO(cached.read_bytes())) as im:
                im.load()
                return 'ok_full_decode_cached', f'{im.format} {im.size}'
        except Exception as e:  # noqa: BLE001
            pass  # cache hỏng -> thăm dò online
    try:
        r = SESSION.get(url, headers={'Range': 'bytes=0-65535'}, timeout=(10, 30), stream=True)
        if r.status_code not in (200, 206):
            return f'http_{r.status_code}', ''
        ctype = r.headers.get('Content-Type', '')
        data = r.raw.read(65536, decode_content=True)
        r.close()
        if ctype and not ctype.startswith('image/') and 'octet-stream' not in ctype:
            return 'not_image', ctype
        try:
            with Image.open(io.BytesIO(data)) as im:  # chỉ đọc header
                return 'ok_header', f'{im.format} {im.size}'
        except Exception:  # noqa: BLE001
            return 'header_unreadable', ctype
    except requests.exceptions.Timeout:
        return 'timeout', ''
    except requests.exceptions.ConnectionError:
        return 'connection_error', ''
    except Exception as e:  # noqa: BLE001
        return f'error_{type(e).__name__}', ''


def main():
    conn = connect()
    with conn.cursor() as cur:
        cur.execute('SET TRANSACTION READ ONLY')
        cur.execute(SQL)
        rows = cur.fetchall()
    conn.rollback()
    conn.close()

    total = len(rows)
    status = Counter(r[1] for r in rows)
    no_img = [r for r in rows if not r[2]]
    local = [r for r in rows if r[2] and r[2].startswith('/')]
    remote = [r for r in rows if r[2] and r[2].startswith('http')]
    other = [r for r in rows if r[2] and not r[2].startswith(('/', 'http'))]
    print(f'1. Tổng products (notebook embed mọi status): {total}  {dict(status)}')
    print(f'2. Ảnh chính local (/images, /uploads):      {len(local)}  (/uploads: {sum(r[2].startswith("/uploads/") for r in local)})')
    print(f'3. Ảnh chính remote (http/https):            {len(remote)}  hosts: '
          f'{dict(Counter(r[2].split("/")[2] for r in remote))}')
    print(f'4. Không có ảnh:                             {len(no_img)}  ids={[r[0] for r in no_img]} '
          f'status={[r[1] for r in no_img]}')
    if other:
        print(f'   ! URL dạng lạ: {len(other)} {[r[2] for r in other[:5]]}')
    assert len(local) + len(remote) + len(no_img) + len(other) == total

    # 5. zip
    need = {r[2].lstrip('/') for r in local}
    zip_ok, zip_bad, zip_mismatch = 0, [], []
    with zipfile.ZipFile(ZIP) as zf:
        names = set(zf.namelist())
        for n in sorted(need & names):
            data = zf.read(n)
            disk = (ROOT / ('backend' if n.startswith('uploads/') else 'web/public') / n).read_bytes()
            if data != disk:
                zip_mismatch.append(n)
            try:
                with Image.open(io.BytesIO(data)) as im:
                    im.load()
                zip_ok += 1
            except Exception:  # noqa: BLE001
                zip_bad.append(n)
    missing_in_zip = sorted(need - names)
    print(f'5. local_images.zip: {len(names)} file; cần {len(need)} đường dẫn duy nhất '
          f'({len(local)} products); thiếu trong zip {len(missing_in_zip)}; thừa {len(names - need)}; '
          f'decode được {zip_ok}; hỏng {len(zip_bad)}; khác file trên đĩa {len(zip_mismatch)}')

    # 6. remote
    urls = sorted({r[2] for r in remote})
    with ThreadPoolExecutor(16) as pool:
        results = dict(zip(urls, pool.map(probe, urls)))
    rc = Counter(v[0] for v in results.values())
    bad = {u: v for u, v in results.items() if not v[0].startswith('ok_')}
    print(f'6. Remote: {len(urls)} URL duy nhất ({len(remote)} products): {dict(rc)}')
    for u, v in list(bad.items())[:20]:
        print(f'   ! {v[0]} {v[1]} {u}')

    bad_products = [r[0] for r in remote if r[2] in bad]
    ready_img = len(local) - sum(1 for r in local if r[2].lstrip('/') in set(missing_in_zip) | set(zip_bad)) \
        + len(remote) - len(bad_products)
    print(f'7. Products có nguồn ảnh dùng được: {ready_img}/{total}; text-only dự kiến: '
          f'{total - ready_img} (không ảnh {len(no_img)} + remote lỗi {len(bad_products)} + zip thiếu/hỏng '
          f'{len(missing_in_zip) + len(zip_bad)})')
    REPORT.write_text(json.dumps({
        'total': total, 'status': dict(status), 'local': len(local), 'remote': len(remote),
        'no_image_ids': [r[0] for r in no_img], 'zip_missing': missing_in_zip, 'zip_bad': zip_bad,
        'remote_status': dict(rc), 'remote_bad': {u: v for u, v in bad.items()},
        'remote_bad_product_ids': bad_products, 'products_with_usable_image': ready_img,
    }, ensure_ascii=False, indent=1), encoding='utf-8')
    print('Report:', REPORT)


if __name__ == '__main__':
    main()
