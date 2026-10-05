"""Đóng gói ảnh chính có đường dẫn tương đối (/images/..., /uploads/...) thành local_images.zip để upload
lên Google Drive cho notebook Colab (Colab không đọc được web/public của máy local).

Chỉ ĐỌC DB (transaction READ ONLY). Không ghi gì vào DB.

    python scripts/embeddings/package_local_images.py
    -> scripts/embeddings/colab_upload/local_images.zip  (upload vào MyDrive/fashion-embeddings/)
"""
import zipfile

from common import ROOT, connect

OUT = ROOT / 'scripts' / 'embeddings' / 'colab_upload' / 'local_images.zip'

SQL = """
SELECT DISTINCT ON (product_id) image_url FROM public.product_images
ORDER BY product_id, is_primary DESC NULLS LAST, sort_order NULLS LAST, id
"""


def main():
    conn = connect()
    with conn.cursor() as cur:
        cur.execute('SET TRANSACTION READ ONLY')
        cur.execute(SQL)
        urls = sorted({r[0] for r in cur.fetchall() if r[0] and r[0].startswith('/')})
    conn.rollback()
    conn.close()

    OUT.parent.mkdir(parents=True, exist_ok=True)
    missing, added = [], 0
    with zipfile.ZipFile(OUT, 'w', compression=zipfile.ZIP_STORED) as zf:  # webp/jpg đã nén sẵn
        for url in urls:
            base = ROOT / 'backend' if url.startswith('/uploads/') else ROOT / 'web' / 'public'
            path = base / url.lstrip('/')
            if path.is_file():
                zf.write(path, arcname=url.lstrip('/'))
                added += 1
            else:
                missing.append(url)
    print(f'{added}/{len(urls)} ảnh -> {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)')
    if missing:
        print(f'{len(missing)} ảnh không có trên đĩa (sẽ dùng fallback text):', *missing[:10], sep='\n  ')


if __name__ == '__main__':
    main()
