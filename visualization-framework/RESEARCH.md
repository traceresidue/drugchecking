# Research Dossier — Drug Checking Result Visualization

Two structured literature/landscape reviews underpinning this framework, plus the synthesis that drove the 25 designs. Compiled June 2026.

---

## Part A — How drug checking programs currently visualize & deliver results

*Method: ~17 web searches plus program documents, peer-reviewed papers, and program newsletters. Several program sites block automated fetching; details combine search-indexed content with secondary sources.*

### Program-by-program

**DrugsData.org (Erowid / Drug Detective Lab)** — Oldest US public results database. One sample per row in a sortable HTML table; each detail page has a photo of the pill/powder, reagent results, the GC/MS substance list with relative ratios from peak heights/area, and metadata. Qualitative only — no quantitation (DEA-exemption constraint). *Strengths:* unmatched longitudinal archive, raw transparency, stable per-sample URLs. *Weaknesses:* 1990s tabular UI, no aggregate/trend/geo views, ratios misread as purity, no plain-language layer, poor mobile.

**WEDINOS (Wales)** — Postal service; submitters look up a W-prefix sample number in a public table (purchase intent, region, major/minor compounds). Aggregates in PHILTRE quarterly/annual PDFs pairing chemical-profile stats with harm-reduction text. Headline stats (e.g. 43% of "cannabis" samples contained no plant material) drive alerts. *Strengths:* closes the feedback loop; reports effects-experienced alongside chemistry. *Weaknesses:* static PDFs; text-only table — no spectra/photos/trends.

**Toronto Drug Checking Service (drugchecking.cdpe.org) — best in class.** 10,000+ samples (2019–2023). Interactive graphs site updated biweekly with email notification. Design ideas: everything organized around the **expected drug** vs. what was found; a **"noteworthy drugs"** taxonomy (overdose-linked, highly potent, unwanted); filterable graphs (sample type, expected drug, noteworthy found, month); biweekly plain-language narrative reports distributed multi-channel; landmark "What's in Toronto's drug supply?" reports with clean typographic design. *Strengths:* decision-oriented framing, consistent cadence, restrained visual language, transparent methods. *Weaknesses:* no individual lookup; volume dropped ~53% after 2024–25 consumption-site closures — dashboard fragility to upstream service loss.

**BC: drugcheckingbc.ca (BCCSU) & Substance (UVic).** BCCSU publishes monthly overviews by health authority. Substance UVic's monthly reports are the best *quantitative* communication anywhere: per-site "what were people bringing?" plus **fentanyl quantification distributions** ("median 6.6%; half of positives 3.5–16.8%; any one sample might be 0.2% or >50%") and benzo co-occurrence rates. Research arm pushes explainable/automated FTIR interpretation. *Strengths:* quantification with honest uncertainty (median + IQR + extremes) in plain prose. *Weaknesses:* blog format, static images, no interactive cross-month exploration.

**Get Your Drugs Tested (Vancouver)** — World's largest public repository (65,000+) in a searchable archive: date, expected vs. found, software FTIR percentage estimates with caveats. *Strength:* scale + per-sample granularity. *Weakness:* flat table; percentages invite over-trust.

**CanTEST (Canberra)** — Rolling monthly snapshots; 50+ public community notices in three years (world-first N-pyrrolidino isotonitazene detection). Simple tables/infographics + PDF reports.

**The Loop (UK)** — Results delivered as a 15-minute tailored brief intervention; public output is alert graphics (pill photo, dosage warning) via social media and festival screens. The pill-photo alert card is a de facto genre standard. No public database.

**Energy Control (Spain)** — GC-MS/LC-MS since 1999; warnings/alerts (famous PMMA "Superman" pill) and trend reports. No public per-sample database.

**DIMS (Netherlands)** — World's oldest system. Individual results returned in person/phone (no public DB), but its **Red Alert system** is the gold standard for population-level warning: national push-notification app + TV/radio/press within 24 hours. Standardized alert poster: pill photo, logo, dose, risk statement.

**StreetCheck / MADDS (Massachusetts)** — First statewide US community program (FTIR + strips + off-site GC/MS). Real-time web platform: public results portal (sparse public fields), collector app, "instant insights" landing. *Strengths:* sample-to-portal pipeline, tiered privacy, replicable infrastructure. *Weaknesses:* sparse public view, thin aggregate viz relative to data richness.

**UNC Street Drug Analysis Lab (streetsafe.supply).** Most innovative per-sample communication. Each result pairs a **plain-language summary** with the GC-MS chromatogram as the sample's **"visual fingerprint,"** with explicit reading instructions (more peaks = more substances; tall peaks = major, blips = trace; abundance is "a rough relative estimate"; no purity/quantitation). Open datasets + apps, watchlist, newsletters; rapid national signal reports (BTMPS in fentanyl, 2024). *This repository's data comes from this lab's open release.* *Strengths:* teaches lay users to *read* instrument output; open + reproducible; high-res MS. *Weaknesses:* chromatograms still intimidate; link churn.

**NPS Discovery / CFSRE** — Open-access early-warning: 200+ new-drug monographs (structures, spectra, pharmacology), quarterly trend reports with positivity bar charts, public alerts. *Strengths:* speed, analytical authority, archival rigor. *Weaknesses:* toxicologist audience; dense PDFs; nothing for people who use drugs.

**Maryland RAD / NIST DART-MS** — Tests used paraphernalia via DART-MS; results returned through SSP staff. Quarterly PDF newsletters with detection-percentage charts. Expected-vs-detected gap is stark (35% intended heroin; 1.9% contained it; xylazine in 57%, intended in 2%). *Strength:* trace-residue testing reaches people who won't sacrifice product. *Weakness:* week latency, quarterly PDFs only.

**Academic literature on result communication.** PWUD want results that are accurate, fast, free, low-volume, in an "approachable yet nonalarmist tone." The conversation around the result is the active ingredient, not the data artifact. Best practices for results communication remain unestablished — an explicit research gap. Emerging work on explainable AI for FTIR.

**CDC SUDORS (comparator).** Interactive fatal-overdose dashboard: drug-class dropdowns, count/percent toggles, jurisdiction bars, demographics, intervention-opportunity charts. Polished government BI but 12–18 months lagged, aggregate-only. Foil: drug checking wins on timeliness; SUDORS wins on filtering depth and accessibility compliance.

### Synthesis

**State of the art** splits into four genres: (1) per-sample public databases — transparent but visually inert tables; (2) aggregate trend dashboards (Toronto — the benchmark); (3) quantified narrative reports (UVic); (4) alert systems (DIMS, The Loop, CanTEST). No single program combines all four.

**Common failure modes:** the PDF trap; table-without-trend; trend-without-sample (broken personal feedback loop); pseudo-quantification (FTIR % / GC ratios read as purity); audience confusion; no uncertainty visualization; fragile infrastructure; mobile/literacy neglect.

**Unmet opportunities (drove the designs):** "your sample vs. the supply" overlays; annotated touchable chromatograms; expected-vs-found Sankey flows; supply "weather report" risk index; uncertainty-honest quantification gauges; time-lapse novel-substance emergence maps; visual/pill-match libraries; reshareable auto-generated result cards; explainable-AI spectra companions; equipment-residue views; checking↔overdose linkage; cross-jurisdiction federation.

---

## Part B — Modern web visualization methods & libraries (2023–2026)

### Scientific MS / spectra
- **Mirror / head-to-tail plots** (spectrum_utils, matchms `mirror_plot_spectra`) are the workhorse of spectral comparison — trivially re-implemented in D3 for full web interactivity (hover m/z, fragment annotation, matched-peak highlight).
- **Interactive chromatogram viewers**: OpenChrom is the mature desktop tool (mzML/NetCDF, covers GC-MS *and* FTIR). No dominant pure-JS web viewer — render TIC/XIC as zoomable lines with a linked spectrum panel on click ("select a peak, see its spectrum").
- **3D LC-MS/GC-MS cubes** (RT × m/z × intensity): 2D heatmaps usually beat literal 3D for legibility; reserve Three.js/Plotly point clouds for hero views.
- **Kendrick mass defect & van Krevelen** diagrams: derived-axis scatter plots that sort complex mixtures into homologous series/compound classes; value is in interactive brushing.
- **Molecular networking (GNPS)**: spectra as nodes, cosine alignments as edges (Cytoscape.js on the web).
- **UMAP / t-SNE embeddings of spectra** (MS2DeepScore, Spec2Vec, specXplore 2024) — the most transferable modern idea: embed all samples in "chemical space" and show the supply *drifting* over time.

### Web libraries (CDN, mature)
D3 v7 (universal substrate), Observable Plot (terse grammar-of-graphics), Plotly.js (scientific/3D + WebGL `scattergl`/`surface` out of the box), Apache ECharts (dashboards/geo), Vega-Lite (declarative/reproducible), Three.js (scientific 3D, point clouds to ~50–200k pts), deck.gl/kepler.gl (GPU geospatial at scale), regl/WebGPU (million-point custom; WebGPU hit cross-browser baseline Jan 2026), Anime.js/Motion (animation), Scrollama (scrollytelling), Cytoscape.js (networks), uPlot (ultra-fast time series). 3Dmol.js + SmilesDrawer + RDKit.js for molecular structure.

### Novel chart forms now mainstream
Ridgeline plots, streamgraphs, beeswarms, alluvial/Sankey, chord diagrams, hexbin maps, horizon charts, radial/polar, small multiples, glyph encodings. **Data humanism** (Giorgia Lupi / *Dear Data*): data is never neutral — enrich with context and human framing; directly relevant where each data point is a person's safety.

### Public-facing health viz best practice
FT Visual Vocabulary (chart-by-intent). COVID-dashboard lessons: easy navigation, adjustable thresholds, diverse chart selection, explicit handling of misinterpretation, honest denominators ("X% of *tested* samples"). Accessibility: WCAG AA 4.5:1, ColorBrewer colorblind-safe palettes, never encode by color alone, test under protanopia/deuteranopia/tritanopia. **Sonification** as an emerging accessibility + insight layer (peaks→pitch). Plain-language direct annotation over legends (NYT/FT standard).

### Recommended standalone-HTML stack
D3 v7 (substrate) + Observable Plot (exploration) + Plotly.js (3D/WebGL) + uPlot (fast lines) + 3Dmol.js/SmilesDrawer (structures) + Scrollama (narrative), ColorBrewer palettes throughout. Prefer zero-dependency canvas/SVG when a library would only save 20 lines.

### Transferable technique ideas
Interactive mirror plots; UMAP chemical-space drift; supply streamgraphs; concentration ridgelines; expected-vs-actual Sankey; co-occurrence chord; horizon-chart walls; linked chromatogram→spectrum→structure drilldown; spectra sonification; Kendrick/van Krevelen brushing; scrollytelling "anatomy of a sample"; animated geospatial emergence.

---

## How this maps to the 25 visualizations

Each design closes at least one documented gap. The recurring through-lines: (1) **two-layer reading** answers audience confusion; (2) **honest uncertainty** answers pseudo-quantification and the missing-uncertainty failure; (3) **individual↔aggregate bridge** ("your sample vs. the supply") answers trend-without-sample; (4) **interactive, mobile-first, standalone HTML** answers the PDF trap; (5) **emergence/drift/flow forms** (streamgraph, Sankey, chord, embedding, emergence beeswarm) make the supply's *change* visible, which static tables never do.
