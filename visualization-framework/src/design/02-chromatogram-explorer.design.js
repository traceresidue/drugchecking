/* Design Lab layout — sidebar inspector split for chromatogram explorer */
(function () {
  const style = document.createElement('style');
  style.id = 'dcf-design-02';
  style.textContent = `
    #stage { display: grid; grid-template-columns: 1fr minmax(280px, 36%); gap: 14px; align-items: start; }
    #stage > .controls { grid-column: 1 / -1; }
    #stage > .panel:first-of-type { margin: 0; }
    #detail { margin-top: 0 !important; min-height: 340px !important; position: sticky; top: 72px; }
    @media (max-width: 860px) {
      #stage { grid-template-columns: 1fr; }
      #detail { position: static; min-height: 170px !important; }
    }
  `;
  document.head.appendChild(style);
})();
