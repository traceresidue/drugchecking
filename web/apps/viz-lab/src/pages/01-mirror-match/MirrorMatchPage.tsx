import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { cosine, fmt, stickSpectrum, type StickPeak } from '@dcf/core';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { substanceColor, signalColor } from '../../lib/colors';
import { useSvgContainer } from '../../lib/hooks';
import { buildMsLibrary, msSubstanceNames } from '../../lib/msData';
import { themeColors } from '../../lib/themeVars';

const HEIGHT = 460;
const PEAK_LABEL_COUNT = 5;

function jitter(peaks: StickPeak[], noise: boolean): StickPeak[] {
  if (!noise) return peaks;
  const out = peaks.map((p) => ({ mz: p.mz, i: Math.max(0, p.i + (Math.random() - 0.5) * 6) }));
  for (let k = 0; k < 14; k++) out.push({ mz: 40 + Math.random() * 300, i: Math.random() * 9 });
  return out;
}

function findMatches(top: StickPeak[], bot: StickPeak[]): Set<number> {
  const matched = new Set<number>();
  for (const a of top) {
    for (const b of bot) {
      if (Math.abs(a.mz - b.mz) <= 0.5) matched.add(Math.round(a.mz));
    }
  }
  return matched;
}

export default function MirrorMatchPage() {
  const { spectra, referenceMs } = useData();
  const msLib = useMemo(() => buildMsLibrary(referenceMs, spectra), [referenceMs, spectra]);
  const names = useMemo(() => msSubstanceNames(msLib, spectra), [msLib, spectra]);

  const [sampleName, setSampleName] = useState('fentanyl');
  const [refName, setRefName] = useState('fentanyl');
  const [noise, setNoise] = useState(false);
  const [scoreInfo, setScoreInfo] = useState({ score: 0, matched: 0, verdict: ['—', signalColor('ok')] as [string, string] });

  const labelCount = typeof window !== 'undefined' && window.innerWidth < 720 ? 3 : PEAK_LABEL_COUNT;

  const draw = useCallback(
    (svgEl: SVGSVGElement, W: number) => {
      const t = themeColors();
      const svg = d3.select(svgEl);
      svg.selectAll('*').remove();
      svg.attr('height', HEIGHT).attr('role', 'img').attr('aria-label', 'Mirror plot comparing two mass spectra');

      const sampleKey = sampleName.toLowerCase();
      const refKey = refName.toLowerCase();
      const sampleEntry = spectra?.ms?.[sampleName] ?? msLib.get(sampleKey);
      const refEntry = msLib.get(refKey) ?? spectra?.ms?.[refName];
      if (!sampleEntry?.peaks?.length || !refEntry?.peaks?.length) return;

      const m = { t: 24, r: 16, b: 34, l: 46 };
      const top = jitter(stickSpectrum(sampleEntry.peaks), noise);
      const bot = stickSpectrum(refEntry.peaks);
      const allmz = [...top, ...bot].map((d) => d.mz);
      const x = d3.scaleLinear([Math.min(...allmz) - 12, Math.max(...allmz) + 12], [m.l, W - m.r]);
      const midY = HEIGHT / 2;
      const yUp = d3.scaleLinear([0, 100], [midY - 10, m.t]);
      const yDn = d3.scaleLinear([0, 100], [midY + 10, HEIGHT - m.b]);
      const matched = findMatches(top, bot);
      const colS = substanceColor(sampleName);
      const colR = substanceColor(refName);

      svg
        .append('line')
        .attr('x1', m.l)
        .attr('x2', W - m.r)
        .attr('y1', midY)
        .attr('y2', midY)
        .attr('stroke', t.line);

      x.ticks(8).forEach((tick) => {
        svg
          .append('text')
          .attr('x', x(tick))
          .attr('y', HEIGHT - 12)
          .attr('fill', t.faint)
          .attr('font-size', 11)
          .attr('text-anchor', 'middle')
          .text(tick);
      });

      svg
        .append('text')
        .attr('x', W - m.r)
        .attr('y', midY - 6)
        .attr('text-anchor', 'end')
        .attr('fill', t.muted)
        .attr('font-size', 11)
        .text('m/z →');
      svg
        .append('text')
        .attr('x', m.l)
        .attr('y', m.t - 8)
        .attr('fill', t.ink)
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .text('▲ Submitted sample');
      svg
        .append('text')
        .attr('x', m.l)
        .attr('y', HEIGHT - m.b + 22)
        .attr('fill', t.muted)
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .text('▼ Library reference');

      function sticks(data: StickPeak[], y: d3.ScaleLinear<number, number>, col: string, up: boolean) {
        const g = svg.append('g');
        g.selectAll('line')
          .data(data)
          .join('line')
          .attr('x1', (d) => x(d.mz))
          .attr('x2', (d) => x(d.mz))
          .attr('y1', y(0))
          .attr('y2', (d) => y(d.i))
          .attr('stroke', (d) => (matched.has(Math.round(d.mz)) ? col : t.faint))
          .attr('stroke-width', (d) => (matched.has(Math.round(d.mz)) ? 2.4 : 1.3))
          .attr('opacity', (d) => (matched.has(Math.round(d.mz)) ? 1 : 0.55));

        const labels = [...data].sort((a, b) => b.i - a.i).slice(0, labelCount);
        g.selectAll('text.lbl')
          .data(labels)
          .join('text')
          .attr('class', 'lbl')
          .attr('x', (d) => x(d.mz))
          .attr('y', (d) => y(d.i) + (up ? -6 : 12))
          .attr('text-anchor', 'middle')
          .attr('font-size', 10)
          .attr('fill', (d) => (matched.has(Math.round(d.mz)) ? col : t.muted))
          .text((d) => fmt.mz(d.mz));
      }

      sticks(top, yUp, colS, true);
      sticks(bot, yDn, colR, false);

      const mwS = sampleEntry.mw ?? spectra?.ms?.[sampleName]?.mw;
      const mwR = refEntry.mw ?? spectra?.ms?.[refName]?.mw;
      if (mwS) {
        svg
          .append('text')
          .attr('x', x(mwS))
          .attr('y', m.t + 12)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10)
          .attr('fill', colS)
          .text('M⁺• ' + mwS);
      }
      if (mwR) {
        svg
          .append('text')
          .attr('x', x(mwR))
          .attr('y', HEIGHT - m.b - 2)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10)
          .attr('fill', colR)
          .text('M⁺• ' + mwR);
      }

      const score = cosine(top, bot);
      const verdict: [string, string] =
        score > 0.9
          ? ['Strong match', signalColor('ok')]
          : score > 0.6
            ? ['Partial match — check further', signalColor('watch')]
            : ['Poor match', signalColor('alert')];
      setScoreInfo({ score, matched: matched.size, verdict });
    },
    [sampleName, refName, noise, spectra, msLib, labelCount],
  );

  const svgRef = useSvgContainer(draw, [draw]);

  const effectiveSample = names.includes(sampleName) ? sampleName : names[0] ?? 'fentanyl';
  const effectiveRef = names.includes(refName) ? refName : names[0] ?? 'fentanyl';

  return (
    <VizLayout
      vizId="01-mirror-match"
      title="Spectral Mirror Match"
      dek="Is this really what the library says it is? The submitted sample (top) is mirrored against a reference spectrum (bottom). Matched fragment ions light up; the cosine score rates the fit."
      how={
        <>
          <b>Mass spectrum.</b> Electron-impact fragmentation breaks a molecule into charged pieces; each vertical stick
          is a fragment at a mass-to-charge ratio (<span className="mono">m/z</span>), scaled so the tallest = 100%.
          The molecular ion <span className="mono">M⁺•</span> (whole molecule) is marked. <b>Matching:</b> sticks that
          line up within ±0.5 <span className="mono">m/z</span> turn solid and connect; the <b>cosine score</b> (0–1)
          summarises overall agreement — a real confirmation lab also checks retention time and uses high-resolution mass.{' '}
          <b>Limits:</b> a high score is strong evidence of identity but isotomers and mixtures can fool any single method.
        </>
      }
      provenance="Spectra are illustrative: fragment positions reflect characteristic ions; intensities approximate. Reference library entries from sqlite when available. Not for analytical identification."
      harm="A library match confirms what is present, never how much. Peak height is not potency."
    >
      <div className="viz-panel viz-mirror-layout">
        <div className="viz-controls viz-mirror-controls">
          <label className="muted" style={{ fontSize: 13 }}>
            Submitted sample reads as
          </label>
          <select
            className="viz-select"
            value={effectiveSample}
            onChange={(e) => setSampleName(e.target.value)}
          >
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <label className="muted" style={{ fontSize: 13 }}>
            compare against library
          </label>
          <select className="viz-select" value={effectiveRef} onChange={(e) => setRefName(e.target.value)}>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="viz-btn"
            aria-pressed={noise}
            onClick={() => setNoise((v) => !v)}
          >
            add realistic noise
          </button>
        </div>

        <aside className="viz-mirror-score" aria-live="polite">
          <div className="viz-mirror-score-value" style={{ color: scoreInfo.verdict[1] }}>
            {scoreInfo.score.toFixed(3)}
          </div>
          <div>
            <div style={{ fontSize: 13, color: scoreInfo.verdict[1], fontWeight: 600 }}>{scoreInfo.verdict[0]}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              cosine similarity · {scoreInfo.matched} fragments matched
            </div>
          </div>
        </aside>

        <div className="viz-mirror-chart">
          <svg ref={svgRef} width="100%" height={HEIGHT} />
        </div>
      </div>
    </VizLayout>
  );
}
