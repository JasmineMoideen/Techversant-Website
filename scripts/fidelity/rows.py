#!/usr/bin/env python3
"""Find clusters of differing rows between reference and current and write a 3-row sheet (ref/cur/diff) of the largest cluster.
   python3 scripts/fidelity/rows.py <route> <vw> [y0] [y1] [refdir=ref-new]"""
import sys, os
from PIL import Image, ImageChops
route, vw = sys.argv[1], sys.argv[2]
y0 = int(sys.argv[3]) if len(sys.argv) > 3 else 0
y1 = int(sys.argv[4]) if len(sys.argv) > 4 else 10**9
refdir = sys.argv[5] if len(sys.argv) > 5 else 'ref-new'
slug = route.strip('/').replace('/', '__') or '_home'
base = os.path.expanduser('~/techversant-next/fidelity')
ref = Image.open(f'{base}/{refdir}/{slug}/{vw}.png').convert('RGB')
cur = Image.open(f'{base}/current/{slug}/{vw}.png').convert('RGB')
h = min(ref.height, cur.height); w = ref.width
y1 = min(y1, h)
d = ImageChops.difference(ref.crop((0, 0, w, h)), cur.crop((0, 0, w, h))).convert('L').point(lambda v: 255 if v > 24 else 0)
px = d.load()
rows = [y for y in range(y0, y1) if any(px[x, y] for x in range(0, w, 3))]
if not rows:
    print('no differing rows'); sys.exit()
cl = []; s = rows[0]; p = rows[0]
for r in rows[1:]:
    if r - p > 6: cl.append((s, p)); s = r
    p = r
cl.append((s, p))
print(len(rows), 'rows;', len(cl), 'clusters:', cl[:14])
a, b = max(cl, key=lambda c: c[1] - c[0])
ya, yb = max(0, a - 25), min(h, b + 40)
dif = Image.open(f'{base}/diff/{slug}/{vw}.png').convert('RGB')
parts = [im.crop((0, ya, w, yb)) for im in (ref, cur, dif)]
ph = parts[0].height
sheet = Image.new('RGB', (w, ph * 3 + 20), (255, 0, 255))
for i, im in enumerate(parts): sheet.paste(im, (0, i * (ph + 10)))
out = '/tmp/claude-1002/-var-www-html-techversantwp/cae9a32a-3587-4773-a0ca-a8cd9d7bcc16/scratchpad/rows.png'
sheet.save(out); print(out, 'cluster', a, b, 'sheet', sheet.size)
