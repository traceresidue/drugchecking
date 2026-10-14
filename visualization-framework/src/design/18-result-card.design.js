/* Design Lab — document sheet with class accent bar */
(function () {
  const style = document.createElement('style');
  style.id = 'dcf-design-18';
  style.textContent = `
    #card .panel { border-radius: 12px; box-shadow: 0 1px 0 var(--line); position: relative; }
    #card .panel::before {
      content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 5px;
      background: var(--accent-bar, var(--c-fent)); border-radius: 12px 0 0 12px;
    }
    #card .dcf-doc-header { padding-left: 24px !important; }
  `;
  document.head.appendChild(style);

  const origRedraw = window.__vizRedraw;
  window.__vizAccentBar = function (color) {
    const card = document.querySelector('#card .panel');
    if (card) card.style.setProperty('--accent-bar', color);
  };
})();
