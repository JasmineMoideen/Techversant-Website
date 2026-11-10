// Which CSS rules match an element and set a property?  node scripts/fidelity/matched.mjs <base> <route> "<selector>" <prop>[,prop] [width]
//   base: live | local
import { chromium } from '@playwright/test';
const [which, route, sel, propsArg, width = '1440'] = process.argv.slice(2);
const base = which === 'live' ? 'https://techversantinfotech.com' : 'http://localhost:3000';
const props = propsArg.split(',');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: Number(width), height: 900 } });
await p.goto(base + route, { waitUntil: 'load' });
await p.waitForTimeout(2500);
const out = await p.evaluate(([sel, props]) => {
  const el = document.querySelector(sel);
  if (!el) return ['NOT FOUND'];
  const res = [];
  const visit = (rules, media, sheet) => {
    for (const r of rules) {
      if (r.type === CSSRule.MEDIA_RULE) { if (matchMedia(r.conditionText).matches) visit(r.cssRules, media + '@' + r.conditionText + ' ', sheet); }
      else if (r.type === CSSRule.SUPPORTS_RULE) visit(r.cssRules, media, sheet);
      else if (r.type === CSSRule.STYLE_RULE) {
        let m = false; try { m = el.matches(r.selectorText); } catch {}
        if (!m) continue;
        for (const prop of props) {
          const v = r.style.getPropertyValue(prop);
          if (v) res.push(`${prop}: ${v}${r.style.getPropertyPriority(prop) ? ' !important' : ''}   <= ${media}${r.selectorText.slice(0, 140)}   [${sheet}]`);
        }
      }
    }
  };
  for (const s of document.styleSheets) {
    try { visit(s.cssRules, '', (s.href || s.ownerNode?.id || 'inline').split('/').slice(-1)[0].slice(0, 40)); } catch {}
  }
  const inline = el.getAttribute('style');
  if (inline) res.push('INLINE style="' + inline + '"');
  return res;
}, [sel, props]);
console.log(out.join('\n'));
await b.close();
