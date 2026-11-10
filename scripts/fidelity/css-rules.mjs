// Prints live CSS rules whose selector contains a substring:  node scripts/fidelity/css-rules.mjs homePrjtGrid [more...]
import { chromium } from '@playwright/test';
const needles = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://techversantinfotech.com/', { waitUntil: 'load' });
await p.waitForTimeout(1500);
const out = await p.evaluate((needles) => {
  const res = [];
  const visit = (rules, media, sheet) => {
    for (const r of rules) {
      if (r.cssRules && r.type !== CSSRule.STYLE_RULE) visit(r.cssRules, (media ? media + ' ' : '') + (r.conditionText ? '@' + r.conditionText : ''), sheet);
      else if (r.selectorText && needles.some((n) => r.selectorText.includes(n))) res.push((media ? `[${media}] ` : '') + r.cssText + '   /* ' + sheet + ' */');
    }
  };
  for (const s of document.styleSheets) {
    try { visit(s.cssRules, '', (s.href || 'inline').split('/').slice(-2).join('/').slice(0, 50)); } catch {}
  }
  return res;
}, needles);
console.log(out.join('\n'));
await b.close();
