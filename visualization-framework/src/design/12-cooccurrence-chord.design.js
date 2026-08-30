/* Design Lab — focal arc emphasis ring on chord hover */
(function () {
  const style = document.createElement('style');
  style.id = 'dcf-design-12';
  style.textContent = `
    .dcf-arc-ring { fill: none; stroke: var(--ink); stroke-width: 2.5px; opacity: 0.45; pointer-events: none; }
    .dcf-arc-ring.active { opacity: 0.85; stroke-width: 3.5px; }
    [data-labels="low"] .dcf-lbl[data-tier="inline"] { display: none; }
  `;
  document.head.appendChild(style);
})();
