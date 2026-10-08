"""Turn an exercise sprite sheet (frames in a grid, white background) or an animated GIF into sprites/<name>.webp.

Frames are aligned on the heel (leftmost point of the feet), the white background connected to the frame edges
becomes transparent, and the 8 frames are laid out in one row (each FW x FH, 600x960 so phones with sharp screens get full detail).
Usage: python3 tools/sprite.py sheet.png bwsquat [--rows 2 --cols 4]   |   python3 tools/sprite.py demo.gif pulldown
The floor shadow is removed with rembg when it is installed; asking the image AI for no floor shadow still helps.
A GIF keeps one fixed camera, so its frames share one placement instead of being aligned one by one.
The frames should make one full repetition (start, end, back to start); the app loops them in order.
"""
import sys, argparse
from PIL import Image, ImageDraw, ImageFilter, ImageSequence
try:  # optional: AI segmentation to remove the soft floor shadow (pip install "rembg[cpu]")
    from rembg import remove, new_session
    SEG = new_session('u2net_human_seg')  # the person, incl. sneakers; light machine parts sit above the floor band
except Exception:
    SEG = None

FW, FH = 600, 960

def frame_bounds(px, x0, y0, cw, ch):
    pts = [(x, y) for y in range(y0, y0 + ch, 2) for x in range(x0, x0 + cw, 2) if min(px[x, y][:3]) < 200]
    yb = max(y for _, y in pts)
    left = min(x for x, y in pts)
    right = max(x for x, y in pts)
    foot = min(x for x, y in pts if y > yb - 40)
    top = min(y for _, y in pts)
    return left - x0, right - x0, yb - y0, foot - x0, top - y0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet'); ap.add_argument('name')
    ap.add_argument('--rows', type=int, default=2); ap.add_argument('--cols', type=int, default=4)
    a = ap.parse_args()
    src = Image.open(a.sheet)
    gif = getattr(src, 'n_frames', 1) > 1
    if gif:  # lay the GIF frames out as a one-row sheet
        frames = [f.convert('RGBA') for f in ImageSequence.Iterator(src)]
        a.rows, a.cols = 1, len(frames)
        im = Image.new('RGBA', (frames[0].width * len(frames), frames[0].height))
        for i, f in enumerate(frames): im.paste(f, (i * f.width, 0))
    else:
        im = src.convert('RGBA')
    W, H = im.size
    cw, ch = W // a.cols, H // a.rows
    px = im.load()
    n = a.rows * a.cols
    bounds = [frame_bounds(px, (i % a.cols) * cw, (i // a.cols) * ch, cw, ch) for i in range(n)]
    if gif:  # fixed camera: one placement for every frame
        u = (min(b[0] for b in bounds), max(b[1] for b in bounds), max(b[2] for b in bounds), min(b[3] for b in bounds), min(b[4] for b in bounds))
        bounds = [u] * n
    # one scale for all frames so the body never changes size; frames are anchored on the heel
    L = max(b[3] - b[0] for b in bounds); R = max(b[1] - b[3] for b in bounds)
    Hc = max(b[2] for b in bounds) - min(b[4] for b in bounds)  # tallest content, so the body fills the frame
    s = min((FW * 0.96) / (L + R), FH * 0.97 / Hc)
    out = Image.new('RGBA', (FW * n, FH), (0, 0, 0, 0))
    for i, (l, r, yb, f, top) in enumerate(bounds):
        x0, y0 = (i % a.cols) * cw, (i // a.cols) * ch
        fr = im.crop((x0, y0, x0 + cw, y0 + ch)).convert('RGB')
        for seed in [(0, 0), (cw - 1, 0), (0, ch - 1), (cw - 1, ch - 1), (cw // 2, 0)]:
            ImageDraw.floodfill(fr, seed, (255, 0, 255), thresh=28)
        # floor shadow: in the bottom fifth, light colourless pixels (shadow, or white sneakers) are kept only
        # where the rembg person model sees the person. Dark machine parts are never touched.
        seg = remove(im.crop((x0, y0, x0 + cw, y0 + ch)).convert('RGB'), session=SEG, only_mask=True).load() if SEG else None
        if SEG:
            orig, rp = im.crop((x0, y0, x0 + cw, y0 + ch)).convert('RGB').load(), fr.load()
            for v in range(int(ch * 0.8), ch):
                for u in range(cw):
                    c = orig[u, v]
                    if min(c) >= 185 and max(c) - min(c) < 16 and seg[u, v] < 128:
                        rp[u, v] = (255, 0, 255)
                    elif seg[u, v] >= 200 and rp[u, v] == (255, 0, 255):
                        rp[u, v] = c  # a white sneaker the edge fill swallowed
        # background pockets enclosed by the body or the machine: large near-white areas
        rp = fr.load(); seen = set()
        for y in range(0, ch, 3):
            for x in range(0, cw, 3):
                if (x, y) in seen or min(rp[x, y]) < 248 or rp[x, y] == (255, 0, 255): continue
                stack, area = [(x, y)], []
                seen.add((x, y))
                while stack:
                    u, v = stack.pop(); area.append((u, v))
                    for q in ((u + 1, v), (u - 1, v), (u, v + 1), (u, v - 1)):
                        if 0 <= q[0] < cw and 0 <= q[1] < ch and q not in seen and min(rp[q]) >= 240 and rp[q] != (255, 0, 255):
                            seen.add(q); stack.append(q)
                # never punch holes in white sneakers: with the model, only areas it calls background go
                if len(area) > cw * ch * 0.0008 and (not seg or sum(seg[q] < 128 for q in area) > len(area) * 0.8):
                    for q in area: rp[q] = (255, 0, 255)
        alpha = Image.new('L', fr.size, 255); ap_ = alpha.load()
        for y in range(ch):
            for x in range(cw):
                if rp[x, y] == (255, 0, 255): ap_[x, y] = 0
        rgba = im.crop((x0, y0, x0 + cw, y0 + ch)); rgba.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.7)))
        rgba = rgba.resize((round(cw * s), round(ch * s)), Image.LANCZOS)
        # same horizontal anchor for every frame (the cell's leftmost body pixel), feet on the bottom edge
        dx = round(FW * 0.02 + L * s - f * s); dy = FH - round(yb * s) - round(FH * 0.0125)
        out.paste(rgba, (i * FW + dx, dy), rgba)
    out.save(f'sprites/{a.name}.webp', quality=90, method=6)
    print(f'sprites/{a.name}.webp', out.size, f'{n} frames')

if __name__ == '__main__':
    main()
