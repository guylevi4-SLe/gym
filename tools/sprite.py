"""Turn an exercise sprite sheet (8 frames, 2 rows x 4 columns, white background) into sprites/<name>.webp.

Frames are aligned on the heel (leftmost point of the feet), the white background connected to the frame edges
becomes transparent, and the 8 frames are laid out in one row (each FW x FH).
Usage: python3 tools/sprite.py sheet.png bwsquat [--rows 2 --cols 4]
"""
import sys, argparse
from PIL import Image, ImageDraw, ImageFilter

FW, FH = 300, 480

def frame_bounds(px, x0, y0, cw, ch):
    pts = [(x, y) for y in range(y0, y0 + ch, 2) for x in range(x0, x0 + cw, 2) if min(px[x, y][:3]) < 200]
    yb = max(y for _, y in pts)
    left = min(x for x, y in pts)
    right = max(x for x, y in pts)
    foot = min(x for x, y in pts if y > yb - 40)
    return left - x0, right - x0, yb - y0, foot - x0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet'); ap.add_argument('name')
    ap.add_argument('--rows', type=int, default=2); ap.add_argument('--cols', type=int, default=4)
    a = ap.parse_args()
    im = Image.open(a.sheet).convert('RGBA'); W, H = im.size
    cw, ch = W // a.cols, H // a.rows
    px = im.load()
    n = a.rows * a.cols
    bounds = [frame_bounds(px, (i % a.cols) * cw, (i // a.cols) * ch, cw, ch) for i in range(n)]
    # one scale for all frames so the body never changes size; frames are anchored on the heel
    L = max(f - l for l, r, y, f in bounds); R = max(r - f for l, r, y, f in bounds)
    s = min((FW - 12) / (L + R), FH / ch, 1)
    out = Image.new('RGBA', (FW * n, FH), (0, 0, 0, 0))
    for i, (l, r, yb, f) in enumerate(bounds):
        x0, y0 = (i % a.cols) * cw, (i // a.cols) * ch
        fr = im.crop((x0, y0, x0 + cw, y0 + ch)).convert('RGB')
        for seed in [(0, 0), (cw - 1, 0), (0, ch - 1), (cw - 1, ch - 1), (cw // 2, 0)]:
            ImageDraw.floodfill(fr, seed, (255, 0, 255), thresh=28)
        alpha = Image.new('L', fr.size, 255); ap_, rp = alpha.load(), fr.load()
        for y in range(ch):
            for x in range(cw):
                if rp[x, y] == (255, 0, 255): ap_[x, y] = 0
        rgba = im.crop((x0, y0, x0 + cw, y0 + ch)); rgba.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.7)))
        rgba = rgba.resize((round(cw * s), round(ch * s)), Image.LANCZOS)
        # same horizontal anchor for every frame (the cell's leftmost body pixel), feet on the bottom edge
        dx = round(6 + L * s - f * s); dy = FH - round(yb * s) - 6
        out.paste(rgba, (i * FW + dx, dy), rgba)
    out.save(f'sprites/{a.name}.webp', quality=82, method=6)
    print(f'sprites/{a.name}.webp', out.size)

if __name__ == '__main__':
    main()
