# Visualization Preview Guide

## Quick Tour Matrix

| # | Name | Category | Type | Key Feature |
|---|------|----------|------|-------------|
| 01 | [Spectral Mirror Match](viz/01-mirror-match.html) | MS | Side-by-side spectral comparison | Click-to-compare two m/z spectra |
| 02 | [Chromatogram Explorer](viz/02-chromatogram-explorer.html) | GC–MS | Interactive GC–MS trace | Click peaks to see structures and RTs |
| 03 | [FTIR Overlay & Subtraction](viz/03-ftir-overlay.html) | FTIR | Dual FTIR with blend slider | Overlay or subtract two spectra in real-time |
| 04 | [Fragmentation Radial](viz/04-fragment-tree.html) | MS | Radial burst plot | MS peaks arranged as diagnostic rays |
| 05 | [GC–MS Data Cube (3D)](viz/05-chromatogram-3d.html) | GC–MS | 3D scatter (Plotly) | Rotate RT × m/z × intensity space |
| 06 | [Ridgeline Fingerprints](viz/06-spectral-ridgeline.html) | GC–MS | Stacked overlapping traces | Toggle stable vs. volatile supply scenarios |
| 07 | [FTIR Waterfall (3D)](viz/07-ftir-waterfall.html) | FTIR | 3D stacked spectra (Plotly) | Compare 6 FTIR traces in depth |
| 08 | [Mass-Defect Constellation](viz/08-mass-defect-map.html) | MS | Scatter (mass vs. defect) | Chemical composition hints from clustering |
| 09 | [Hear the Spectrum](viz/09-sonification.html) | EXPERIMENTAL | Audio sonification | Convert peaks to notes; *hear* the data |
| 10 | [Chemical-Space Drift](viz/10-chemical-space.html) | EXPERIMENTAL | 2D MDS embedding + drift | Substance relationships; supply movement over time |
| 11 | [Supply Streamgraph](viz/11-supply-streamgraph.html) | SUPPLY | Flowing stacked area | Watch substance classes rise/fall over 36 months |
| 12 | [Co-occurrence Chord](viz/12-cooccurrence-chord.html) | SUPPLY | Chord diagram | Which drugs travel together in the supply |
| 13 | [Expected-Detected Sankey](viz/13-expected-detected-sankey.html) | SUPPLY | Sankey flow | How labeled substances resolve to actual compounds |
| 14 | [Substance Horizon Wall](viz/14-horizon-wall.html) | SUPPLY | Heat map (time × substance) | Monthly prevalence trends for top substances |
| 15 | [Emergence Swarm](viz/15-emergence-beeswarm.html) | SUPPLY | Beeswarm scatter | Novel substances by first-detection date & scale |
| 16 | [Supply Terrain (3D)](viz/16-supply-terrain-3d.html) | SUPPLY | 3D surface (Plotly) | Composition trends as a landscape |
| 17 | [Adulterant Network](viz/17-adulterant-network.html) | SUPPLY | Force-directed graph | Social network of supply relationships |
| 18 | [Result Card](viz/18-result-card.html) | RESULT | Single-sample report | Complete card view: chromatogram + table + structures |
| 19 | [Expected-Reality Gap](viz/19-expected-reality-gap.html) | RESULT | Overlaid chromatogram pair | Side-by-side what-vs-actual contamination |
| 20 | [Potency Uncertainty Gauge](viz/20-potency-uncertainty.html) | RESULT | Speedometer gauge | Distribution of mixture complexity |
| 21 | [Tile-Grid Cartogram](viz/21-geo-tilegrid.html) | GEO | US state tiles | Fentanyl and xylazine prevalence by state |
| 22 | [Xylazine Spread Timeline](viz/22-xylazine-spread.html) | GEO | Animated map progression | Watch xylazine spread across regions (36 months) |
| 23 | [Structure Flipbook](viz/23-structure-flipbook.html) | MS | Carousel of 2D structures | Browse molecules; see SMILES and MW |
| 24 | [Anatomy Scrollytelling](viz/24-anatomy-scrolly.html) | RESULT | Scroll-driven narrative | Build a chromatogram step-by-step with story |
| 25 | [Glyph Garden](viz/25-glyph-garden.html) | EXPERIMENTAL | Procedural generative art | Each substance category as a flower; petals = diversity |

---

## Visualization Type Overview

### **Data Representation Patterns**

```
┌─────────────────────────────────────────────────────────────────┐
│                     VISUALIZATION TYPES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 SPECTRAL (MS, FTIR)                                         │
│     ├─ Mirror Plots      (01, 03)         Side-by-side compare │
│     ├─ Radial Burst      (04)             Fragmentation detail │
│     ├─ Scatter/Mapping   (08)             Chemical space       │
│     ├─ Waterfall/3D      (07)             Multi-sample view    │
│     └─ Sonification      (09)             Sound as data        │
│                                                                 │
│  📈 CHROMATOGRAPHIC (GC–MS)                                     │
│     ├─ Interactive Trace (02)             Click for detail     │
│     ├─ 3D Cube           (05)             Explore all axes     │
│     ├─ Ridgelines        (06)             Batch consistency    │
│     ├─ Scrollytelling    (24)             Narrative building   │
│     └─ Overlay           (19)             Expected vs. real    │
│                                                                 │
│  🌐 SUPPLY & TRENDS                                             │
│     ├─ Streamgraph       (11)             Composition over time│
│     ├─ Chord Diagram     (12)             Co-occurrence        │
│     ├─ Sankey Flow       (13)             Category transitions │
│     ├─ Horizon Wall      (14)             Heatmap trends       │
│     ├─ Beeswarm          (15)             Emergence timeline   │
│     ├─ 3D Surface        (16)             Landscape view       │
│     └─ Network Graph     (17)             Relationship map     │
│                                                                 │
│  📍 GEOGRAPHIC                                                   │
│     ├─ Tile Cartogram    (21)             State-level summary  │
│     └─ Spread Timeline   (22)             Regional progression │
│                                                                 │
│  🎯 RESULT COMMUNICATION                                         │
│     ├─ Result Card       (18)             Complete sample view │
│     ├─ Gap Visualization (19)             Contamination proof  │
│     ├─ Uncertainty Gauge (20)             Potency variability  │
│     └─ Narrative Flow    (24)             Educational journey  │
│                                                                 │
│  🎨 EXPERIMENTAL & CREATIVE                                      │
│     ├─ Chemical Space    (10)             MDS embedding + drift│
│     ├─ Sonification      (09)             Audio representation │
│     ├─ Glyph Garden      (25)             Generative art       │
│     └─ Flipbook          (23)             Carousel interface   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Interactive Features by Visualization

### **Hover / Tooltip**
Hovering reveals details on: 01, 02, 03, 04, 05, 06, 07, 08, 10, 12, 13, 14, 15, 17, 18, 21, 22, 23, 25

### **Click / Toggle**
Interactive controls on: 02, 03, 06, 12, 18, 19, 23, 24

### **3D Rotation & Zoom**
Plotly 3D interactive on: 05, 07, 16

### **Responsive (Resize)**
All visualizations reflow to window width.

---

## Sample Data Coverage

### **Substance Categories**
- **Opioids**: fentanyl, heroin, 4-ANPP, p-fluorofentanyl, acetylcodeine
- **Sedatives/Tranquilizers**: xylazine, bromazolam, diphenhydramine, lidocaine
- **Stimulants**: cocaine, methamphetamine, caffeine
- **Cuts/Inerts**: acetaminophen, levamisole, quinine, mannitol, lactose

### **Data Scope**
- **Sample Count**: 6,580 unique seized samples
- **Geographic**: 11 US states (largest: Washington ~2,847 samples)
- **Time Period**: 36 months (3 years) of monthly aggregates
- **Substance Variety**: 300+ unique detected substances

### **MS/FTIR Coverage**
- **MS Spectra**: 14 common substances with peak tables
- **FTIR Spectra**: 8 common substances with band lists
- **Chromatogram Archetypes**: 4 common profiles (fentanyl street, meth, cocaine, pressed pill)

---

## Suggested Viewing Order

### **For Newcomers to Drug Checking Data**
1. Start with **#24 (Anatomy Scrollytelling)** — teaches GC–MS interpretation step-by-step
2. Then **#02 (Chromatogram Explorer)** — interactive practice reading a real trace
3. Then **#18 (Result Card)** — see how results are communicated to users
4. Then **#01 (Mirror Match)** or **#03 (FTIR Overlay)** — learn spectral matching

### **For Understanding Supply Composition**
1. **#13 (Sankey)** — see expected-vs-detected gap at scale
2. **#11 (Streamgraph)** — watch substance classes change over time
3. **#12 (Chord)** — discover which drugs travel together
4. **#17 (Network)** — see the full relationship graph
5. **#14 (Horizon Wall)** — spot monthly patterns and anomalies

### **For Geographic Insights**
1. **#21 (Cartogram)** — state-by-state snapshot
2. **#22 (Spread)** — watch xylazine/fentanyl emergence by region
3. **#15 (Emergence Swarm)** — 300+ novel substances by first-detection date

### **For Technical/Advanced Users**
1. **#10 (Chemical Space)** — MDS embedding of substance relationships
2. **#05 (3D Cube)** — explore full dimensionality of GC–MS
3. **#08 (Mass-Defect)** — chemical composition from fragmentation patterns
4. **#16 (Supply Terrain)** — trends as continuous landscape
5. **#09 (Sonification)** — experimental sensory mode

### **For Educators / Public Health**
1. **#24 (Scrollytelling)** — narrative-driven learning module
2. **#19 (Expected-Reality Gap)** — stark visual of contamination
3. **#20 (Uncertainty Gauge)** — communicate supply unpredictability
4. **#25 (Glyph Garden)** — whimsical yet data-accurate overview

---

## Design Consistency

All 25 visualizations share:

- **Color Palette**: Unified substance-class colors (fentanyl red, xylazine purple, etc.)
- **Typography**: System fonts (no web-font load delays)
- **Layout**: Consistent header (tag, title, dek), main visualization, "How to read this" sidebar, footer with provenance and harm-reduction notes
- **Accessibility**: ARIA labels, keyboard navigation, high-contrast text
- **Offline**: All work via `file://` with vendored libraries—no CDN, no internet required
- **Performance**: All files < 1.2 MB; 06 (ridgeline) ~820 KB due to procedural SVG; others 13–200 KB

---

## Quick File Reference

| File | Size | Libs Used | Key Data |
|------|------|-----------|----------|
| 01-mirror-match.html | 17 KB | d3 | ms |
| 02-chromatogram-explorer.html | 107 KB | d3, smiles | retention_times |
| 03-ftir-overlay.html | 190 KB | d3 | ftir |
| 04-fragment-tree.html | 6.8 KB | d3 | ms, roles |
| 05-chromatogram-3d.html | 2.5 KB | plotly | retention_times |
| 06-spectral-ridgeline.html | 820 KB | d3 | retention_times |
| 07-ftir-waterfall.html | 2 KB | plotly | ftir |
| 08-mass-defect-map.html | 8.1 KB | d3 | ms, roles |
| 09-sonification.html | 3.8 KB | d3 | ms, ftir |
| 10-chemical-space.html | 34 KB | d3 | embedding, space_points |
| 11-supply-streamgraph.html | 30 KB | d3 | monthly_class |
| 12-cooccurrence-chord.html | 65 KB | d3, sankey | cooccurrence |
| 13-expected-detected-sankey.html | 13 KB | d3, sankey | expected_detected |
| 14-horizon-wall.html | 119 KB | d3 | monthly |
| 15-emergence-beeswarm.html | 62 KB | d3 | emergence |
| 16-supply-terrain-3d.html | 2 KB | plotly | monthly |
| 17-adulterant-network.html | 26 KB | d3 | cooccurrence, roles |
| 18-result-card.html | 108 KB | d3, smiles | retention_times |
| 19-expected-reality-gap.html | 99 KB | d3 | retention_times |
| 20-potency-uncertainty.html | 7.6 KB | d3 | substances_per_sample |
| 21-geo-tilegrid.html | 14 KB | d3 | state_counts, geo |
| 22-xylazine-spread.html | 13 KB | d3 | xylazine_status, geo |
| 23-structure-flipbook.html | 7.1 KB | d3, smiles | top_substances, roles |
| 24-anatomy-scrolly.html | 6.9 KB | d3, smiles | retention_times |
| 25-glyph-garden.html | 9.4 KB | d3 | top_substances, expected_counts |

**Total**: ~1.3 MB across 25 files (including ~4 MB of vendored libraries in `lib/`)

---

## Notes on Illustrations vs. Real Data

- **Real**: Substance prevalence, co-occurrence, monthly trends, geographic distribution, first-detection dates (all from 6,580 actual samples)
- **Illustrative**: MS/FTIR spectra, chromatogram compositions, sample result cards (labeled as illustrative; not for authentication or regulatory use)
- **Key Disclosure**: Every visualization includes a "Provenance" note and "How to read this" section clarifying what is real data vs. illustrative

---

## Viewing & Deployment

### **Local Development**
```bash
cd visualization-framework/viz
open 01-mirror-match.html
# or any other file — all work offline
```

### **Server Deployment**
```bash
# e.g., Apache, nginx, or simple Python server
python3 -m http.server 8080
# then open http://localhost:8080/visualization-framework/viz/
```

### **Static Site / GitHub Pages**
Copy the entire `viz/` folder (with `lib/` subdirectory) to your static host. Each `.html` is self-contained.

---

## Feedback & Iteration

Each visualization is designed to be **independently modifiable**:
- Edit `src/<id>.js` to change a chart's logic or interaction
- Run `python3 build.py` to regenerate the corresponding `viz/<id>.html`
- Run `node test/check.js` to verify no console/page errors

---

**For questions or to contribute**, see the main [INDEX.md](INDEX.md) and [RESEARCH.md](RESEARCH.md) files.
