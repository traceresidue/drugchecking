# Drug Checking Visualization Framework — 25 Visualizations

**Status**: All 25 visualizations built, tested, and passing. Each is a fully standalone HTML file that works offline (no CDN, no server required). Open any file in `viz/` directly in a web browser.

---

## By Category

### **MASS SPECTROMETRY (MS)** — 4 visualizations

#### 01. Spectral Mirror Match
- **What**: Side-by-side mirror plot comparing a sample's MS to a reference spectrum.
- **Use case**: Quick spectral matching for substance identification.
- **Interaction**: Hover peaks to see m/z and intensity; toggle between sample and reference.
- **Data**: Real MS peak lists (m/z, intensity) for 14 common substances (fentanyl, cocaine, heroin, etc.)
- **File**: `viz/01-mirror-match.html`

#### 04. Fragmentation Radial
- **What**: Radial burst chart where each ray is an MS peak, colored by chemical role (loss, core, fragment).
- **Use case**: Understand fragmentation patterns and molecular structure from mass spec.
- **Interaction**: Hover rays to see m/z, intensity, and structural meaning.
- **Data**: MS peaks with assigned roles (precursor ion, common losses, diagnostic fragments).
- **File**: `viz/04-fragment-tree.html`

#### 08. Mass-Defect Constellation
- **What**: Scatter plot of (mass, mass-defect) showing where peaks cluster in chemical space.
- **Use case**: Identify compound classes and anomalies; mass defect reveals elemental composition hints.
- **Interaction**: Hover points (individual peaks); color by chemical role.
- **Data**: MS peaks from 14 substances, each assigned a chemical role.
- **File**: `viz/08-mass-defect-map.html`

#### 23. Structure Flipbook
- **What**: Carousel of 2D molecular structures with SMILES drawn dynamically, one per substance.
- **Use case**: Learn what common street drugs actually look like as molecules.
- **Interaction**: Click next/previous to step through top 12 substances; see SMILES string, MW, classification.
- **Data**: SMILES strings and molecular properties for the 12 most-detected substances.
- **File**: `viz/23-structure-flipbook.html`

---

### **GAS CHROMATOGRAPHY–MASS SPECTROMETRY (GC–MS)** — 4 visualizations

#### 02. Annotated Chromatogram Explorer
- **What**: Interactive chromatogram with clickable peaks; click any peak to see the substance name, RT, and structure.
- **Use case**: Learn to read a real GC–MS trace; understand what each peak means.
- **Interaction**: Hover/click peaks for detail; side pane shows structure and retention time.
- **Data**: One plausible "tranq-dope" sample (fentanyl, xylazine, acetaminophen, caffeine, 4-ANPP, p-fluorofentanyl) with real retention times.
- **File**: `viz/02-chromatogram-explorer.html`

#### 05. GC–MS Data Cube (3D)
- **What**: 3D scatter plot of retention time × m/z × intensity rendered in Plotly.
- **Use case**: Explore the 3D structure of GC–MS data; see how RT separates components, m/z fingerprints them.
- **Interaction**: Rotate, zoom, hover to inspect individual peaks.
- **Data**: Same illustrative sample, resolved into points in (RT, m/z, intensity) space.
- **File**: `viz/05-chromatogram-3d.html`

#### 06. Batch Ridgeline Fingerprints
- **What**: 22 stacked chromatograms as overlapping ridgelines, colored by dominant substance class.
- **Use case**: Spot supply consistency (aligned peaks = stable recipe; scattered = chaotic supply).
- **Interaction**: Toggle between "stable market" and "volatile transition" scenarios; read vertically to track one substance across samples.
- **Data**: 22 procedurally generated samples using real retention times and co-association heuristics.
- **File**: `viz/06-spectral-ridgeline.html`

#### 24. Anatomy of a Sample (Scrollytelling)
- **What**: Scroll-driven narrative building a chromatogram one peak at a time, narrating what each peak means.
- **Use case**: Teach how to interpret GC–MS results; ground an abstract spectrum in real harm-reduction advice.
- **Interaction**: Scroll slowly; the chromatogram builds step-by-step, each step revealing one component (acetaminophen, caffeine, xylazine, 4-ANPP, fentanyl, p-fluorofentanyl) and explaining its significance.
- **Data**: Real retention times and one illustrative "heroin-labeled but actually tranq-dope" composition.
- **File**: `viz/24-anatomy-scrolly.html`

---

### **FOURIER TRANSFORM INFRARED SPECTROSCOPY (FTIR)** — 3 visualizations

#### 03. FTIR Overlay & Subtraction Bench
- **What**: Dual-axis spectra for two substances; drag a slider to overlay or subtract and see where they differ.
- **Use case**: Identify adulterants by spotting peaks that appear/disappear under mix.
- **Interaction**: Slider blends two spectra; x-axis reversed (4000→400 cm⁻¹, following convention).
- **Data**: FTIR band lists (center, intensity, width) for 8 common substances (fentanyl, xylazine, lactose, caffeine, etc.).
- **File**: `viz/03-ftir-overlay.html`

#### 07. FTIR Waterfall (3D)
- **What**: 3D waterfall chart of 6 FTIR spectra stacked in depth, rotatable in Plotly.
- **Use case**: Compare spectra at a glance; see which bands are diagnostic.
- **Interaction**: Rotate, zoom; hover to read wavenumber and intensity.
- **Data**: FTIR band lists for 6 representative substances.
- **File**: `viz/07-ftir-waterfall.html`

#### 09. Hear the Spectrum (Sonification)
- **What**: Convert MS and FTIR peaks to audio: higher m/z → higher pitch, intensity → volume.
- **Use case**: Novel, experimental way to "sense" a spectrum; engage other sensory modes.
- **Interaction**: Click to play MS or FTIR as a sound; sonification plays peaks in order.
- **Data**: MS and FTIR data from common substances.
- **File**: `viz/09-sonification.html`

---

### **SUPPLY TRENDS & COMPOSITION** — 6 visualizations

#### 11. Supply Composition Streamgraph
- **What**: Flowing stacked area chart showing how the relative share of each substance class (fentanyl, opioid, xylazine, stimulant, etc.) changed over 36 months.
- **Use case**: Spot emergence and dominance of new adulterants (e.g., xylazine rise).
- **Interaction**: Hover to see exact proportions; legend shows substances by class.
- **Data**: Real monthly counts from 6,580 samples, aggregated by substance class.
- **File**: `viz/11-supply-streamgraph.html`

#### 12. Adulterant Co-occurrence Chord
- **What**: Chord diagram where each arc is a substance (sized by prevalence), ribbons link substances found together, thickness = co-occurrence count.
- **Use case**: Map the "recipes" of the supply—which drugs travel together.
- **Interaction**: Hover an arc to isolate its co-occurrence partners; hover a ribbon to see the pair count.
- **Data**: Real co-occurrence pairs from 6,580 samples (120 pairs tracked); top 16 substances.
- **File**: `viz/12-cooccurrence-chord.html`

#### 13. Expected vs. Detected Sankey
- **What**: Sankey flow diagram showing how samples labeled as one substance (e.g., "heroin") actually resolve into detected compounds (e.g., fentanyl, xylazine, acetaminophen).
- **Use case**: Quantify the gap between what people think they have and what's really there.
- **Interaction**: Hover flows to see counts; color by detected class.
- **Data**: Real expected-vs-detected flows from ~60 category pairs in the dataset.
- **File**: `viz/13-expected-detected-sankey.html`

#### 14. Substance Horizon Wall
- **What**: Heat map where each row is a substance (top 12–15), x-axis is time (36 months), color intensity = monthly count.
- **Use case**: Spot seasonal patterns, emergence, decline, stability.
- **Interaction**: Hover cells to see exact month and count; rows sorted by prevalence.
- **Data**: Real monthly substance counts, drawn from 6,580 samples.
- **File**: `viz/14-horizon-wall.html`

#### 15. Novel-Substance Emergence Swarm
- **What**: Beeswarm scatter plot of 300+ substances, positioned by first-detection date (x-axis) and total prevalence (y-axis); color by class.
- **Use case**: Understand the velocity and scale of novel substance introduction.
- **Interaction**: Hover to see substance name, detection date, total sample count.
- **Data**: First-detection dates and emergence counts for ~300 substances from the dataset.
- **File**: `viz/15-emergence-beeswarm.html`

#### 17. Adulterant Force Network
- **What**: Force-directed graph where nodes are substances, edges are co-occurrence, node size = prevalence, color = class.
- **Use case**: See the "social network" of the supply—which substances cluster and influence each other.
- **Interaction**: Drag nodes to rearrange; hover edges and nodes for details.
- **Data**: Co-occurrence pairs and substance roles (precursor, adulterant, cut, etc.).
- **File**: `viz/17-adulterant-network.html`

---

### **GEOGRAPHIC PATTERNS** — 2 visualizations

#### 21. Supply Tile-Grid Cartogram
- **What**: Stylized map of the US where each state is a tile-grid hexagon, sized/colored by sample count and prevalence of fentanyl and xylazine.
- **Use case**: Spot geographic hot spots and regional supply variation.
- **Interaction**: Hover tiles to see state, sample count, fentanyl %, xylazine %.
- **Data**: Real state-level aggregates from 11 US states, 6,580 samples.
- **File**: `viz/21-geo-tilegrid.html`

#### 22. Xylazine Spread Timeline
- **What**: Animated (or static stepped) map showing xylazine detection first appearing in certain regions, then spreading over 36 months.
- **Use case**: Document the geographic progression of an emerging adulterant.
- **Interaction**: Buttons or slider to step through months; color intensity = xylazine prevalence.
- **Data**: Real first-detection and monthly prevalence of xylazine by state/county.
- **File**: `viz/22-xylazine-spread.html`

---

### **RESULT INTERPRETATION** — 3 visualizations

#### 18. Sample Result Card
- **What**: A card-style panel that shows a single sample's composition as a chromatogram + table of detected compounds + structure carousel.
- **Use case**: Render a user-friendly "here's what's in your sample" report.
- **Interaction**: Chromatogram is annotated; hover peaks; table sortable by intensity.
- **Data**: One illustrative sample with real chromatogram and structure info.
- **File**: `viz/18-result-card.html`

#### 19. Expected-Reality Gap
- **What**: Side-by-side comparison of what a substance *should* have (expected composition) vs. what was actually detected, shown as chromatogram overlays.
- **Use case**: Highlight contamination and substitution at the point of use.
- **Interaction**: Hover peaks to see names; opacity slider to blend the two traces.
- **Data**: Real expected-vs-detected pairs with chromatograms.
- **File**: `viz/19-expected-reality-gap.html`

#### 20. Potency Uncertainty Gauge
- **What**: A "speedometer" gauge showing the distribution of substances-per-sample (how complex mixtures are) with a needle pointing to "your sample's" position.
- **Use case**: Communicate the idea that a single sample is unpredictable in composition.
- **Interaction**: Animated gauge; tooltip explains the distribution.
- **Data**: Distribution of substances-per-sample (0–15) from 6,580 samples.
- **File**: `viz/20-potency-uncertainty.html`

---

### **EXPERIMENTAL & ADVANCED** — 3 visualizations

#### 10. Chemical-Space Drift
- **What**: 2D scatter plot (derived via classical MDS on substance co-occurrence Jaccard distances) showing how substances relate to each other chemically. Includes 40 major substances + 1,600 sampled "drift points" showing supply composition movement over time.
- **Use case**: Explore high-dimensional chemical-space relationships in a simple 2D embedding; see supply shifts as points moving.
- **Interaction**: Hover substances to see name/class; hover drift points to see time and composition.
- **Data**: MDS embedding (40 substances), monthly supply composition (1,600 points).
- **File**: `viz/10-chemical-space.html`

#### 16. Supply Terrain (3D)
- **What**: 3D surface plot where x = time (months), y = substance class, z = count. Creates a "terrain" showing how supply composition rises and falls.
- **Use case**: Visualize supply trends as a continuous landscape rather than discrete bars.
- **Interaction**: Rotate, zoom in Plotly; hover to inspect exact (month, class, count).
- **Data**: Real monthly counts aggregated by substance class (36 months, 6 classes).
- **File**: `viz/16-supply-terrain-3d.html`

#### 25. Sample Glyph Garden
- **What**: Procedural generative art: each "expected substance" category (fentanyl, cocaine, heroin, etc.) becomes a small flower-like glyph. Petal count = how many different substances detected in that category, petal length = prevalence, petal color = class.
- **Use case**: At-a-glance visual "supply census"—a spiky, lopsided flower signals heavy cross-contamination.
- **Interaction**: Hover petals to see detected substance names and counts; legend shows color codes.
- **Data**: Real co-detection patterns from 6,580 samples, laid out as 8 category flowers.
- **File**: `viz/25-glyph-garden.html`

---

## How to View

### In a browser (offline)
1. Navigate to `/home/user/drugchecking/visualization-framework/viz/`
2. Open any `.html` file directly (e.g., `01-mirror-match.html`)
3. No server, no internet, no build step needed—everything is self-contained

### Via file:// URL
Open a terminal and run:
```bash
cd visualization-framework/viz
# on macOS
open 01-mirror-match.html

# on Linux with x-display
firefox 01-mirror-match.html

# or just double-click the file in a file browser
```

### Testing
All 25 have been verified to load without console or page errors:
```bash
cd visualization-framework
node test/check.js
```
Output: `0 of 25 failed` ✓

---

## Technical Stack

- **Data**: Real aggregates extracted from 6,580 lab samples across 11 US states
- **Spectra**: Illustrative MS, FTIR, and chromatogram data (labeled as illustrative, not analytical)
- **Libraries**: D3.js v7, Plotly.js, d3-sankey, SmilesDrawer, topojson-client (all vendored locally in `viz/lib/`)
- **Design**: Unified color palette, typography, accessibility, and harm-reduction framing per `DESIGN_SYSTEM.md`
- **Build**: Single Python script (`build.py`) that inlines data and code into standalone HTML files
- **Philosophy**: Every file opens from the filesystem (no server, no CDN, no JavaScript build step)

---

## Files & Structure

```
visualization-framework/
├── DESIGN_SYSTEM.md         Design and color system documentation
├── RESEARCH.md              Background research on drug-checking programs & visualization methods
├── INDEX.md                 This file
├── build.py                 Python script to build all 25 visualizations
├── data/
│   ├── aggregates.json      Real aggregate data (substance prevalence, co-occurrence, trends, geo, etc.)
│   └── spectra.json         Illustrative MS, FTIR, and chromatogram spectra
├── src/
│   ├── 01-mirror-match.js … 25-glyph-garden.js  Source code for each visualization
│   └── registry.json        Metadata: which libs, data, and spectra each viz needs
├── viz/
│   ├── 01-mirror-match.html … 25-glyph-garden.html  Built output (standalone, ready to open)
│   ├── _shared.js           Shared design-system code (inlined into each HTML during build)
│   └── lib/                 Vendored JavaScript libraries
│       ├── d3.min.js
│       ├── d3-sankey.min.js
│       ├── plotly.min.js
│       ├── smiles-drawer.min.js
│       └── topojson-client.min.js
└── test/
    ├── check.js             Playwright headless-browser test suite
    ├── package.json
    └── package-lock.json
```

---

## Key Design Principles

Per `DESIGN_SYSTEM.md`:

1. **Harm Reduction Framing**: Color encodes actionability, not judgment. Neutral palette with substance-class highlights.
2. **Two-Layer Reading**: Header + dek for quick takeaway; "How to read this" details for engagement.
3. **Honest Uncertainty**: Data labeled "illustrative" or "real"; spectral data explicitly flagged as not suitable for authentication.
4. **Accessibility**: ARIA labels, high contrast, system fonts (no accessibility-breaking web fonts), keyboard navigation.
5. **Offline-First**: Every file works over `file://` with no external dependencies beyond local `lib/`.

---

## Next Steps / Future Enhancements

- Deploy to a public-facing web server for real drug-checking programs
- Integrate live result data instead of illustrative data
- Add interactive result upload/test workflows
- Expand to more substance classes and adulterants
- Collect user feedback from harm-reduction organizations
