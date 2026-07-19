import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

rng = np.random.default_rng(11)
OUT = "assets"

# ---------------------------------------------------------------- wood
wood = Image.open("assets/hardwood.jpg").convert("RGB")
wood = wood.resize((1400, 700), Image.LANCZOS)
# darken heavily and shift toward our warm dark palette
w = np.asarray(wood).astype(np.float32) / 255.0
lum = w.mean(axis=2, keepdims=True)
# compress dynamic range, keep grain contrast
w = 0.16 + 0.30 * (w * 0.45 + lum * 0.55)
tint = np.array([0.42, 0.30, 0.19])
w = w * tint / tint.max()
w = np.clip(w, 0, 1)
wood_img = Image.fromarray((w * 255).astype(np.uint8))
# gentle vignette
vw, vh = wood_img.size
yy, xx = np.mgrid[0:vh, 0:vw]
cx, cy = vw / 2, vh / 2
d = np.sqrt(((xx - cx) / cx) ** 2 + ((yy - cy) / cy) ** 2)
vig = np.clip(1.0 - 0.22 * d ** 2, 0, 1)
w2 = np.asarray(wood_img).astype(np.float32) * vig[..., None]
wood_img = Image.fromarray(np.clip(w2, 0, 255).astype(np.uint8))
wood_img.save(f"{OUT}/wood.jpg", quality=62, optimize=True)

# ---------------------------------------------------------------- fbm noise helper
def fbm(shape, octaves=5, base=8, seed=0):
    r = np.random.default_rng(seed)
    h, w_ = shape
    acc = np.zeros(shape, np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        gh = base * (2 ** o)
        g = r.random((gh + 1, gh + 1)).astype(np.float32)
        img = Image.fromarray((g * 255).astype(np.uint8)).resize((w_, h), Image.BICUBIC)
        acc += amp * (np.asarray(img).astype(np.float32) / 255.0)
        tot += amp
        amp *= 0.55
    return acc / tot

# ---------------------------------------------------------------- parchment texture (tileable-ish, neutral: multiplied over CSS color)
ph, pw = 512, 512
n = fbm((ph, pw), octaves=6, base=6, seed=3)
fib = fbm((ph, pw), octaves=4, base=48, seed=7)
paper = 0.94 + 0.05 * (n - 0.5) * 2 + 0.025 * (fib - 0.5) * 2
# sparse darker blotches
bl = fbm((ph, pw), octaves=3, base=4, seed=12)
paper -= np.clip(bl - 0.62, 0, 1) * 0.25
paper = np.clip(paper, 0, 1)
g = (paper * 255).astype(np.uint8)
Image.merge("RGB", [Image.fromarray(g)] * 3).save(f"{OUT}/paper.jpg", quality=72, optimize=True)

# ---------------------------------------------------------------- crumpled wad (voronoi facets, alpha)
S = 340
seeds = rng.random((95, 2)) * S
yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
d2 = np.stack([(xx - sx) ** 2 + (yy - sy) ** 2 for sx, sy in seeds])
order = np.argsort(d2, axis=0)
near = order[0]
d1 = np.take_along_axis(d2, order[0:1], axis=0)[0]
d2nd = np.take_along_axis(d2, order[1:2], axis=0)[0]
edge = np.sqrt(d2nd) - np.sqrt(d1)          # small near facet borders
facet_shade = rng.random(len(seeds)) * 0.22 + 0.80
base = facet_shade[near]
# facet gradient: light comes from top-left
light = 1.0 - 0.42 * ((xx / S) * 0.55 + (yy / S) * 0.85 - 0.62)
crease = np.clip(edge / 1.5, 0, 1)          # 0 only right on the crease line
val = base * light * (0.88 + 0.12 * crease)
# a few deeper shadow folds
deep = fbm((S, S), octaves=3, base=5, seed=21)
val *= 1.0 - np.clip(deep - 0.58, 0, 1) * 0.55
val = np.clip(val, 0, 1)
# paper tone (matches --scrap)
r_ = val * 0.965
g_ = val * 0.925
b_ = val * 0.815
# angular silhouette with fold tips
cx = cy = S / 2
ang = np.arctan2(yy - cy, xx - cx)
rad = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
wob = sum(rng.random() * (0.16 / k) * np.abs(np.cos(k * ang + rng.random() * 6.28)) for k in range(2, 9))
rmax = S * (0.30 + wob)
alpha = np.clip((rmax - rad) / 1.6, 0, 1)
rgba = np.dstack([
    (np.clip(r_, 0, 1) * 255), (np.clip(g_, 0, 1) * 255), (np.clip(b_, 0, 1) * 255),
    (alpha * 255),
]).astype(np.uint8)
wad = Image.fromarray(rgba, "RGBA")
# soft contact shadow baked below
sh = Image.new("RGBA", (S + 60, S + 50), (0, 0, 0, 0))
sd = ImageDraw.Draw(sh)
sd.ellipse([34, S - 52, S + 18, S + 6], fill=(15, 8, 2, 120))
sh = sh.filter(ImageFilter.GaussianBlur(11))
sh.alpha_composite(wad, (30, 4))
sh = sh.resize((196, 176), Image.LANCZOS)
sh.save(f"{OUT}/wad.png", optimize=True)

# ---------------------------------------------------------------- crease overlay for the smoothed slip
ch, cw = 220, 560
creases = np.zeros((ch, cw), np.float32)
for _ in range(9):
    x0, y0 = rng.random() * cw, rng.random() * ch
    a = rng.random() * np.pi
    length = 200 + rng.random() * 420
    x1, y1 = x0 + np.cos(a) * length, y0 + np.sin(a) * length
    im = Image.new("L", (cw, ch), 0)
    dr = ImageDraw.Draw(im)
    dr.line([x0, y0, x1, y1], fill=255, width=2)
    creases += np.asarray(im.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255.0
creases = np.clip(creases, 0, 1)
# crease = dark line + light line offset (fold highlight)
dark = (creases * 70).astype(np.uint8)
light_img = Image.fromarray((np.clip(np.roll(creases, 2, axis=0), 0, 1) * 60).astype(np.uint8))
rgba = np.dstack([
    np.full((ch, cw), 60, np.uint8),
    np.full((ch, cw), 42, np.uint8),
    np.full((ch, cw), 20, np.uint8),
    dark,
]).astype(np.uint8)
Image.fromarray(rgba, "RGBA").save(f"{OUT}/creases.png", optimize=True)

import os
for f in ["wood.jpg", "paper.jpg", "wad.png", "creases.png"]:
    print(f, os.path.getsize(f"{OUT}/{f}") // 1024, "KB")
