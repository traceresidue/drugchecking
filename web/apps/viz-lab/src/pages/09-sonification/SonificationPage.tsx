import { useCallback, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ftirCurve, stickSpectrum } from '@dcf/core';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { substanceColor } from '../../lib/colors';
import { V } from '../../lib/cssVars';
import { useSvgContainer } from '../../lib/hooks';
import { getVizEntry } from '../../registry';

type Mode = 'MS' | 'IR';

interface PeakPt {
  pos: number;
  amp: number;
}

interface DrawState {
  x: d3.ScaleLinear<number, number>;
  pts: PeakPt[];
  lo: number;
  hi: number;
  W: number;
  m: { t: number; r: number; b: number; l: number };
}

const entry = getVizEntry('09-sonification')!;

function pitch(pos: number, lo: number, hi: number): number {
  const t = (pos - lo) / (hi - lo);
  return 130 * 2 ** (t * 2.6);
}

export default function SonificationPage() {
  const { spectra } = useData();
  const [mode, setMode] = useState<Mode>('MS');
  const [substance, setSubstance] = useState('');
  const [status, setStatus] = useState('Tap “Play sweep” to hear the spectrum left-to-right.');
  const actxRef = useRef<AudioContext | null>(null);
  const drawStateRef = useRef<DrawState | null>(null);
  const phRef = useRef<SVGLineElement | null>(null);

  const msKeys = useMemo(() => Object.keys(spectra?.ms ?? {}), [spectra]);
  const irKeys = useMemo(
    () => Object.keys(spectra?.ftir ?? {}).filter((k) => Array.isArray(spectra?.ftir?.[k])),
    [spectra],
  );
  const keys = mode === 'MS' ? msKeys : irKeys;
  const selected = substance && keys.includes(substance) ? substance : keys[0] ?? '';

  const peaksData = useCallback((): { pts: PeakPt[]; lo: number; hi: number; unit: string } => {
    if (mode === 'MS' && spectra?.ms?.[selected]) {
      const pk = stickSpectrum(spectra.ms[selected].peaks);
      return { pts: pk.map((p: { mz: number; i: number }) => ({ pos: p.mz, amp: p.i })), lo: 40, hi: 360, unit: 'm/z' };
    }
    const bands = spectra?.ftir?.[selected];
    if (!bands || !Array.isArray(bands)) return { pts: [], lo: 400, hi: 4000, unit: 'cm⁻¹' };
    const c = ftirCurve(bands as Array<[number, number, number?]>, { x0: 4000, x1: 400, n: 200 });
    const pts: PeakPt[] = [];
    for (let i = 2; i < c.y.length - 2; i++) {
      if (c.y[i]! > 0.15 && c.y[i]! >= c.y[i - 1]! && c.y[i]! > c.y[i + 1]!) {
        pts.push({ pos: c.x[i]!, amp: c.y[i]! * 100 });
      }
    }
    return { pts, lo: 400, hi: 4000, unit: 'cm⁻¹' };
  }, [mode, selected, spectra]);

  const svgRef = useSvgContainer<SVGSVGElement>(
    (svg, W) => {
      const sel = d3.select(svg);
      sel.selectAll('*').remove();
      const H = 300;
      const m = { t: 18, r: 16, b: 34, l: 30 };
      const { pts, lo, hi, unit } = peaksData();
      const x =
        mode === 'IR'
          ? d3.scaleLinear([hi, lo], [m.l, W - m.r])
          : d3.scaleLinear([lo, hi], [m.l, W - m.r]);
      const y = d3.scaleLinear([0, 100], [H - m.b, m.t]);
      const col = substanceColor(selected);

      x.ticks(7).forEach((t) => {
        sel
          .append('text')
          .attr('x', x(t))
          .attr('y', H - 14)
          .attr('text-anchor', 'middle')
          .attr('fill', V.faint)
          .attr('font-size', 11)
          .text(String(t));
      });
      sel
        .append('text')
        .attr('x', W - m.r)
        .attr('y', H - 14)
        .attr('text-anchor', 'end')
        .attr('fill', V.muted)
        .attr('font-size', 11)
        .text(unit);
      sel
        .selectAll('line.pk')
        .data(pts)
        .join('line')
        .attr('x1', (d) => x(d.pos))
        .attr('x2', (d) => x(d.pos))
        .attr('y1', y(0))
        .attr('y2', (d) => y(d.amp))
        .attr('stroke', col)
        .attr('stroke-width', 2);
      const ph = sel
        .append('line')
        .attr('id', 'ph')
        .attr('x1', m.l)
        .attr('x2', m.l)
        .attr('y1', m.t)
        .attr('y2', H - m.b)
        .attr('stroke', V.ink)
        .attr('opacity', 0);
      phRef.current = ph.node();
      drawStateRef.current = { x, pts, lo, hi, W, m };
    },
    [mode, selected, peaksData],
  );

  const playSweep = async () => {
    if (!actxRef.current) {
      actxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const actx = actxRef.current;
    await actx.resume();
    const state = drawStateRef.current;
    if (!state) return;
    const { pts, lo, hi, W, m } = state;
    const dur = 3.2;
    const t0 = actx.currentTime;
    const sorted = [...pts].sort((a, b) => (mode === 'IR' ? b.pos - a.pos : a.pos - b.pos));
    const span = hi - lo;
    sorted.forEach((p) => {
      const frac = mode === 'IR' ? (hi - p.pos) / span : (p.pos - lo) / span;
      const when = t0 + frac * dur;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = 'sine';
      o.frequency.value = pitch(p.pos, lo, hi);
      const vol = Math.min(0.28, (p.amp / 100) * 0.3);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, when + 0.32);
      o.connect(g).connect(actx.destination);
      o.start(when);
      o.stop(when + 0.34);
    });
    const ph = phRef.current;
    const t1 = performance.now();
    setStatus(
      `Playing ${selected} — ${pts.length} peaks as tones (low note = ${mode === 'IR' ? 'high wavenumber' : 'low mass'}).`,
    );
    const anim = () => {
      const e = (performance.now() - t1) / (dur * 1000);
      if (e > 1) {
        ph?.setAttribute('opacity', '0');
        return;
      }
      ph?.setAttribute('opacity', '0.7');
      const xv = m.l + e * (W - m.l - m.r);
      ph?.setAttribute('x1', String(xv));
      ph?.setAttribute('x2', String(xv));
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  };

  return (
    <VizLayout
      vizId="09-sonification"
      title={entry.title}
      dek={entry.dek}
      how={
        <>
          <b>Sonification</b> maps data to sound. Here each spectral peak is a tone:{' '}
          <span className="mono">m/z</span> (or wavenumber) sets <b>pitch</b> — low mass → low note — and
          abundance sets <b>volume</b>. The sweep plays left to right like reading the chart. This is a genuine{' '}
          <b>accessibility layer</b> and a public-engagement tool: a clean drug and an adulterated one{' '}
          <i>sound</i> different. Toggle two substances to hear a &quot;chord&quot; of a mixture.{' '}
          <b>Audio requires a tap to start</b> (browser autoplay policy).
        </>
      }
      provenance="Illustrative spectra. Sonification is a perceptual aid, not an analytical measurement."
      harm="Hearing the difference is powerful, but ears aren't a test. Use strips and lab checking; carry naloxone."
    >
      <div className="viz-controls">
        <label className="muted" style={{ fontSize: 13 }}>
          Substance
        </label>
        <select
          className="viz-select"
          value={selected}
          onChange={(e) => setSubstance(e.target.value)}
        >
          {keys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <button type="button" className="viz-btn" onClick={playSweep}>
          ▶ Play sweep
        </button>
        <label className="muted" style={{ fontSize: 13 }}>
          mode
        </label>
        <button
          type="button"
          className="viz-btn"
          aria-pressed={mode === 'MS'}
          onClick={() => setMode('MS')}
        >
          mass spectrum
        </button>
        <button
          type="button"
          className="viz-btn"
          aria-pressed={mode === 'IR'}
          onClick={() => setMode('IR')}
        >
          FTIR
        </button>
      </div>
      <div className="viz-panel">
        <svg
          ref={svgRef}
          width="100%"
          height={300}
          role="img"
          aria-label="Spectrum with sonification playhead"
        />
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
        {status}
      </p>
    </VizLayout>
  );
}
