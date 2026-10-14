import { chromatogram, classify, drawSmiles } from '@dcf/core'
import * as d3 from 'd3'
import { useEffect, useMemo, useState } from 'react'
import { VizLayout } from '../../components/VizLayout'
import { useData } from '../../context/DataContext'
import { substanceColor } from '../../lib/colors'
import { svgClientWidth } from '../../lib/svg'

interface SampleMeta {
  id: string
  expected: string
  date: string
  loc: string
  key: string
}

interface PeakRow {
  s: string
  rt: number
  amp: number
}

const SAMPLES: Record<string, SampleMeta> = {
  s1: { id: 'WA-44821', expected: 'Heroin / "down"', date: '2024-03-08', loc: 'King County, WA', key: 'fentanyl_street' },
  s2: { id: 'NC-10293', expected: 'M30 oxycodone pill', date: '2024-04-19', loc: 'Buncombe County, NC', key: 'pressed_pill' },
  s3: { id: 'OR-55140', expected: 'Cocaine', date: '2024-02-27', loc: 'Multnomah County, OR', key: 'cocaine' },
  s4: { id: 'NY-30817', expected: 'Methamphetamine', date: '2024-05-02', loc: 'Suffolk County, NY', key: 'meth' },
}

const HARM: Record<string, string[]> = {
  fentanyl: ['Carry naloxone — multiple doses may be needed.', 'Never use alone; use with someone who can respond.'],
  xylazine: ['Xylazine sedation will not reverse with naloxone; prioritize rescue breathing and positioning.'],
  bromazolam: ['Street benzos can deepen and prolong sedation. Avoid mixing with alcohol or depressants.'],
  'p-fluorofentanyl': ['A second fentanyl-type signal can add to total opioid load.'],
  cocaine: ['Stimulant supply can carry fentanyl traces; test strips are worth using.'],
  methamphetamine: ['Hydrate and cool down. Potency and co-contamination can vary across batches.'],
}

const DEFAULT_SAMPLE = SAMPLES.s1!;

export default function ResultCardPage() {
  const { loading, spectra, aggregates } = useData()
  const [sampleKey, setSampleKey] = useState('s1')
  const sample = SAMPLES[sampleKey] ?? DEFAULT_SAMPLE

  const rtLookup = useMemo(() => {
    const out: Record<string, number> = {}
    const rows = Array.isArray(aggregates?.retention_times) ? aggregates.retention_times : []
    rows.forEach((row) => {
      if (row && typeof row.substance === 'string' && typeof row.rt === 'number') out[row.substance] = row.rt
    })
    return out
  }, [aggregates?.retention_times])

  const peaks = useMemo<PeakRow[]>(() => {
    const entry = spectra?.chromatograms?.[sample.key]
    if (!entry?.peaks) return []
    return entry.peaks
      .map((p) => ({ s: p[0], rt: rtLookup[p[0]] ?? p[1], amp: p[2] }))
      .sort((a, b) => b.amp - a.amp)
  }, [sample.key, spectra?.chromatograms, rtLookup])

  const major = peaks.filter((p) => p.amp >= 30)
  const minor = peaks.filter((p) => p.amp < 30)
  const primary = peaks[0]
  const primaryColor = primary ? substanceColor(primary.s) : 'var(--c-other)'

  const harmMessages = useMemo(() => {
    const seen = new Set<string>()
    const msgs: string[] = []
    peaks.forEach((p) => {
      const key = Object.keys(HARM).find((h) => p.s.toLowerCase().includes(h))
      if (key && !seen.has(key)) {
        seen.add(key)
        msgs.push(...(HARM[key] ?? []))
      }
    })
    return msgs
  }, [peaks])

  const summary = useMemo(() => {
    if (!primary) return 'No peaks available for this sample.'
    const majorList = major.slice(1).map((p) => p.s)
    const minorList = minor.map((p) => p.s)
    return `The main substance was ${primary.s}. ${
      majorList.length ? `Additional major components: ${majorList.join(', ')}. ` : ''
    }${minorList.length ? `Trace detections: ${minorList.join(', ')}. ` : ''}Total detected: ${peaks.length} substances.`
  }, [major, minor, peaks.length, primary])

  useEffect(() => {
    const svg = d3.select('#result-card-chrom')
    svg.selectAll('*').remove()
    if (!peaks.length) return
    const node = svg.node()
    if (!node) return
    const w = svgClientWidth(node, 360)
    const h = 180
    const m = { t: 12, r: 10, b: 26, l: 10 }
    const trace = chromatogram(peaks.map((p) => ({ rt: p.rt, amp: p.amp })), { x0: 3, x1: 13, sigma: 0.05 }) as { x: number[]; y: number[] }
    const x = d3.scaleLinear([3, 13], [m.l, w - m.r])
    const y = d3.scaleLinear([0, 105], [h - m.b, m.t])
    const points = trace.y.map((value, i) => ({ x: trace.x[i] ?? 0, y: value }))
    const area = d3
      .area<{ x: number; y: number }>()
      .x((d) => x(d.x))
      .y0(y(0))
      .y1((d) => y(d.y))
      .curve(d3.curveBasis)
    const line = d3
      .line<{ x: number; y: number }>()
      .x((d) => x(d.x))
      .y((d) => y(d.y))
      .curve(d3.curveBasis)

    svg.append('path').datum(points).attr('d', area).attr('fill', primaryColor).attr('opacity', 0.18)
    svg.append('path').datum(points).attr('d', line).attr('fill', 'none').attr('stroke', primaryColor).attr('stroke-width', 1.7)
    peaks.forEach((p) => {
      if (p.amp < 13) return
      svg
        .append('text')
        .attr('x', x(p.rt))
        .attr('y', y(p.amp) - 4)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--muted)')
        .attr('font-size', 8.5)
        .text(p.s.length > 11 ? `${p.s.slice(0, 10)}…` : p.s)
    })
  }, [peaks, primaryColor])

  useEffect(() => {
    if (!peaks.length) return
    peaks.slice(0, 3).forEach((peak, idx) => {
      const smiles = spectra?.ms?.[peak.s]?.smiles
      if (smiles) drawSmiles(smiles, `result-card-smiles-${idx}`, 150, 100)
    })
  }, [peaks, spectra?.ms])

  if (loading) return <div className="loader-screen">Loading datasets…</div>

  return (
    <VizLayout
      vizId="18-result-card"
      title="Sample Result Card"
      dek="Single-sample communication card: plain-language finding, chromatogram fingerprint, composition, and harm advice."
      how={
        <p>
          The top summary is the fastest read. The chromatogram and bars show relative signal composition, not purity or dose. Advice below is generated from
          detected substances in this sample profile.
        </p>
      }
      provenance="Built from `spectra.chromatograms` plus `aggregates.retention_times`."
      harm="This is informational and harm-reduction oriented; it is not clinical advice."
    >
      <div className="viz-controls">
        <label className="muted" htmlFor="result-card-sample">
          Sample
        </label>
        <select id="result-card-sample" className="viz-select" value={sampleKey} onChange={(e) => setSampleKey(e.target.value)}>
          {Object.entries(SAMPLES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.id} — sold as {v.expected}
            </option>
          ))}
        </select>
      </div>
      <section className="viz-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <div className="mono" style={{ fontSize: 13 }}>
              {sample.id}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              sold as <b style={{ color: 'var(--ink)' }}>{sample.expected}</b> · {sample.loc} · {sample.date}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="muted" style={{ fontSize: 11 }}>
              TESTED BY GC–MS
            </div>
            <div style={{ fontSize: 12, color: primaryColor, fontWeight: 600 }}>{primary ? classify(primary.s).label : 'Unknown class'}</div>
          </div>
        </div>
        <div style={{ padding: '14px 20px', background: 'var(--panel-2)' }}>
          <div className="muted mono" style={{ fontSize: 11, marginBottom: 6, letterSpacing: '.1em' }}>
            PLAIN-LANGUAGE SUMMARY
          </div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55 }}>{summary}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 0 }}>
          <div style={{ padding: '14px 20px', borderRight: '1px solid var(--line)' }}>
            <div className="muted mono" style={{ fontSize: 11, marginBottom: 6, letterSpacing: '.1em' }}>
              FINGERPRINT (GC–MS)
            </div>
            <svg id="result-card-chrom" width="100%" height="180" />
            <div className="faint" style={{ fontSize: 11 }}>
              Peak height is relative signal only; it does not quantify dose or purity.
            </div>
          </div>
          <div style={{ padding: '14px 20px' }}>
            <div className="muted mono" style={{ fontSize: 11, marginBottom: 8, letterSpacing: '.1em' }}>
              WHAT'S IN IT
            </div>
            {peaks.map((p) => {
              const pct = primary ? (p.amp / primary.amp) * 100 : 0
              return (
                <div key={`${sampleKey}-${p.s}`} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
                    <span>{p.s}</span>
                    <span className="faint mono">{p.amp >= 30 ? 'major' : 'trace'}</span>
                  </div>
                  <div style={{ height: 7, background: 'var(--panel-2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: substanceColor(p.s) }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: 11, letterSpacing: '.1em', marginBottom: 6, color: 'var(--ok)' }}>HARM REDUCTION — BASED ON DETECTIONS</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55, fontSize: 13.5 }}>
            {harmMessages.length ? harmMessages.map((m, i) => <li key={`${m}-${i}`}>{m}</li>) : <li>No generated advice available for this profile.</li>}
          </ul>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
          {peaks.slice(0, 3).map((peak, idx) => (
            <div key={`${peak.s}-${idx}`} style={{ width: 170 }}>
              <div className="muted mono" style={{ fontSize: 10, marginBottom: 4 }}>
                STRUCTURE
              </div>
              <canvas id={`result-card-smiles-${idx}`} width={150} height={100} style={{ width: 150, height: 100, border: '1px solid var(--line)', borderRadius: 8 }} />
              <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>
                {peak.s}
              </div>
            </div>
          ))}
        </div>
      </section>
    </VizLayout>
  )
}
