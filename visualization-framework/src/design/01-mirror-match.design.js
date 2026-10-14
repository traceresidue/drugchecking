/* Design Lab layout — score-forward left rail for mirror match */
(function () {
  const style = document.createElement('style');
  style.id = 'dcf-design-01';
  style.textContent = `
    #stage .panel { display: grid; grid-template-columns: minmax(140px, 200px) 1fr; gap: 0; padding: 0; overflow: hidden; }
    #score {
      grid-row: 1 / 3; margin: 0 !important; padding: 20px 18px;
      border-right: 1px solid var(--line); background: var(--panel-2);
      flex-direction: column !important; align-items: flex-start !important; justify-content: center;
      min-height: 460px;
    }
    #score > div:first-child { font-size: 42px !important; line-height: 1; }
    #stage .controls { grid-column: 1 / -1; padding: 14px 18px 0; margin: 0; }
    #stage .panel > svg { grid-column: 2; padding: 12px 8px 8px 0; }
    @media (max-width: 720px) {
      #stage .panel { grid-template-columns: 1fr; }
      #score { grid-row: auto; min-height: auto; border-right: none; border-bottom: 1px solid var(--line); flex-direction: row !important; }
    }
  `;
  document.head.appendChild(style);
  function relocateScore() {
    const panel = document.querySelector('#stage .panel');
    const score = document.getElementById('score');
    if (panel && score && !panel.contains(score)) {
      panel.appendChild(score);
      window.__vizRedraw?.();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', relocateScore);
  else setTimeout(relocateScore, 0);
})();
