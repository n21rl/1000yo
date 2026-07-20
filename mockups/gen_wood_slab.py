# Generates the single-slab walnut wood texture embedded (as a base64 JPEG
# data URI) in desk2.html's html/body background layers. Run this, then
# splice the resulting JPEG into desk2.html's two identical
# `data:image/jpeg;base64,...` occurrences (both the html and body rules) —
# never paste the data URI itself into an editor/chat context, do the swap
# with a small script (base64-encode the file, regex-replace both matches).
import numpy as np
from PIL import Image, ImageFilter
import os

rng = np.random.default_rng(7)
W, H = 1400, 900

base = np.array([0x34, 0x25, 0x17], dtype=np.float64)  # --wood-2 #342517

def upsampled_noise(w, h, res_w, res_h, seed):
    r = np.random.default_rng(seed)
    small = r.normal(0, 1, (res_h, res_w))
    small = (small - small.min()) / (small.max() - small.min())
    img = Image.fromarray((small * 255).astype(np.uint8))
    img = img.resize((w, h), Image.BICUBIC)
    return np.asarray(img, dtype=np.float64) / 255.0  # 0..1

yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)

# --- domain warp fields: smooth, low-frequency, so grain lines meander
#     slowly as they travel horizontally instead of looking mechanical ---
warp_a = upsampled_noise(W, H, 10, 6, 1) - 0.5   # broad meander
warp_b = upsampled_noise(W, H, 26, 10, 2) - 0.5  # medium meander
warp = warp_a * 34 + warp_b * 10                  # px of vertical wobble

# --- long horizontal grain lines: sin of (y + warp), several frequency
#     bands layered like real growth rings of varying tightness ---
def grain_band(freq, warp_scale, amp):
    return amp * np.sin((yy + warp * warp_scale) * freq)

grain = (
    grain_band(0.35, 1.0, 1.0) +
    grain_band(0.9, 0.6, 0.55) +
    grain_band(1.8, 0.35, 0.3)
)
grain /= (1.0 + 0.55 + 0.3)  # back to roughly [-1, 1]

# sharpen the sine into narrower streak lines rather than a smooth wave
grain = np.sign(grain) * (np.abs(grain) ** 0.45)

# a few sparse darker accent streaks (tight bands picked out of the same
# warped field so they follow the grain's meander)
accent_phase = np.sin((yy + warp * 0.8) * 0.22)
accents = -np.clip((np.abs(accent_phase) - 0.965) * 28, 0, 1)

# --- broad soft luminance blotches (very low frequency) ---
low_field = upsampled_noise(W, H, 9, 7, 3) - 0.5

# --- fine fiber noise for material feel, stretched slightly horizontally ---
fiber_small = rng.normal(0, 1, (H, W // 3))
fiber_img = Image.fromarray(((fiber_small - fiber_small.min()) / (fiber_small.max() - fiber_small.min()) * 255).astype(np.uint8))
fiber_img = fiber_img.resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(radius=0.5))
fiber = np.asarray(fiber_img, dtype=np.float64) / 255.0 - 0.5

# --- combine into a luminance multiplier (low overall contrast, but grain
#     lines individually visible) ---
luminance = (
    1.0
    + 0.055 * low_field
    + 0.16 * grain
    + 0.10 * accents
    + 0.035 * fiber
)

# --- one faint knot ---
kx, ky = W * 0.24, H * 0.66
dist = np.sqrt(((xx - kx)) ** 2 + ((yy - ky) / 0.68) ** 2)
knot_radius = 42
ring = np.sin(dist / 5.2) * np.exp(-dist / (knot_radius * 1.7))
core = np.exp(-(dist ** 2) / (2 * (knot_radius * 0.32) ** 2))
knot = 0.09 * ring - 0.20 * core
# knot also locally bends the grain lines around it (already independent,
# acceptable to just blend luminance here for a "brisk" pass)
luminance += knot

luminance = np.clip(luminance, 0.58, 1.42)

# slight warm/cool tint drift so it isn't perfectly monochrome
tint = 1.0 + 0.025 * low_field

out = np.zeros((H, W, 3), dtype=np.float64)
for c in range(3):
    ch = base[c] * luminance
    if c == 0:
        ch = ch * tint
    out[:, :, c] = ch

out = np.clip(out, 0, 255).astype(np.uint8)
img = Image.fromarray(out, mode='RGB')
img = img.filter(ImageFilter.GaussianBlur(radius=0.3))

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'wood_slab.jpg')
img.save(out_path, quality=55, optimize=True)
print('saved', out_path, os.path.getsize(out_path), 'bytes', img.size)
