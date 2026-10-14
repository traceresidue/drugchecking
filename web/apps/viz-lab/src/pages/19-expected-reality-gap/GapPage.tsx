import { chromatogram } from '@dcf/core'
import * as d3 from 'd3'
import { useEffect, useMemo, useState } from 'react'
import { VizLayout } from '../../components/VizLayout'
import { useData } from '../../context/DataContext'
import { substanceColor } from '../../lib/colors'
import { svgClientWidth } from '../../lib/svg'

interface Scenario {
  label: string
  expected: { s: string; rt: number; amp: number }
  actual: string
}

const SCENARIOS: Record<string, Scenario> = {
  heroin: { label: 'Bought as heroin', expected: { s: 'heroin', rt: 10.12, amp: 100 }, actual: 'fentanyl_street' },
  oxy: { label: 'Bought as oxycodone (M30)', expected: { s: 'oxycodone', rt: 9.7, amp: 100 }, actual: 'pressed_pill' },
  coke: { label: 'Bought as cocaine', expected: { s: 'cocaine', rt: 8.39, amp: 100 }, actual: 'cocaine' },
}

const DEFAULT_SCENARIO = SCENARIOS.heroin!;

export default function GapPage() {
  const { loading, spectra, aggregates } = useData()
  const [scenarioKey, setScenarioKey] = useState('heroin')
  const [showReality, setShowReality] = useState(false)
  const scenario = SCENARIOS[scenarioKey] ?? DEFAULT_SCENARIO

  const rtLookup = useMemo(() => {
    const out: Record<string, number> = {}
    const rows = Array.isArray(aggregates?.retention_times) ? aggregates.retention_times : []
    rows.forEach((r) => {
      if (r && typeof r.substance === 'string' && typeof r.rt === 'number') out[r.substance] = r.rt
    })
    return out
  }, [aggregates?.retention_times])

  const realPeaks = useMemo(() => {
    const entry = spectra?.chromatograms?.[scenario.actual]
    if (!entry?.peaks) return []
    return entry.peaks.map((p) => ({ s: p[0], rt: rtLookup[p[0]] ?? p[1], amp: p[2] }))
  }, [rtLookup, scenario.actual, spectra?.chromatograms])

  useEffect(() => {
    const svg = d3.select('#gap-svg')
    svg.selectAll('*').remove()
    const node = svg.node()
    if (!node) return
    const w = svgClientWidth(node, 900)
    const h = 380
    const m = { t: 18, r: 16, b: 34, l: 40 }
    const expectedTrace = chromatogram([{ rt: scenario.expected.rt, amp: scenario.expected.amp }], { x0: 3, x1: 13, sigma: 0.05 }) as { x: number[]; y: number[] }
    const detectedTrace = chromatogram(realPeaks.map((p) => ({ rt: p.rt, amp: p.amp })), { x0: 3, x1: 13, sigma: 0.05 }) as { x: number[]; y: number[] }
    const x = d3.scaleLinear([3, 13], [m.l, w - m.r])
    const y = d3.scaleLinear([0, 108], [h - m.b, m.t])
    const t = showReality ? 1 : 0
    const yv = expectedTrace.y.map((v, i) => v * (1 - t) + (detectedTrace.y[i] ?? 0) * t)
    const points = yv.map((value, i) => ({ x: expectedTrace.x[i] ?? 0, y: value }))
    const topDetected = [...realPeaks].sort((a, b) => b.amp - a.amp)[0]
    const stroke = d3.interpolateRgb(substanceColor(scenario.expected.s), topDetected ? substanceColor(topDetected.s) : 'var(--c-other)')(t)

    const area = d3.area<{ x: number; y: number }>().x((d) => x(d.x)).y0(y(0)).y1((d) => y(d.y)).curve(d3.curveBasis)
    const line = d3.line<{ x: number; y: number }>().x((d) => x(d.x)).y((d) => y(d.y)).curve(d3.curveBasis)

    d3.range(3, 14).forEach((tick: number) => {
      svg.append('text').attr('x', x(tick)).attr('y', h - 14).attr('text-anchor', 'middle').attr('fill', 'var(--faint)').attr('font-size', 11).text(tick)
    })
    svg.append('text').attr('x', w / 2).attr('y', h - 2).attr('text-anchor', 'middle').attr('fill', 'var(--muted)').attr('font-size', 11).text('retention time (min)')
    svg.append('path').datum(points).attr('d', area).attr('fill', stroke).attr('opacity', 0.2)
    svg.append('path').datum(points).attr('d', line).attr('fill', 'none').attr('stroke', stroke).attr('stroke-width', 1.9)
    svg.append('text').attr('x', m.l).attr('y', m.t + 2).attr('font-size', 13).attr('font-weight', 600).attr('fill', stroke).text(showReality ? 'DETECTED' : 'EXPECTED')

    if (showReality) {
      realPeaks.forEach((p) => {
        if (p.amp < 12) return
        svg.append('text').attr('x', x(p.rt)).attr('y', y(p.amp) - 5).attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', 'var(--muted)').text(p.s.length > 11 ? `${p.s.slice(0, 10)}…` : p.s)
      })
    }
  }, [realPeaks, scenario.expected, showReality])

  if (loading) return <div className="loader-screen">Loading datasets…</div>

  const label = showReality
    ? `You expected ${scenario.expected.s}. The lab found ${realPeaks.length} substances: ${realPeaks.map((p) => p.s).join(', ')}.`
    : 'A single, clean expected peak. Toggle to reveal measured reality.'

  return (
    <VizLayout
      vizId="19-expected-reality-gap"
      title="Expected-Reality Gap"
      dek="Toggle between expected single-substance intuition and measured chromatogram reality."
      how={<p>The left state is expectation, the right state is detected composition. Morphing emphasizes substitution and admixture risk in real supply samples.</p>}
      provenance="Scenarios from `spectra.chromatograms` and retention alignment from `aggregates.retention_times`."
      harm="Treat expected identity as uncertain until testing confirms composition."
    >
      <div className="viz-controls">
        <label className="muted" htmlFor="gap-scenario">
          Scenario
        </label>
        <select id="gap-scenario" className="viz-select" value={scenarioKey} onChange={(e) => { setScenarioKey(e.target.value); setShowReality(false) }}>
          {Object.entries(SCENARIOS).map(([k, s]) => (
            <option key={k} value={k}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="button" className="viz-btn" aria-pressed={showReality} onClick={() => setShowReality((v) => !v)}>
          {showReality ? '← back to expectation' : 'reveal reality →'}
        </button>
      </div>
      <div className="viz-panel">
        <svg id="gap-svg" width="100%" height="380" role="img" aria-label="Expected to detected chromatogram morph" />
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        {label}
      </p>
    </VizLayout>
  )
}
