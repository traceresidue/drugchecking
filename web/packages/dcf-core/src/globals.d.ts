/* Ambient globals the DOM helpers cooperate with in the standalone pages:
   SmilesDrawer is vendored per-page (viz/lib/), NAV_* constants and DCF_NAV
   are injected by build.py from viz/_nav.js. All optional at runtime. */

declare const SmilesDrawer: any;
declare const NAV_PAGE_ID: string | undefined;
declare const NAV_MODE: string | undefined;

interface Window {
  DCF_NAV?: { injectNav(opts: { pageId: string; mode: string }): void };
}
