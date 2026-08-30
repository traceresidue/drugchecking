#!/usr/bin/env python3
"""Generate critiques.json and label-tiers.json for all registry entries."""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
REG = json.load(open(ROOT / 'src' / 'registry.json', encoding='utf-8'))
EXISTING_CRIT = json.load(open(ROOT / 'src' / 'design' / 'critiques.json', encoding='utf-8'))
EXISTING_TIERS = json.load(open(ROOT / 'src' / 'design' / 'label-tiers.json', encoding='utf-8'))

# Per-id metadata from review.md (thesis, strengths, weaknesses, visualization signature)
META = {
    '03-ftir-overlay': {
        'thesis': 'The subtraction bench teaches residual interpretation well, but mixture chip controls and the fingerprint callout compete vertically with the spectrum.',
        'strengths': ['Fingerprint region shading encodes FTIR convention', 'Residual fill makes unexplained signal visceral', 'Toggle chips support interactive what-if subtraction', 'Harm-reduction note on fent detection floor'],
        'weaknesses': ['Wavenumber ticks always on — no label density control', 'Residual color hardcoded to TOKENS.fent', 'Legend sits below without tier gating', 'Chip rows stack on narrow viewports'],
        'visualization': 'Full-bleed spectrum panel with floating residual legend overlay keeps focus on the unexplained signal band.',
    },
    '04-fragment-tree': {
        'thesis': 'The radial burst is memorable for teaching fragmentation, but spoke labels and guide rings need density tiers for dense spectra.',
        'strengths': ['m/z mapped to radius is intuitive for MS learners', 'Central M⁺ anchor orients the layout', 'Class color on spokes ties fragments to substance', 'Hover tooltips carry abundance detail'],
        'weaknesses': ['No label density control on spoke annotations', 'Guide rings add visual noise in low-label mode', 'Fixed TOKENS colors ignore palette swaps', 'Dropdown-only navigation'],
        'visualization': 'Emphasis ring on the base peak spoke draws the eye to the diagnostic fragment first.',
    },
    '05-chromatogram-3d': {
        'thesis': 'The 3D data cube reveals a hidden dimension powerfully, but Plotly colors and scene chrome are hardcoded rather than palette-aware.',
        'strengths': ['Retention time × m/z × signal matches real GC–MS structure', 'Draggable camera supports exploration', 'Real median retention times ground synthesis', 'Clear harm-reduction dose disclaimer'],
        'weaknesses': ['Colorscale fixed to Night scheme hex values', 'Axis titles always visible regardless of label mode', 'No integration with Design Lab palette selector until viz2', 'Scene background ignores light mode'],
        'visualization': 'Design Lab wires Plotly colorscale and scene chrome to the active palette and label density.',
    },
    '06-spectral-ridgeline': {
        'thesis': 'Ridgelines compare batch fingerprints at a glance, but row labels and stable/volatile toggle need hierarchy control.',
        'strengths': ['22 procedurally generated traces show batch variation', 'Dominant-peak class tint encodes substance', 'Stable vs volatile modes tell supply-shift story', 'Real retention times from aggregates'],
        'weaknesses': ['No per-row label density tiers', 'Fill opacity fixed at 16%', 'Hardcoded TOKENS for grid lines', 'Toggle labels always visible'],
        'visualization': 'Highlight band on hover traces the selected substance column across all ridgelines.',
    },
    '06a-ridgeline-filled': {
        'thesis': 'Class-filled ridgelines emphasize composition over shape, but overlapping fills can obscure weak peaks without label control.',
        'strengths': ['Class fill distinguishes market segments visually', 'Shares ridgeline DNA with Nº 06', 'Stroke/fill pairing aids class reading', 'Seeded RNG keeps comparisons stable'],
        'weaknesses': ['Fill stacking reduces peak-level readability', 'No label density API', 'Colors not palette-swappable', 'Similar layout to base ridgeline without distinct hierarchy'],
        'visualization': 'Collapsible class legend strip keeps the ridgeline stack as the single focal chart.',
    },
    '06b-ridgeline-3d': {
        'thesis': '3D terrain elevates batch comparison literally, but Plotly styling bypasses substance-class semantics.',
        'strengths': ['3D view reveals peak height variation across samples', 'Plotly orbit matches data-cube literacy from Nº 05', 'Procedural batch generation scales comparison', 'Distinct from 2D ridgeline sibling'],
        'weaknesses': ['Height colorscale not tied to classify() palette', 'No label density on axes', 'Performance cost on low-end devices', 'Hardcoded scene chrome'],
        'visualization': 'Design Lab maps terrain colorscale to selected palette stops for coherent theming.',
    },
    '06c-ridgeline-filter': {
        'thesis': 'Class-focus filtering reduces noise for analysts, but filtered-out rows vanish without a density-aware label fallback.',
        'strengths': ['Class filter buttons support focused reading', 'Reduces visual clutter vs full ridgeline', 'Maintains real retention-time grounding', 'Good for teaching class-specific patterns'],
        'weaknesses': ['Filter state not reflected in critique live note', 'Hidden rows leave gaps without annotation', 'Label tiers undefined', 'TOKENS-bound stroke colors'],
        'visualization': 'Filter chips gain active-state accent from palette alert color for clearer mode indication.',
    },
    '07-ftir-waterfall': {
        'thesis': 'The FTIR waterfall shows temporal drift in 3D effectively, but the violet colorscale is aesthetic-only — not substance-mapped.',
        'strengths': ['Wavenumber axis reversed to FTIR convention', 'Monthly stacking shows supply evolution', 'Plotly orbit for exploration', 'Distinct from 2D overlay bench'],
        'weaknesses': ['Fixed purple–gold colorscale', 'No classify() integration', 'Axis label density not configurable', 'Dark scene only'],
        'visualization': 'Palette-driven colorscale replaces hardcoded violet gradient for theme coherence.',
    },
    '08-mass-defect-map': {
        'thesis': 'Mass-defect clustering reveals analog families elegantly, but point labels and Kendrick toggle need tier control.',
        'strengths': ['Scatter encodes exact mass and defect simultaneously', 'Radius scales with sample count', 'Kendrick toggle supports advanced reading', 'Optional SmilesDrawer on hover'],
        'weaknesses': ['Fentanyl family callout always on', 'Legend always visible', 'Point colors hardcoded via classify without palette sync', 'Dense clusters overlap without jitter labels'],
        'visualization': 'Kendrick mode badge animates in high-label mode to signal advanced axis interpretation.',
    },
    '09-sonification': {
        'thesis': 'Sonification makes spectra tangible for non-chemists, but the playhead and stick labels compete for attention during playback.',
        'strengths': ['Web Audio maps m/z to pitch intuitively', 'MS vs FTIR mode toggle', 'Animated playhead shows sweep progress', 'Experimental category appropriately marked'],
        'weaknesses': ['Stick labels always rendered', 'Playhead color not palette-aware', 'No reduced-motion alternative to tone sweep', 'Accessibility of audio-only path limited'],
        'visualization': 'Playback controls move to a compact transport bar below the spectrum for cleaner focus.',
    },
    '10-chemical-space': {
        'thesis': 'Centroid drift over time tells a supply story, but the legend and time-window slider labels need density tiers.',
        'strengths': ['Precomputed embedding enables smooth animation', 'Centroid trail shows aggregate drift', 'Class-colored dots at 50% opacity reduce overlap', 'Range slider supports temporal focus'],
        'weaknesses': ['Legend always on', 'Centroid path labels sparse in low mode', 'Dots hardcoded opacity', 'Slider month labels fixed'],
        'visualization': 'Time-window readout as hero metric above the scatter anchors the drift narrative.',
    },
    '12a-co-nested': {
        'thesis': 'Nested chords reveal hierarchical co-occurrence, but dual ring labels demand aggressive density control.',
        'strengths': ['Nested structure shows partner vs focal relationships', 'Real co-occurrence counts', 'Hover isolation pattern from base chord', 'Distinct layout from flat chord'],
        'weaknesses': ['Partner labels truncate without tiers', 'Complex ring may overwhelm mobile', 'Ribbon opacity fixed', 'Hardcoded classify colors'],
        'visualization': 'Focal substance ring gets emphasis stroke on hover matching Nº 12 Design Lab pattern.',
    },
    '12b-chord-sankey': {
        'thesis': 'Chord-to-Sankey drill-down is powerful for flow detail, but two chart types mean duplicate label surfaces.',
        'strengths': ['Drill-down from chord to Sankey preserves context', 'Directed co-occurrence semantics', 'Dual visualization supports two reading modes', 'Real aggregate data'],
        'weaknesses': ['Sankey node labels always visible', 'Chord arc labels dense at 16 substances', 'Two draw paths to maintain', 'Color sync across views manual'],
        'visualization': 'Split view with chord left and Sankey right on wide screens reduces mode-switching.',
    },
    '12c-co-undirected': {
        'thesis': 'Undirected chords simplify co-use reading, but symmetric ribbons lose the directed supply-recipe story.',
        'strengths': ['Undirected layout reduces visual arrow noise', 'Easier for co-use vs co-manufacture ambiguity', 'Hover dimming still works', 'Class colors on arcs'],
        'weaknesses': ['Loses directed flow semantics', 'Arc labels same density issues as Nº 12', 'Less decision-relevant than directed version', 'TOKENS-bound styling'],
        'visualization': 'Ribbon width legend as inline annotation explains co-occurrence strength without separate panel.',
    },
    '13-expected-detected-sankey': {
        'thesis': 'This is the most harm-reduction-relevant supply viz — expected vs detected — but node labels crowd on mixture-heavy flows.',
        'strengths': ['Sankey width encodes sample count viscerally', 'Left/right expected vs detected framing is clear', 'Real flow data from 6,580 samples', 'Hover tooltips show direction and counts'],
        'weaknesses': ['Node labels always on both sides', 'Link colors use target class without palette sync', 'No label density tiers', 'Headers EXPECTED/DETECTED always visible'],
        'visualization': 'Node labels gain halo stroke from chrome token for readability on light palettes.',
    },
    '14-horizon-wall': {
        'thesis': 'Horizon layers show substance momentum over time, but 22 row labels create a dense wall on mobile.',
        'strengths': ['Layered horizons encode count tiers per substance', 'Momentum ranking surfaces emerging threats', 'Real monthly data', 'Class color per row'],
        'weaknesses': ['Row labels always visible', '22 rows tall on small screens', 'Opacity tiers fixed at 25/55/85%', 'No collapsible substance groups'],
        'visualization': 'Sticky substance label column with scroll-synced chart body improves mobile reading.',
    },
    '15-emergence-beeswarm': {
        'thesis': 'Beeswarm debut dates make emergence visceral, but large-dot text labels need high/low density control.',
        'strengths': ['Force simulation prevents overlap', 'First-detection date on time axis is intuitive', 'Class filter buttons support focus', 'Radius scales with total detections'],
        'weaknesses': ['Labels on dots >250 always on', 'Grid lines add noise in low-label mode', 'Filter button labels fixed', 'Collision layout slow on resize'],
        'visualization': 'Emergence timeline gains a vertical "now" marker for temporal anchoring.',
    },
    '16-supply-terrain-3d': {
        'thesis': 'Supply terrain in 3D dramatizes monthly substance counts, but height colorscale ignores per-substance class semantics.',
        'strengths': ['Substance × month × count matches epidemiology mental model', 'Draggable Plotly camera', 'Top 14 substances keep surface readable', 'Real monthly detection data'],
        'weaknesses': ['Fixed fent-toned colorscale', 'No palette integration', 'Z-axis labels always on', 'No substance ridge labels'],
        'visualization': 'Design Lab palette colorscale replaces hardcoded supply gradient.',
    },
    '17-adulterant-network': {
        'thesis': 'Force network reveals supply topology, but node labels and legend duplicate class information.',
        'strengths': ['Link width scales with co-occurrence', 'Draggable nodes support exploration', 'Role tooltips from DATA.roles', 'Class-colored nodes'],
        'weaknesses': ['Legend always visible', 'No node label density control', 'Simulation re-runs on every resize', 'Link color uniform TOKENS.line'],
        'visualization': 'Hover focus dims non-incident nodes more aggressively for clearer partner identification.',
    },
    '19-expected-reality-gap': {
        'thesis': 'Morph animation between expected and detected chromatograms is pedagogically strong, but peak labels fade in without density tiers.',
        'strengths': ['Color morph between expected and detected classes', '900ms animation respects narrative beat', 'Scenario dropdown covers common gaps', 'Caption updates with detected list'],
        'weaknesses': ['Labels fade in past t=0.5 regardless of density mode', 'Grid always visible', 'Single reveal toggle only', 'Morph colors not palette-synced'],
        'visualization': 'Before/after split panel shows expected trace ghosted beside morphed reality.',
    },
    '20-potency-uncertainty': {
        'thesis': 'Gauge and histogram pair honesty about potency claims well, but axis labels on histogram need tier control.',
        'strengths': ['Confidence slider widens/narrows plausible range', 'Gauge gradient encodes uncertainty semantically', 'Histogram of mixture complexity adds context', 'Harm-reduction aligned copy'],
        'weaknesses': ['Gauge colors hardcoded ok/watch/alert', 'Histogram bar labels sparse', 'No palette sync on semantic colors', 'Slider label always visible'],
        'visualization': 'Claim readout as monospace hero number above gauge anchors the uncertainty story.',
    },
    '21-geo-tilegrid': {
        'thesis': 'Tile-grid cartogram fixes geographic bias, but state abbreviations on every tile need low-label mode for dense grids.',
        'strengths': ['Equal-area tiles avoid big-state dominance', 'Three metric modes (volume, fent, xyl)', 'Real per-state counts', 'Offline — no geometry fetch'],
        'weaknesses': ['State labels always on every tile', 'Inferno scale hardcoded for volume mode', 'Fent/xyl scales use fixed TOKENS', 'Legend text always visible'],
        'visualization': 'Metric mode tabs gain palette-aware fill scales instead of hardcoded interpolators.',
    },
    '22-xylazine-spread': {
        'thesis': 'Timeline plus county bars tell xylazine geography well, but playhead month labels and county names need density tiers.',
        'strengths': ['Stacked area shows primary vs secondary detections', 'Play timeline animates spread', 'County bar chart for selected month', 'Xylazine class color consistent'],
        'weaknesses': ['County bar labels always on', 'Play controls labels fixed', 'Area colors hardcoded TOKENS.xyl', 'Bottom panel competes with area chart'],
        'visualization': 'Playhead month readout as sticky header during timeline scrub.',
    },
    '23-structure-flipbook': {
        'thesis': 'Structure gallery supports analog recognition, but card borders and filter chips need palette-aware class colors.',
        'strengths': ['SmilesDrawer 2D structures on dark canvas', 'Class filter buttons slice gallery', 'Sorted by detection count', 'Card top border encodes class'],
        'weaknesses': ['Gallery grid uniform without hierarchy', 'Filter labels always visible', 'Canvas background hardcoded', 'No label density on card subtitles'],
        'visualization': 'Featured top-3 cards span double width for detection-count hierarchy.',
    },
    '24-anatomy-scrolly': {
        'thesis': 'Scrollytelling builds chromatogram cumulatively — excellent pedagogy — but step peak labels need scroll-synced density.',
        'strengths': ['IntersectionObserver drives cumulative build', 'Sticky chromatogram + scrolling narrative', 'Per-peak class colors', 'Real retention times'],
        'weaknesses': ['Peak labels appear without density control', 'Step copy labels always on', 'Final panel border fixed TOKENS.ok', 'Resize rebuilds all steps'],
        'visualization': 'Step progress rail on the left encodes scroll position through the sample narrative.',
    },
    '25-glyph-garden': {
        'thesis': 'Organic petal glyphs are distinctive, but category labels and legend compete with the garden focal point.',
        'strengths': ['Radial petals encode associated substances per category', 'Opacity by frequency adds hierarchy', 'Hover tooltips with counts', 'Regenerates on resize'],
        'weaknesses': ['Category labels always visible', 'Legend mirrors colors redundantly', 'Petal stroke colors TOKENS-bound', 'Garden recenters on every resize'],
        'visualization': 'Single-category focus mode dims non-selected glyph clusters.',
    },
}

DEFAULT_LIVE = {
    'default': 'Current settings: {theme} chrome · {palette} palette · {labels} label density.',
    'low': 'Low label mode hides peak and inline annotations — rely on hover and tooltips.',
    'high': 'High label mode surfaces more annotations — may crowd on mobile viewports.',
}

TIER_TEMPLATES = {
    'spectral': {
        'axis': {'desc': 'Axis tick numbers and unit labels', 'minLabels': 'always'},
        'legend': {'desc': 'Legend swatches and class key', 'minLabels': 'default'},
        'peak': {'desc': 'Peak or fragment annotations', 'minLabels': 'default'},
        'inline': {'desc': 'Inline substance or region labels', 'minLabels': 'default'},
        'annotation': {'desc': 'Control labels and disclosure copy', 'minLabels': 'always'},
    },
    'plotly3d': {
        'axis': {'desc': 'Plotly axis titles and tick labels', 'minLabels': 'default'},
        'legend': {'desc': 'Color scale or mode legend', 'minLabels': 'default'},
        'peak': {'desc': 'N/A — height encoded', 'minLabels': 'always'},
        'inline': {'desc': 'Control labels (sample select, view buttons)', 'minLabels': 'always'},
        'annotation': {'desc': 'Panel chrome and how-to copy', 'minLabels': 'always'},
    },
    'network': {
        'axis': {'desc': 'N/A — force or radial layout', 'minLabels': 'always'},
        'legend': {'desc': 'Class color legend', 'minLabels': 'default'},
        'peak': {'desc': 'N/A', 'minLabels': 'always'},
        'inline': {'desc': 'Node or arc substance names', 'minLabels': 'default'},
        'annotation': {'desc': 'Headers, tooltips, filter buttons', 'minLabels': 'always'},
    },
    'geo': {
        'axis': {'desc': 'Timeline or axis ticks', 'minLabels': 'default'},
        'legend': {'desc': 'Metric mode legend', 'minLabels': 'default'},
        'peak': {'desc': 'N/A', 'minLabels': 'always'},
        'inline': {'desc': 'State or county labels on map tiles/bars', 'minLabels': 'default'},
        'annotation': {'desc': 'Metric toggle buttons', 'minLabels': 'always'},
    },
    'result': {
        'axis': {'desc': 'Minimal chart axes', 'minLabels': 'low'},
        'legend': {'desc': 'Component or status badges', 'minLabels': 'always'},
        'peak': {'desc': 'Peak or bar segment labels', 'minLabels': 'default'},
        'inline': {'desc': 'Header fields and IDs', 'minLabels': 'always'},
        'annotation': {'desc': 'Harm reduction bullets', 'minLabels': 'always'},
    },
}

CAT_TEMPLATE = {
    'MS': 'spectral', 'GC–MS': 'spectral', 'FTIR': 'spectral',
    'SUPPLY': 'network', 'GEO': 'geo', 'RESULT': 'result', 'EXPERIMENTAL': 'spectral',
}

PLOTLY_IDS = {'05-chromatogram-3d', '06b-ridgeline-3d', '07-ftir-waterfall', '16-supply-terrain-3d'}

critiques = dict(EXISTING_CRIT)
tiers = dict(EXISTING_TIERS)

for spec in REG:
    vid = spec['id']
    if vid not in META and vid not in critiques:
        continue
    if vid in META:
        m = META[vid]
        critiques[vid] = {
            'thesis': m['thesis'],
            'strengths': m['strengths'],
            'weaknesses': m['weaknesses'],
            'visualization': m['visualization'],
            'liveNoteTemplates': dict(DEFAULT_LIVE),
        }
    tmpl_key = 'plotly3d' if vid in PLOTLY_IDS else CAT_TEMPLATE.get(spec['cat'], 'spectral')
    if vid not in tiers:
        tiers[vid] = dict(TIER_TEMPLATES[tmpl_key])

out_crit = ROOT / 'src' / 'design' / 'critiques.json'
out_tiers = ROOT / 'src' / 'design' / 'label-tiers.json'
out_crit.write_text(json.dumps(critiques, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
out_tiers.write_text(json.dumps(tiers, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'critiques: {len(critiques)} entries')
print(f'label-tiers: {len(tiers)} entries')
