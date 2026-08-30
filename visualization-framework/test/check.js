const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const dir = path.join(__dirname, '..', 'viz');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html').sort();
  let failed = 0;
  for (const f of files) {
    const page = await browser.newPage();
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
    const status = errors.length ? 'FAIL' : 'ok';
    if (errors.length) failed++;
    console.log(`${status.padEnd(4)} ${f.padEnd(32)} stageLen=${stageHTML}`);
    errors.forEach(e => console.log('     ' + e.slice(0, 200)));
    await page.close();
  }
  await browser.close();
  console.log(`\n${failed} of ${files.length} failed`);
})();
