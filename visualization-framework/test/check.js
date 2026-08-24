const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const path = require('path');
const fs = require('fs');

// Per-page minimum mark-count assertions, for the highest-traffic/most-representative
// pages. These confirm actual chart marks rendered (not just non-empty innerHTML —
// e.g. axes/labels alone would previously still pass). Thresholds are deliberately
// loose (a floor, not an exact count) so they don't become brittle to minor future
// tweaks, but tight enough that "zero marks rendered" fails them. See each page's
// src/<id>.js for what produces the marks:
//   01-mirror-match: two mirrored mass spectra, each drawn as <line> "sticks" per
//     peak (default sample/ref = fentanyl, 13 peaks each => 26 lines on load).
//   11-supply-streamgraph: one stacked <path> band per drug class (8 classes,
//     CLS array in src/11-supply-streamgraph.js) => exactly 8 paths.
//   21-geo-choropleth: one <path class="state"> per US state/territory feature
//     in viz/lib/us-states.json (51 features), drawn unconditionally regardless
//     of whether that state has data.
const MARK_CHECKS = {
  '01-mirror-match.html': { selector: '#stage svg line', min: 10, label: 'spectrum peak lines' },
  '11-supply-streamgraph.html': { selector: '#stage svg path', min: 6, label: 'streamgraph bands' },
  '21-geo-choropleth.html': { selector: '#stage svg path.state', min: 40, label: 'choropleth state paths' },
};

// Basic keyboard-navigation smoke test on 2 representative pages: confirm Tab
// reaches at least one interactive element, and that element is visibly focused
// (not display:none/visibility:hidden/zero-size — i.e. not an invisible focus
// target a sighted keyboard user couldn't locate).
const KEYBOARD_NAV_PAGES = new Set(['01-mirror-match.html', '18-result-card.html']);

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const FAIL_IMPACTS = new Set(['critical', 'serious']);

async function checkMarks(page, file) {
  const check = MARK_CHECKS[file];
  if (!check) return null;
  const count = await page.evaluate(sel => document.querySelectorAll(sel).length, check.selector);
  return { ...check, count, pass: count >= check.min };
}

async function checkKeyboardNav(page, file) {
  if (!KEYBOARD_NAV_PAGES.has(file)) return null;
  // Start from a known, non-focused baseline so the first real Tab press is
  // deterministic regardless of where the page happened to leave focus.
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
  });
  let found = null;
  for (let i = 0; i < 10 && !found; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const visible = r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
      return { tag: el.tagName.toLowerCase(), visible, w: Math.round(r.width), h: Math.round(r.height) };
    });
    if (info) found = info;
  }
  if (!found) return { pass: false, detail: 'Tab never moved focus to any element' };
  if (!found.visible) return { pass: false, detail: `focus landed on invisible <${found.tag}> (${found.w}x${found.h})` };
  return { pass: true, detail: `focus reached visible <${found.tag}> (${found.w}x${found.h})` };
}

async function runAxe(page) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  const failing = [];
  for (const v of results.violations) {
    const impact = v.impact || 'minor';
    if (counts[impact] === undefined) counts[impact] = 0;
    counts[impact]++;
    if (FAIL_IMPACTS.has(impact)) failing.push(`${v.id} (${impact}, ${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})`);
  }
  const total = results.violations.length;
  return { counts, total, failing };
}

(async () => {
  const browser = await chromium.launch();
  const dir = path.join(__dirname, '..', 'viz');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();
  let failed = 0;
  const a11ySummary = [];
  for (const f of files) {
    // Use an explicit context (not the browser.newPage() shorthand): AxeBuilder
    // opens its own internal blank page on the context to inject axe-core's
    // legacy source, which throws "Please use browser.newContext()" if the
    // page's context was implicitly owned by a single page.
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });
    const url = 'file://' + path.join(dir, f);
    // Seed auth token so the guard doesn't redirect before the viz loads
    await page.addInitScript(() => localStorage.setItem('dcf_auth', Date.now()));
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1200);
    } catch (e) {
      errors.push('NAV: ' + e.message);
    }
    const stageHTML = await page.evaluate(() => document.getElementById('stage') ? document.getElementById('stage').innerHTML.length : -1);

    const markResult = await checkMarks(page, f).catch(e => { errors.push('MARKS: ' + e.message); return null; });
    if (markResult && !markResult.pass) {
      errors.push(`MARKS: expected >= ${markResult.min} ${markResult.label} (${markResult.selector}), found ${markResult.count}`);
    }

    let axe = null;
    try {
      axe = await runAxe(page);
      a11ySummary.push({ file: f, ...axe.counts, total: axe.total });
      if (axe.failing.length) {
        errors.push(`A11Y: ${axe.failing.length} critical/serious violation(s): ${axe.failing.join('; ')}`);
      }
    } catch (e) {
      errors.push('A11Y-SCAN: ' + e.message);
    }

    const kbd = await checkKeyboardNav(page, f).catch(e => { errors.push('KEYBOARD: ' + e.message); return null; });
    if (kbd && !kbd.pass) {
      errors.push('KEYBOARD: ' + kbd.detail);
    }

    const status = errors.length ? 'FAIL' : 'ok';
    if (errors.length) failed++;
    let line = `${status.padEnd(4)} ${f.padEnd(32)} stageLen=${stageHTML}`;
    if (markResult) line += ` marks=${markResult.count}/${markResult.min}`;
    if (axe) line += ` a11y[crit=${axe.counts.critical} serious=${axe.counts.serious} mod=${axe.counts.moderate} minor=${axe.counts.minor} total=${axe.total}]`;
    if (kbd) line += ` kbd=${kbd.pass ? 'ok' : 'FAIL'}`;
    console.log(line);
    errors.forEach(e => console.log('     ' + e.slice(0, 300)));
    await context.close();
  }
  await browser.close();
  console.log(`\n${failed} of ${files.length} failed`);

  // Accessibility baseline table: critical+serious violation counts per page, so a
  // human can see where the framework currently stands against the README's WCAG
  // 2.1 AA claim before deciding whether to gate the suite on it. Not itself a
  // pass/fail gate beyond critical/serious (which already fail the page above).
  console.log('\naxe-core accessibility baseline (WCAG 2.1 A/AA rules), all pages:');
  console.log('file'.padEnd(34) + 'critical'.padStart(9) + 'serious'.padStart(9) + 'moderate'.padStart(10) + 'minor'.padStart(7) + 'total'.padStart(7));
  let totCrit = 0, totSerious = 0, totMod = 0, totMinor = 0;
  for (const r of a11ySummary) {
    console.log(r.file.padEnd(34) + String(r.critical).padStart(9) + String(r.serious).padStart(9) + String(r.moderate).padStart(10) + String(r.minor).padStart(7) + String(r.total).padStart(7));
    totCrit += r.critical; totSerious += r.serious; totMod += r.moderate; totMinor += r.minor;
  }
  console.log('-'.repeat(66));
  console.log('TOTAL'.padEnd(34) + String(totCrit).padStart(9) + String(totSerious).padStart(9) + String(totMod).padStart(10) + String(totMinor).padStart(7) + String(a11ySummary.reduce((s, r) => s + r.total, 0)).padStart(7));

  process.exit(failed ? 1 : 0);
})();
