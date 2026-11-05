"""Sinh anh bang chung giao hang MINH HOA cho du lieu demo (DemoDataSeeder).

Moi anh la mot kien hang ET.TEE truoc cua / tren tay nguoi nhan, co chu ky va ghi ro
"Anh minh hoa - du lieu demo" de khong bi nham voi anh that.

Chay:  python scripts/demo/make_proof_images.py
Ket qua: backend/src/main/resources/demo/proofs/proof-1.jpg ... proof-6.jpg
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parents[2] / 'backend' / 'src' / 'main' / 'resources' / 'demo' / 'proofs'
W, H = 900, 675

SCENES = [  # (nen tren, nen duoi, mau san, ghi chu)
    ((236, 229, 216), (205, 190, 168), (120, 98, 78), 'Đặt trước cửa nhà'),
    ((222, 230, 236), (186, 198, 210), (92, 96, 104), 'Giao tận tay người nhận'),
    ((240, 236, 228), (214, 204, 186), (150, 126, 100), 'Gửi bảo vệ chung cư'),
    ((228, 236, 226), (190, 206, 186), (104, 116, 96), 'Đặt trước cửa hàng'),
    ((238, 230, 230), (210, 192, 192), (124, 100, 100), 'Giao tận tay người nhận'),
    ((232, 232, 238), (198, 198, 212), (96, 96, 116), 'Gửi lễ tân văn phòng'),
]


def font(size, bold=False):
    for name in (('segoeuib.ttf', 'arialbd.ttf') if bold else ('segoeui.ttf', 'arial.ttf')):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def gradient(top, bottom):
    img = Image.new('RGB', (W, H), top)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return img


def parcel(d, cx, cy, w, h, rnd):
    depth = int(w * 0.28)
    front = (196, 152, 104)
    side = (168, 126, 84)
    top = (214, 174, 128)
    x0, y0 = cx - w // 2, cy - h // 2
    d.polygon([(x0, y0), (x0 + w, y0), (x0 + w + depth, y0 - depth // 2), (x0 + depth, y0 - depth // 2)], fill=top)
    d.polygon([(x0 + w, y0), (x0 + w + depth, y0 - depth // 2), (x0 + w + depth, y0 + h - depth // 2), (x0 + w, y0 + h)], fill=side)
    d.rectangle([x0, y0, x0 + w, y0 + h], fill=front)
    # bang keo
    d.rectangle([x0 + w // 2 - 14, y0, x0 + w // 2 + 14, y0 + h], fill=(226, 0, 39))
    d.polygon([(x0 + w // 2 - 14, y0), (x0 + w // 2 + 14, y0),
               (x0 + w // 2 + 14 + depth, y0 - depth // 2), (x0 + w // 2 - 14 + depth, y0 - depth // 2)], fill=(200, 0, 34))
    # nhan van don
    lx, ly = x0 + 26, y0 + h // 2 - 40
    d.rectangle([lx, ly, lx + w // 2 - 60, ly + 92], fill=(250, 250, 248), outline=(180, 180, 180))
    d.text((lx + 10, ly + 8), 'ET.TEE', font=font(26, True), fill=(20, 20, 20))
    for i in range(4):  # ma vach
        for j in range(18):
            if rnd.random() > 0.35:
                d.rectangle([lx + 10 + j * 6, ly + 44 + i * 0, lx + 12 + j * 6, ly + 80], fill=(30, 30, 30))


def signature(d, x, y, rnd):
    pts = []
    for i in range(60):
        t = i / 59
        pts.append((x + t * 220, y + math.sin(t * 9 + rnd.random()) * 18 + rnd.uniform(-4, 4)))
    d.line(pts, fill=(28, 52, 140), width=3, joint='curve')


def make(i, scene):
    rnd = random.Random(i)
    top, bottom, floor, caption = scene
    img = gradient(top, bottom)
    d = ImageDraw.Draw(img)
    # san / buc tuong
    d.rectangle([0, int(H * 0.62), W, H], fill=floor)
    d.rectangle([int(W * 0.62), 40, int(W * 0.92), int(H * 0.62)], fill=tuple(max(0, c - 30) for c in top), outline=(90, 80, 70), width=4)
    d.ellipse([int(W * 0.88), int(H * 0.36), int(W * 0.9), int(H * 0.39)], fill=(200, 170, 60))
    parcel(d, int(W * 0.38), int(H * 0.6), 300 + rnd.randint(-30, 30), 190 + rnd.randint(-20, 20), rnd)
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    d = ImageDraw.Draw(img)
    # the thong tin
    d.rounded_rectangle([24, 24, 430, 150], radius=14, fill=(255, 255, 255))
    d.text((44, 38), 'Đã giao thành công', font=font(30, True), fill=(5, 150, 105))
    d.text((44, 80), caption, font=font(22), fill=(60, 60, 60))
    d.text((44, 112), 'Người nhận ký xác nhận:', font=font(18), fill=(110, 110, 110))
    signature(d, 260, 128, rnd)
    # danh dau anh minh hoa
    d.rounded_rectangle([W - 360, H - 58, W - 20, H - 18], radius=10, fill=(15, 23, 42))
    d.text((W - 344, H - 52), 'Ảnh minh họa - dữ liệu demo', font=font(20, True), fill=(255, 255, 255))
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f'proof-{i}.jpg', quality=82, optimize=True)


if __name__ == '__main__':
    for n, sc in enumerate(SCENES, start=1):
        make(n, sc)
    print('wrote', len(SCENES), 'images to', OUT)
