/* Compact series navigation — dropdown, prev/next, home link.
   NAV_REGISTRY is inlined at build time from src/registry.json. */

const PREVIEW_FALLBACK = {
  '06a-ridgeline-filled': '06-spectral-ridgeline',
  '06b-ridgeline-3d': '06-spectral-ridgeline',
  '06c-ridgeline-filter': '06-spectral-ridgeline',
  '12a-co-nested': '12-cooccurrence-chord',
  '12b-chord-sankey': '12-cooccurrence-chord',
  '12c-co-undirected': '12-cooccurrence-chord',
  '17a-adulterant-pull': '17-adulterant-network',
  '17b-adulterant-3d': '17-adulterant-network',
  '17c-adulterant-orbit': '17-adulterant-network',
};

// A "variant" page is an alternate take on a canonical numbered visualization —
// e.g. 06b-ridgeline-3d is a variant of 06-spectral-ridgeline. Variants use the
// `<number><letter>-slug` id convention (already relied on above by
// PREVIEW_FALLBACK and below by navLabel's suffix logic); canonical pages use
// a bare `<number>-slug`. Inferring from the id — rather than a manually-set
// registry flag — means every future page is classified correctly for free as
// long as it follows this existing naming convention, with no separate field
// to remember to set (and no risk of the field and the id silently drifting
// apart).
function isVariantId(id) {
  return /^\d+[a-z]-/.test(id);
}

function pageFile(id, mode) {
  return mode === 'lab' ? `d-${id}.html` : `${id}.html`;
}

function previewId(id) {
  return PREVIEW_FALLBACK[id] || id;
}

function previewSrc(id, mode) {
  const base = mode === 'lab' ? '../viz/review-previews' : 'review-previews';
  return `${base}/${previewId(id)}.png`;
}

function injectNavCSS() {
  if (document.getElementById('dcf-nav-css')) return;
  const s = document.createElement('style');
  s.id = 'dcf-nav-css';
  s.textContent = `
  .dcf-nav{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:10px 14px;margin:0 0 14px;background:var(--panel);border:1px solid var(--line);border-radius:12px;position:sticky;top:0;z-index:30}
  .dcf-nav-home{font:600 12px/1 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);text-decoration:none;padding:6px 10px;border-radius:8px;border:1px solid transparent;transition:color .15s,background .15s,border-color .15s}
  .dcf-nav-home:hover,.dcf-nav-home:focus-visible{color:var(--ink);background:var(--panel2);border-color:var(--line);outline:none}
  .dcf-nav-btn{min-width:40px;min-height:40px;padding:0 12px;background:var(--panel2);color:var(--muted);border:1px solid var(--line);border-radius:999px;font:600 15px/1 var(--font-sans);cursor:pointer;transition:background .15s,color .15s}
  .dcf-nav-btn:hover,.dcf-nav-btn:focus-visible{background:var(--panel);color:var(--ink);outline:none}
  .dcf-nav-btn:disabled{opacity:.35;cursor:not-allowed}
  .dcf-nav-select{flex:1 1 180px;min-width:140px;max-width:420px;min-height:40px;padding:8px 32px 8px 12px;background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:10px;font:500 13px var(--font-sans);cursor:pointer}
  .dcf-nav-select:hover,.dcf-nav-select:focus-visible{border-color:var(--muted);outline:none}
  .dcf-nav-pos{margin-left:auto;font:500 11px/1 var(--font-mono);color:var(--faint);white-space:nowrap}
  .dcf-index-hero{margin-bottom:22px;border-bottom:1px solid var(--line);padding-bottom:18px}
  .dcf-index-hero h1{font-size:28px;line-height:1.15;margin:0 0 8px;font-weight:700;letter-spacing:-.01em}
  .dcf-index-hero p{margin:0;color:var(--muted);font-size:15px;line-height:1.5;max-width:72ch}
  .dcf-index-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin:18px 0 32px}
  .dcf-index-card{display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;transition:border-color .15s,transform .15s}
  .dcf-index-card:hover,.dcf-index-card:focus-visible{border-color:var(--muted);transform:translateY(-1px);outline:none}
  .dcf-index-thumb{aspect-ratio:16/10;background:var(--panel2);border-bottom:1px solid var(--line);overflow:hidden;display:flex;align-items:center;justify-content:center}
  .dcf-index-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .dcf-index-thumb-fallback{font:600 11px/1.3 var(--font-mono);color:var(--faint);text-align:center;padding:12px}
  .dcf-index-body{padding:14px 16px 16px}
  .dcf-index-meta{font:600 10px/1 var(--font-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--faint);margin-bottom:6px}
  .dcf-index-title{font-size:15px;font-weight:650;line-height:1.3;margin:0 0 4px;color:var(--ink);font-family:var(--font-sans)}
  .dcf-index-cat{font-size:12px;color:var(--muted);margin:0}
  .dcf-index-switch{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  .dcf-index-switch a{font:500 12px var(--font-sans);color:var(--muted);text-decoration:none;padding:6px 12px;border:1px solid var(--line);border-radius:999px}
  .dcf-index-switch a[aria-current="page"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
  .dcf-index-variant-badge{display:inline-block;margin-left:6px;font:600 9px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--faint);border:1px solid var(--line);border-radius:999px;padding:2px 6px;vertical-align:middle}
  .dcf-variants{margin:8px 0 32px;border-top:1px solid var(--line);padding-top:18px}
  .dcf-variants>summary{cursor:pointer;list-style:none;font:600 13px var(--font-sans);color:var(--muted);display:flex;align-items:center;gap:8px;padding:4px 0;user-select:none}
  .dcf-variants>summary::-webkit-details-marker{display:none}
  .dcf-variants>summary::before{content:'▸';display:inline-block;font-size:11px;transition:transform .15s;color:var(--faint)}
  .dcf-variants[open]>summary::before{transform:rotate(90deg)}
  .dcf-variants>summary:hover,.dcf-variants>summary:focus-visible{color:var(--ink);outline:none}
  .dcf-variants-dek{margin:8px 0 0;color:var(--faint);font-size:13px;line-height:1.5;max-width:72ch}
  .dcf-variants .dcf-index-grid{margin-top:14px}
  @media (max-width:640px){.dcf-nav-pos{width:100%;margin-left:0;text-align:right}}
  @media (prefers-reduced-motion:reduce){.dcf-index-card,.dcf-nav-home,.dcf-nav-btn,.dcf-variants>summary::before{transition:none}}
  `;
  document.head.appendChild(s);
}

function navLabel(entry) {
  const n = String(entry.n).padStart(2, '0');
  const suffix = isVariantId(entry.id) ? ` · ${entry.id.split('-').slice(1).join(' ')}` : '';
  return `Nº ${n} · ${entry.title}${suffix}`;
}

export function injectNav({ pageId, mode = 'viz' } = {}) {
  if (!pageId || document.querySelector('.dcf-nav')) return;
  injectNavCSS();
  const items = typeof NAV_REGISTRY !== 'undefined' ? NAV_REGISTRY : [];
  if (!items.length) return;

  const idx = items.findIndex(e => e.id === pageId);
  const cur = idx >= 0 ? idx : 0;
  const prev = items[(cur - 1 + items.length) % items.length];
  const next = items[(cur + 1) % items.length];

  const nav = document.createElement('nav');
  nav.className = 'dcf-nav';
  nav.setAttribute('aria-label', 'Visualization series navigation');

  const home = document.createElement('a');
  home.className = 'dcf-nav-home';
  home.href = 'index.html';
  home.textContent = mode === 'lab' ? 'Design Lab' : 'All viz';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'dcf-nav-btn';
  prevBtn.setAttribute('aria-label', `Previous: ${prev.title}`);
  prevBtn.textContent = '←';
  prevBtn.onclick = () => { location.href = pageFile(prev.id, mode); };

  const sel = document.createElement('select');
  sel.className = 'dcf-nav-select';
  sel.setAttribute('aria-label', 'Jump to visualization');
  items.forEach(entry => {
    const opt = document.createElement('option');
    opt.value = pageFile(entry.id, mode);
    opt.textContent = navLabel(entry);
    if (entry.id === pageId) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = () => { if (sel.value) location.href = sel.value; };

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'dcf-nav-btn';
  nextBtn.setAttribute('aria-label', `Next: ${next.title}`);
  nextBtn.textContent = '→';
  nextBtn.onclick = () => { location.href = pageFile(next.id, mode); };

  const pos = document.createElement('span');
  pos.className = 'dcf-nav-pos';
  pos.textContent = `${cur + 1} / ${items.length}`;

  nav.append(home, prevBtn, sel, nextBtn, pos);

  const hdr = document.querySelector('.dcf-h');
  if (hdr) document.body.insertBefore(nav, hdr);
  else document.body.prepend(nav);
}

function renderCard(entry, mode, { showVariantBadge = false } = {}) {
  const card = document.createElement('a');
  card.className = 'dcf-index-card';
  card.href = pageFile(entry.id, mode);
  card.setAttribute('role', 'listitem');
  card.setAttribute('aria-label', `${entry.title} — ${entry.cat}${showVariantBadge ? ' — variant' : ''}`);

  const thumb = document.createElement('div');
  thumb.className = 'dcf-index-thumb';
  const img = document.createElement('img');
  img.src = previewSrc(entry.id, mode);
  img.alt = '';
  img.loading = 'lazy';
  img.onerror = () => {
    img.remove();
    const fb = document.createElement('div');
    fb.className = 'dcf-index-thumb-fallback';
    fb.textContent = entry.cat;
    thumb.appendChild(fb);
  };
  thumb.appendChild(img);

  const body = document.createElement('div');
  body.className = 'dcf-index-body';
  body.innerHTML = `
    <div class="dcf-index-meta">Nº ${String(entry.n).padStart(2, '0')} · ${entry.cat}${showVariantBadge ? '<span class="dcf-index-variant-badge">Variant</span>' : ''}</div>
    <h2 class="dcf-index-title">${entry.title}</h2>
    <p class="dcf-index-cat">${entry.id.replace(/-/g, ' ')}</p>`;

  card.append(thumb, body);
  return card;
}

function renderGrid(entries, mode, opts) {
  const grid = document.createElement('div');
  grid.className = 'dcf-index-grid';
  grid.setAttribute('role', 'list');
  entries.forEach(entry => grid.appendChild(renderCard(entry, mode, opts)));
  return grid;
}

export function buildIndexPage({ mode = 'viz', title, dek, switchHref } = {}) {
  injectNavCSS();
  const items = typeof NAV_REGISTRY !== 'undefined' ? NAV_REGISTRY : [];
  const canonical = items.filter(entry => !isVariantId(entry.id));
  const variants = items.filter(entry => isVariantId(entry.id));
  const prodHref = mode === 'lab' ? '../viz/index.html' : 'index.html';
  const labHref = mode === 'lab' ? 'index.html' : (switchHref || '../viz2/index.html');
  const hero = document.createElement('header');
  hero.className = 'dcf-index-hero';
  hero.innerHTML = `
    <h1>${title || 'Drug Checking Visualizations'}</h1>
    <p>${dek || ''}</p>
    <div class="dcf-index-switch">
      <a href="${prodHref}" aria-current="${mode === 'viz' ? 'page' : 'false'}">Production viz</a>
      <a href="${labHref}" aria-current="${mode === 'lab' ? 'page' : 'false'}">Design Lab</a>
    </div>`;

  // Primary, curated list: canonical numbered pages only (no a/b/c suffix).
  const grid = renderGrid(canonical, mode);

  document.body.append(hero, grid);

  // Secondary, clearly-labeled section: alternate takes on a canonical page
  // (same number, a/b/c suffix). Collapsed by default so a first-time viewer
  // sees the curated canonical list first, with variants one click away.
  if (variants.length) {
    const section = document.createElement('details');
    section.className = 'dcf-variants';
    const summary = document.createElement('summary');
    summary.textContent = `Variant explorations (${variants.length})`;
    const dekEl = document.createElement('p');
    dekEl.className = 'dcf-variants-dek';
    dekEl.textContent = 'Alternate takes on canonical numbered pages above — different chart forms or framings explored for the same data. Kept for reference, not part of the primary tour.';
    const variantGrid = renderGrid(variants, mode, { showVariantBadge: true });
    section.append(summary, dekEl, variantGrid);
    document.body.append(section);
  }
}

export { pageFile, previewSrc, previewId, navLabel, isVariantId };
