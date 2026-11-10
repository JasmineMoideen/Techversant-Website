#!/usr/bin/env python3
"""Side-by-side crop of reference | current for visual inspection.
   python3 scripts/fidelity/side.py <route> <viewport> [y0=0] [y1=2400] [scale=0.5] [refdir=reference]
   -> prints the output path (scratchpad/side.png)"""
import sys, os
from PIL import Image
route, vw = sys.argv[1], sys.argv[2]
y0 = int(sys.argv[3]) if len(sys.argv) > 3 else 0
y1 = int(sys.argv[4]) if len(sys.argv) > 4 else 2400
sc = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
refdir = sys.argv[6] if len(sys.argv) > 6 else 'ref-new'
slug = route.strip('/').replace('/', '__') or '_home'
base = os.path.expanduser('~/techversant-next/fidelity')
ref = Image.open(f'{base}/{refdir}/{slug}/{vw}.png').convert('RGB')
cur = Image.open(f'{base}/current/{slug}/{vw}.png').convert('RGB')
def crop(im):
    return im.crop((0, min(y0, im.height), im.width, min(y1, im.height)))
a, b = crop(ref), crop(cur)
w = int(a.width * sc)
a = a.resize((w, max(1, int(a.height * sc))), Image.LANCZOS)
b = b.resize((w, max(1, int(b.height * sc))), Image.LANCZOS)
out = Image.new('RGB', (w * 2 + 12, max(a.height, b.height)), (255, 0, 255))
out.paste(a, (0, 0)); out.paste(b, (w + 12, 0))
dst = '/tmp/claude-1002/-var-www-html-techversantwp/cae9a32a-3587-4773-a0ca-a8cd9d7bcc16/scratchpad/side.png'
out.save(dst)
print(dst, 'ref', ref.size, 'cur', cur.size, '->', out.size)
