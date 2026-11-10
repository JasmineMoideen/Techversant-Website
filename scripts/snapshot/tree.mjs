// Compact tree view of the Elementor structure of a page from the raw snapshot.
//   node scripts/snapshot/tree.mjs /industries/healthcare-life-sciences/ [maxDepth]
import fs from 'node:fs';
import * as cheerio from 'cheerio';
const [route, maxDepthArg] = process.argv.slice(2);
const maxDepth = Number(maxDepthArg ?? 99);
const pages = JSON.parse(fs.readFileSync('content/snapshot/raw/pages.json', 'utf8')).items;
const page = pages.find((p) => p.link.replace('https://techversantinfotech.com', '') === route);
if (!page) { console.error('no page', route, pages.map((p) => p.link.replace('https://techversantinfotech.com', '')).join(' ')); process.exit(1); }
const $ = cheerio.load(page.content.rendered, null, false);
const clean = (s) => s.replace(/\s+/g, ' ').trim();
function walk(el, depth) {
  const $el = $(el);
  const type = $el.attr('data-element_type');
  if (type) {
    const wt = $el.attr('data-widget_type');
    const cls = ($el.attr('class') || '').split(/\s+/).filter((c) => c && !/^elementor-(element|element-[0-9a-f]+|repeater-item-[0-9a-f]+|widget|widget-[a-z0-9_-]+|top-column|column|section)$/.test(c) && !/^e-(con|flex|parent|child|con-full)$/.test(c)).slice(0, 5).join('.');
    const txt = wt ? clean($el.text()).slice(0, 70) : '';
    if (depth <= maxDepth) console.log(`${'  '.repeat(depth)}${type === 'widget' ? '• ' + wt : '▢ ' + type} ${cls ? '[' + cls + ']' : ''} ${txt ? '"' + txt + '"' : ''}`);
    if (type !== 'widget') $el.children().each((_, c) => walk(c, depth + 1));
    else return;
  } else {
    $el.children().each((_, c) => walk(c, depth));
  }
}
$.root().children().each((_, c) => walk(c, 0));
