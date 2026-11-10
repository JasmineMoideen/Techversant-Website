#!/usr/bin/env python3
"""Stack live | local | diff of an interaction scenario into one PNG:  python3 scripts/fidelity/interact-view.py <name> [crop_h] [scale]"""
import sys, os
from PIL import Image
name = sys.argv[1]
crop_h = int(sys.argv[2]) if len(sys.argv) > 2 else 10**9
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
base = os.path.expanduser('~/techversant-next/fidelity/interact')
ims = []
for suffix in ('live', 'local', 'diff'):
    p = f'{base}/{name}-{suffix}.png'
    if os.path.exists(p):
        im = Image.open(p).convert('RGB')
        ims.append(im.crop((0, 0, im.width, min(im.height, crop_h))))
w = sum(i.width for i in ims) + 10 * (len(ims) - 1)
h = max(i.height for i in ims)
sheet = Image.new('RGB', (w, h), (255, 0, 255))
x = 0
for i in ims:
    sheet.paste(i, (x, 0)); x += i.width + 10
if scale != 1.0:
    sheet = sheet.resize((int(sheet.width * scale), int(sheet.height * scale)))
out = os.path.expanduser('~/.claude/projects/-var-www-html-techversantwp/../../../../tmp/iv.png')
out = '/tmp/claude-1002/-var-www-html-techversantwp/cae9a32a-3587-4773-a0ca-a8cd9d7bcc16/scratchpad/iv.png'
sheet.save(out)
print(out, sheet.size)
