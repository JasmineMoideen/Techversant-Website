// Compare computed styles of one selector, live vs local:  node scripts/fidelity/styles.mjs <route> "<selector>" [width] [prop,prop,...]
import { chromium } from '@playwright/test';
const [route, sel, width = '1440', propsArg] = process.argv.slice(2);
const props = (propsArg ?? 'display,visibility,opacity,color,fontSize,lineHeight,fontFamily,height,width,margin,padding,backgroundColor,position,overflow,transform,maxHeight,zIndex').split(',');
const b = await chromium.launch({ channel: 'chrome' });
for (const base of ['https://techversantinfotech.com', 'http://localhost:3000']) {
  const p = await b.newPage({ viewport: { width: Number(width), height: 900 } });
  await p.goto(base + route, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const out = await p.evaluate(([sel, props]) => {
    const el = document.querySelector(sel);
    if (!el) return 'NOT FOUND';
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { rect: [r.x, r.y + scrollY, r.width, r.height].map((v) => Math.round(v * 10) / 10).join(','), cls: el.className?.toString().slice(0, 80), ...Object.fromEntries(props.map((k) => [k, cs[k]])) };
  }, [sel, props]);
  console.log(base.includes('local') ? 'LOCAL' : 'LIVE ', JSON.stringify(out));
  await p.close();
}
await b.close();
