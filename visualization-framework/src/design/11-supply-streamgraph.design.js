/* Design Lab layout — collapsible quarterly stats strip */
(function () {
  const style = document.createElement('style');
  style.id = 'dcf-design-11';
  style.textContent = `
    .dcf-stats-strip { margin-bottom: 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); overflow: hidden; }
    .dcf-stats-strip summary { cursor: pointer; padding: 10px 14px; font-size: 12px; font-weight: 600; color: var(--muted); list-style: none; min-height: 40px; display: flex; align-items: center; }
    .dcf-stats-strip summary::before { content: "▸ "; color: var(--faint); }
    .dcf-stats-strip[open] summary::before { content: "▾ "; }
    .dcf-stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; padding: 0 14px 12px; font-size: 11px; }
    .dcf-stats-grid span { color: var(--muted); }
    .dcf-stats-grid b { display: block; font-family: ui-monospace, monospace; color: var(--ink); font-size: 13px; }
  `;
  document.head.appendChild(style);

  function injectStatsStrip() {
    if (document.getElementById('dcf-stats-strip')) return;
    const stage = document.getElementById('stage');
    const panel = stage?.querySelector('.panel');
    if (!stage || !panel || !window.DATA?.monthly_class) return;
    const MC = window.DATA.monthly_class;
    const months = [...new Set(MC.map(d => d.month))].sort();
    const quarters = months.filter((_, i) => i % 3 === 0);
    const details = document.createElement('details');
    details.id = 'dcf-stats-strip';
    details.className = 'dcf-stats-strip dcf-lbl';
    details.setAttribute('data-tier', 'inline');
    let grid = '';
    quarters.forEach(mo => {
      const rows = MC.filter(d => d.month === mo);
      const total = rows.reduce((s, d) => s + d.n, 0);
      const top = rows.sort((a, b) => b.n - a.n)[0];
      grid += `<div><span>${mo}</span><b>${total.toLocaleString()}</b><span class="muted">${top ? top.cls : '—'} lead</span></div>`;
    });
    details.innerHTML = `<summary>Quarterly sample totals</summary><div class="dcf-stats-grid">${grid}</div>`;
    stage.insertBefore(details, panel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStatsStrip);
  } else {
    setTimeout(injectStatsStrip, 0);
  }
})();
