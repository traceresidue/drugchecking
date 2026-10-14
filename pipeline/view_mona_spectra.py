"""Streamlit viewer for the MoNA GC-MS reference fixture (B1 adapter data).

Loads `fixtures/reference/mona_sample.json` (see `adapters/mona_json.py` for
the full format writeup) and lets a user browse individual records: the real
mass spectrum (m/z vs. relative intensity) plus an illustrative single-peak
"chromatogram" synthesized from the record's reported retention time, side
by side with the record's compound/instrument/provenance metadata.

Run from the repo root:

    streamlit run pipeline/view_mona_spectra.py

Important honesty note (see visualization-framework/DESIGN_SYSTEM.md
principle 2, "Honest uncertainty"): this fixture stores ONE mass spectrum
per record (a bar of m/z:intensity pairs from a single scan), not a
scan-by-scan Total Ion Chromatogram (TIC) trace over the whole GC run. There
is no raw chromatogram data to plot here. What we *can* show, when a record
declares a retention time, is where that compound would appear on a GC
timeline -- rendered as a single synthesized Gaussian peak, exactly the
convention this repo already uses for illustrative chromatograms
(DESIGN_SYSTEM.md's "Spectral conventions": sums of Gaussians, sigma ~=
0.035-0.06 min, at real retention times). That synthesized peak is clearly
labeled as illustrative, never presented as instrument-acquired data.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
import streamlit as st

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_FIXTURE = ROOT / 'pipeline' / 'fixtures' / 'reference' / 'mona_sample.json'

# --- Design system tokens (visualization-framework/DESIGN_SYSTEM.md) -------
BG = '#0b0e14'
PANEL = '#121826'
PANEL_2 = '#1a2234'
LINE = '#26304a'
INK = '#e8ecf4'
MUTED = '#8b94a8'
FAINT = '#5b6478'
C_INFO = '#4cc9f0'   # mass spectrum sticks
C_OK = '#6ee7a8'     # synthesized chromatogram peak (illustrative)
C_WATCH = '#ffd166'  # candidate molecular-ion marker
FONT_MONO = 'DejaVu Sans Mono, monospace'  # CSS (markdown/HTML)
FONT_SANS = 'Inter, ui-sans-serif, system-ui, sans-serif'  # CSS (markdown/HTML)
MPL_FONT_MONO = ['DejaVu Sans Mono', 'monospace']  # matplotlib font family list
MPL_FONT_SANS = ['DejaVu Sans', 'sans-serif']  # matplotlib font family list


def _meta_lookup(meta_list: list[dict[str, Any]]) -> dict[str, str]:
    return {m['name']: m['value'] for m in meta_list if 'name' in m}


def _parse_spectrum(spectrum: str) -> list[tuple[float, float]]:
    peaks: list[tuple[float, float]] = []
    for token in spectrum.split():
        parts = token.split(':')
        if len(parts) != 2:
            continue
        try:
            peaks.append((float(parts[0]), float(parts[1])))
        except ValueError:
            continue
    return peaks


def _parse_retention_time_sec(raw: str | None) -> float | None:
    """Parse MoNA's free-text retention time field into seconds.

    Observed forms in the fixture: "457.516 sec", "992.394  sec", "432.56"
    (no unit -- MassBank's convention defaults unitless retention time to
    seconds), and a handful of "min"-suffixed values. Returns None if the
    field is missing or unparseable rather than guessing.
    """
    if not raw:
        return None
    match = re.match(r'\s*([\d.]+)\s*([a-zA-Z]*)', raw)
    if not match:
        return None
    try:
        value = float(match.group(1))
    except ValueError:
        return None
    unit = match.group(2).lower()
    if unit.startswith('min'):
        return value * 60.0
    return value  # 'sec' or unitless both treated as seconds


@dataclass
class MonaRecord:
    accession: str
    name: str
    formula: str | None
    inchikey: str | None
    smiles: str | None
    cas: str | None
    compound_class: str | None
    exact_mass: str | None
    instrument: str | None
    instrument_type: str | None
    ionization_mode: str | None
    ion_type: str | None
    ms_level: str | None
    column: str | None
    retention_time_raw: str | None
    retention_time_sec: float | None
    retention_index: str | None
    license: str | None
    library: str | None
    tags: list[str] = field(default_factory=list)
    peaks: list[tuple[float, float]] = field(default_factory=list)

    @property
    def label(self) -> str:
        return f'{self.name} — {self.accession} ({len(self.peaks)} peaks)'


@st.cache_data(show_spinner='Parsing MoNA fixture...')
def load_records(path_str: str) -> list[MonaRecord]:
    path = Path(path_str)
    raw = json.loads(path.read_text(encoding='utf-8'))
    records: list[MonaRecord] = []
    for item in raw:
        compounds = item.get('compound') or []
        if not compounds:
            continue
        compound = compounds[0]
        names = compound.get('names') or []
        if not names:
            continue
        name = names[0]['name'].strip()
        comp_meta = _meta_lookup(compound.get('metaData') or [])
        rec_meta = _meta_lookup(item.get('metaData') or [])
        peaks = _parse_spectrum(item.get('spectrum', ''))
        if not peaks:
            continue
        rt_raw = rec_meta.get('retention time')
        records.append(MonaRecord(
            accession=item.get('id', '?'),
            name=name,
            formula=comp_meta.get('molecular formula'),
            inchikey=compound.get('inchiKey'),
            smiles=comp_meta.get('SMILES'),
            cas=comp_meta.get('cas') or comp_meta.get('cas number'),
            compound_class=comp_meta.get('compound class'),
            exact_mass=comp_meta.get('total exact mass') or rec_meta.get('exact mass'),
            instrument=rec_meta.get('instrument'),
            instrument_type=rec_meta.get('instrument type'),
            ionization_mode=rec_meta.get('ionization mode'),
            ion_type=rec_meta.get('ion type'),
            ms_level=rec_meta.get('ms level'),
            column=rec_meta.get('column'),
            retention_time_raw=rt_raw,
            retention_time_sec=_parse_retention_time_sec(rt_raw),
            retention_index=rec_meta.get('retention index'),
            license=rec_meta.get('license'),
            library=(item.get('library') or {}).get('library'),
            tags=[t.get('text', '') for t in (item.get('tags') or [])],
            peaks=sorted(peaks, key=lambda p: p[0]),
        ))
    return sorted(records, key=lambda r: (r.name.lower(), r.accession))


def _style_axes(ax: plt.Axes) -> None:
    ax.set_facecolor(PANEL)
    for spine in ax.spines.values():
        spine.set_color(LINE)
    ax.tick_params(colors=MUTED, labelsize=9)
    ax.xaxis.label.set_color(MUTED)
    ax.yaxis.label.set_color(MUTED)
    ax.title.set_color(INK)
    ax.grid(True, color=LINE, linewidth=0.6, alpha=0.6)
    ax.set_axisbelow(True)


def render_mass_spectrum(record: MonaRecord) -> plt.Figure:
    peaks = record.peaks
    max_intensity = max(i for _, i in peaks) or 1.0
    mzs = [mz for mz, _ in peaks]
    rel = [i / max_intensity * 100.0 for _, i in peaks]

    fig, ax = plt.subplots(figsize=(6.4, 3.6), facecolor=BG)
    _style_axes(ax)
    ax.vlines(mzs, 0, rel, color=C_INFO, linewidth=1.3)
    ax.set_ylim(0, 112)
    ax.set_xlabel('m/z')
    ax.set_ylabel('Relative intensity (%)')
    ax.set_title(f'Mass spectrum · base peak = 100%  ({len(peaks)} peaks)')

    # Label the top N fragments by intensity (design system: label top 4-6).
    top_n = sorted(zip(mzs, rel), key=lambda p: -p[1])[:6]
    for mz, r in top_n:
        ax.annotate(f'{mz:g}', (mz, r), textcoords='offset points', xytext=(0, 4),
                    ha='center', fontsize=8, color=INK, family=MPL_FONT_MONO)

    # Candidate molecular ion: nearest peak to the declared exact mass,
    # only shown when within 1.5 Da -- an inference, not an annotation MoNA
    # itself provides (this fixture's `annotations` arrays are empty).
    if record.exact_mass:
        try:
            exact = float(record.exact_mass)
            nearest_mz, nearest_rel = min(zip(mzs, rel), key=lambda p: abs(p[0] - exact))
            if abs(nearest_mz - exact) <= 1.5:
                ax.annotate('M+* (candidate)', (nearest_mz, nearest_rel),
                            textcoords='offset points', xytext=(0, 16),
                            ha='center', fontsize=8, color=C_WATCH, family=MPL_FONT_SANS)
        except ValueError:
            pass

    fig.tight_layout()
    return fig


def render_chromatogram(record: MonaRecord) -> tuple[plt.Figure | None, str]:
    """Returns (figure, caption). Figure is None when there's genuinely
    nothing chromatographic to plot for this record."""
    if record.retention_time_sec is None:
        if record.retention_index:
            caption = (
                f'No retention **time** recorded — only a Kovats retention index '
                f'(**{record.retention_index}**) is available. Retention index is '
                'column/temperature-program-dependent and not directly convertible '
                'to a time axis, so no chromatogram is drawn here.'
            )
        else:
            caption = 'No retention time or retention index recorded for this reference spectrum.'
        return None, caption

    rt_min = record.retention_time_sec / 60.0
    sigma = 0.05  # minutes; DESIGN_SYSTEM.md convention: 0.035-0.06 min
    x = np.linspace(max(0, rt_min - 0.4), rt_min + 0.4, 400)
    y = 100.0 * np.exp(-((x - rt_min) ** 2) / (2 * sigma ** 2))

    fig, ax = plt.subplots(figsize=(6.4, 3.6), facecolor=BG)
    _style_axes(ax)
    ax.plot(x, y, color=C_OK, linewidth=1.8)
    ax.fill_between(x, y, color=C_OK, alpha=0.15)
    ax.axvline(rt_min, color=C_OK, linewidth=0.8, linestyle='--', alpha=0.6)
    ax.annotate(f'{rt_min:.2f} min', (rt_min, 102), ha='center', fontsize=9,
                color=INK, family=MPL_FONT_MONO)
    ax.set_ylim(0, 112)
    ax.set_xlabel('Retention time (min)')
    ax.set_ylabel('Relative abundance (%)')
    ax.set_title('Illustrative chromatogram position')
    fig.tight_layout()

    caption = (
        f'Synthesized single-peak profile (Gaussian, σ={sigma:.2f} min) centered on this '
        f'record\'s reported retention time ({record.retention_time_raw}). This is **not** '
        'a raw acquired chromatogram — the fixture stores one mass spectrum per record, '
        'not a scan-by-scan trace over the GC run.'
    )
    return fig, caption


PAGE_CSS = f"""
<style>
  html, body, [data-testid="stAppViewContainer"] {{
    background-color: {BG};
    color: {INK};
    font-family: {FONT_SANS};
  }}
  [data-testid="stSidebar"] {{
    background-color: {PANEL};
    border-right: 1px solid {LINE};
  }}
  [data-testid="stHeader"] {{ background-color: transparent; }}
  .dcf-panel {{
    background-color: {PANEL};
    border: 1px solid {LINE};
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 0.75rem;
  }}
  .dcf-mono {{ font-family: {FONT_MONO}; color: {INK}; }}
  .dcf-muted {{ color: {MUTED}; font-size: 0.85rem; }}
  .dcf-kv {{ display: grid; grid-template-columns: 11rem 1fr; gap: 0.15rem 0.75rem; }}
  .dcf-kv dt {{ color: {MUTED}; }}
  .dcf-kv dd {{ margin: 0; color: {INK}; font-family: {FONT_MONO}; font-size: 0.92rem; }}
  h1, h2, h3 {{ color: {INK}; font-family: {FONT_SANS}; }}
  .dcf-badge {{
    display: inline-block; background: {PANEL_2}; color: {MUTED};
    border: 1px solid {LINE}; border-radius: 999px; padding: 0.1rem 0.6rem;
    font-size: 0.75rem; margin-right: 0.35rem;
  }}
</style>
"""


def _kv_row(dt: str, dd: Any) -> str:
    dd = dd if dd not in (None, '') else '—'
    return f'<dt>{dt}</dt><dd>{dd}</dd>'


def main() -> None:
    st.set_page_config(page_title='MoNA reference spectra viewer', layout='wide')
    st.markdown(PAGE_CSS, unsafe_allow_html=True)

    st.title('MoNA GC-MS reference spectra viewer')
    st.markdown(
        '<span class="dcf-muted">Browses `pipeline/fixtures/reference/mona_sample.json` — '
        '351 real MassBank of North America GC-MS reference records (see '
        '<span class="dcf-mono">pipeline/adapters/mona_json.py</span> for the format and '
        'provenance writeup). Two views per record: the real mass spectrum, and — where a '
        'retention time was reported — an illustrative synthesized chromatogram position.</span>',
        unsafe_allow_html=True,
    )

    with st.sidebar:
        st.header('Load a sample')
        fixture_path = st.text_input('Fixture path', value=str(DEFAULT_FIXTURE))
        try:
            records = load_records(fixture_path)
        except FileNotFoundError:
            st.error(f'File not found: {fixture_path}')
            st.stop()
        except json.JSONDecodeError as exc:
            st.error(f'Could not parse JSON: {exc}')
            st.stop()

        st.caption(f'{len(records)} records loaded')
        query = st.text_input('Filter by name or accession', value='')
        filtered = [
            r for r in records
            if query.lower() in r.name.lower() or query.lower() in r.accession.lower()
        ] if query else records

        if not filtered:
            st.warning('No records match that filter.')
            st.stop()

        options = {r.label: r for r in filtered}
        chosen_label = st.selectbox('Record', list(options.keys()))
        record = options[chosen_label]

        st.caption(f'Showing {len(filtered)} of {len(records)} records')

    col1, col2 = st.columns(2)
    with col1:
        st.pyplot(render_mass_spectrum(record), use_container_width=True)
        st.markdown(
            '<span class="dcf-muted">Real data: parsed directly from this record\'s '
            '`spectrum` field (m/z:intensity pairs).</span>',
            unsafe_allow_html=True,
        )

    with col2:
        fig, caption = render_chromatogram(record)
        if fig is not None:
            st.pyplot(fig, use_container_width=True)
        else:
            st.markdown(
                f'<div class="dcf-panel" style="height: 340px; display:flex; '
                f'align-items:center; justify-content:center; text-align:center;">'
                f'<span class="dcf-muted">{caption}</span></div>',
                unsafe_allow_html=True,
            )
            caption = ''
        if caption:
            st.markdown(f'<span class="dcf-muted">{caption}</span>', unsafe_allow_html=True)

    st.markdown('---')
    st.subheader(record.name)
    tags_html = ''.join(f'<span class="dcf-badge">{t}</span>' for t in record.tags)
    st.markdown(tags_html, unsafe_allow_html=True)

    meta_col1, meta_col2, meta_col3 = st.columns(3)
    with meta_col1:
        st.markdown('**Compound**')
        st.markdown(
            '<dl class="dcf-kv">'
            + _kv_row('Formula', record.formula)
            + _kv_row('Exact mass', record.exact_mass)
            + _kv_row('CAS', record.cas)
            + _kv_row('Class', record.compound_class)
            + _kv_row('InChIKey', record.inchikey)
            + '</dl>',
            unsafe_allow_html=True,
        )
    with meta_col2:
        st.markdown('**Instrument & acquisition**')
        st.markdown(
            '<dl class="dcf-kv">'
            + _kv_row('Instrument', record.instrument)
            + _kv_row('Instrument type', record.instrument_type)
            + _kv_row('Ionization mode', record.ionization_mode)
            + _kv_row('Ion type', record.ion_type)
            + _kv_row('MS level', record.ms_level)
            + _kv_row('Column', record.column)
            + '</dl>',
            unsafe_allow_html=True,
        )
    with meta_col3:
        st.markdown('**Chromatography & provenance**')
        st.markdown(
            '<dl class="dcf-kv">'
            + _kv_row('Retention time', record.retention_time_raw)
            + _kv_row('Retention index', record.retention_index)
            + _kv_row('Accession', record.accession)
            + _kv_row('Library', record.library)
            + _kv_row('License', record.license)
            + '</dl>',
            unsafe_allow_html=True,
        )

    if record.smiles:
        st.markdown(
            f'<span class="dcf-muted">SMILES:</span> '
            f'<span class="dcf-mono">{record.smiles}</span>',
            unsafe_allow_html=True,
        )

    with st.expander('How to read this'):
        st.markdown(
            "- **Mass spectrum (left)** is real, parsed straight from this record's "
            "`spectrum` field — vertical sticks, base peak normalized to 100%, top 6 "
            "fragments labeled by m/z. A yellow **M+\\* (candidate)** label marks the peak "
            "nearest the compound's declared exact mass, *if* one falls within 1.5 Da — "
            "MoNA does not annotate molecular ions in this fixture, so this is an inference, "
            "not a source annotation.\n"
            "- **Chromatogram position (right)** is only drawn when the record reports a "
            "retention time. It is a single synthesized Gaussian peak (σ ≈ 0.05 min), not "
            "acquired instrument data — this MoNA export contains one mass spectrum per "
            "record, never a scan-by-scan intensity trace across a GC run, so there is no "
            "real TIC curve to display. Records with only a Kovats **retention index** (no "
            "time) show that value as text instead of a fabricated time axis, since RI is "
            "column/oven-program-dependent and isn't a direct time conversion.\n"
            "- Peak height in the mass spectrum reflects fragment abundance in that one scan, "
            "**not** purity or concentration of anything in a sample — these are reference "
            "library spectra, not sample results.\n"
            "- Licensing is per-record (see `License` above); check it before reusing an "
            "individual spectrum outside this repo."
        )


if __name__ == '__main__':
    main()
