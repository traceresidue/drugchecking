/* Entry for the legacy standalone-page artifact (dist/shared.js).
   build.py inlines that file into every viz/*.html, stripping the exports and
   exposing the API as window.DCF — so this entry must export exactly the
   names build.py lists, and must not include loadData (pages inline data). */
export { TOKENS, FONTS } from './tokens.js';
export { classify } from './classify.js';
export { fmt } from './format.js';
export { chromatogram, ftirCurve, stickSpectrum, cosine, normalizePeaks, chromatogramPeaksFromSample, chromatogramFromSample, getReferenceSpec, stickSpectrumFromReference } from './spectral.js';
export { tooltip, scaffold, injectCSS, drawSmiles, isRealChromatogram, fillChromatogramSelect } from './dom.js';
