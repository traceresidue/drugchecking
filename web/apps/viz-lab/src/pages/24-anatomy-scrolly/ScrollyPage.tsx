import { chromatogram } from '@dcf/core'
import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'
import { VizLayout } from '../../components/VizLayout'
import { useData } from '../../context/DataContext'
import { substanceColor } from '../../lib/colors'
import { svgClientHeight, svgClientWidth } from '../../lib/svg'

interface StepDef {
  add: { s: string; amp: number } | null
  title: string
  body: string
  final?: boolean
}

const STEPS: StepDef[] = [
  { add: null, title: 'One bag. Sold as "down."', body: 'A person submits a sample believed to be heroin. The baseline starts flat.' },
  { add: { s: 'acetaminophen', amp: 38 }, title: 'First peak: a cut.', body: 'Acetaminophen appears first: a common bulking additive.' },
  { add: { s: 'caffeine', amp: 22 }, title: 'A stimulant cut joins.', body: 'Caffeine can alter experiential profile and mask sedation.' },
  { add: { s: 'xylazine', amp: 46 }, title: 'Then the sedative.', body: 'Xylazine emerges as a large peak; naloxone does not reverse this sedative effect.' },
  { add: { s: '4-anpp', amp: 27 }, title: 'Synthesis fingerprint.', body: '4-ANPP appears, often linked to fentanyl synthesis pathways.' },
  { add: { s: 'fentanyl', amp: 100 }, title: 'Tallest peak: fentanyl.', body: 'Fentanyl dominates this profile. Peak height still represents relative signal, not dose.' },
  { add: { s: 'p-fluorofentanyl', amp: 12 }, title: 'A second fentanyl.', body: 'An analogue appears as a smaller but relevant additional opioid signal.' },
  { add: null, final: true, title: 'What this means in practice.', body: 'This profile differs from expected heroin and supports safer-use planning: naloxone, breathing support, never alone.' },
]

export default function ScrollyPage() {
  const { loading, aggregates } = useData()
  const [stepIndex, setStepIndex] = useState(0)
  const stepsRef = useRef<Array<HTMLDivElement | null>>([])

  const rtLookup = useMemo(() => {
    const out: Record<string, number> = {}
    const rows = Array.isArray(aggregates?.retention_times) ? aggregates.retention_times : []
    rows.forEach((r) => {
      if (r && typeof r.substance === 'string' && typeof r.rt === 'number') out[r.substance] = r.rt
    })
    return out
  }, [aggregates?.retention_times])

  const builtPeaks = useMemo(() => {
    const out: Array<{ s: string; rt: number; amp: number }> = []
    for (let i = 1; i <= stepIndex; i += 1) {
      const add = STEPS[i]?.add
      if (!add) continue
      out.push({ s: add.s, rt: rtLookup[add.s] ?? 8, amp: add.amp })
    }
    return out
  }, [rtLookup, stepIndex])

  useEffect(() => {
    const svg = d3.select('#scrolly-svg')
    svg.selectAll('*').remove()
    const node = svg.node()
    if (!node) return
    const w = svgClientWidth(node, 500)
    const h = svgClientHeight(node, 520)
    const m = { t: 18, r: 16, b: 36, l: 40 }
    const x = d3.scaleLinear([3, 13], [m.l, w - m.r])
    const y = d3.scaleLinear([0, 108], [h - m.b, m.t])

    d3.range(3, 14).forEach((tick: number) => {
      svg.append('text').attr('x', x(tick)).attr('y', h - 16).attr('text-anchor', 'middle').attr('fill', 'var(--faint)').attr('font-size', 11).text(tick)
    })
    svg.append('text').attr('x', w / 2).attr('y', h - 2).attr('text-anchor', 'middle').attr('fill', 'var(--muted)').attr('font-size', 11).text('retention time (min)')

    if (!builtPeaks.length) {
      svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', 'var(--line)')
      svg.append('text').attr('x', w / 2).attr('y', h / 2).attr('text-anchor', 'middle').attr('fill', 'var(--faint)').attr('font-size', 13).text('flat baseline — no components added yet')
      return
    }

    const trace = chromatogram(builtPeaks.map((p) => ({ rt: p.rt, amp: p.amp })), { x0: 3, x1: 13, sigma: 0.05 }) as { x: number[]; y: number[] }
    const dominant = builtPeaks[0] ? builtPeaks.slice().sort((a, b) => b.amp - a.amp)[0] : null
    const stroke = dominant ? substanceColor(dominant.s) : 'var(--c-other)'
    const points = trace.y.map((value, i) => ({ x: trace.x[i] ?? 0, y: value }))
    const area = d3.area<{ x: number; y: number }>().x((d) => x(d.x)).y0(y(0)).y1((d) => y(d.y)).curve(d3.curveBasis)
    const line = d3.line<{ x: number; y: number }>().x((d) => x(d.x)).y((d) => y(d.y)).curve(d3.curveBasis)
    svg.append('path').datum(points).attr('d', area).attr('fill', stroke).attr('opacity', 0.16)
    svg.append('path').datum(points).attr('d', line).attr('fill', 'none').attr('stroke', stroke).attr('stroke-width', 1.8)
    builtPeaks.forEach((p, i) => {
      const col = substanceColor(p.s)
      svg.append('circle').attr('cx', x(p.rt)).attr('cy', y(p.amp) - 3).attr('r', i === builtPeaks.length - 1 ? 6 : 4).attr('fill', col).attr('stroke', 'var(--bg)').attr('stroke-width', 1.4)
      svg.append('text').attr('x', x(p.rt)).attr('y', y(p.amp) - 12).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', i === builtPeaks.length - 1 ? col : 'var(--muted)').text(p.s.length > 13 ? `${p.s.slice(0, 12)}…` : p.s)
    })
  }, [builtPeaks])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLDivElement).dataset.i)
            if (!Number.isNaN(idx)) setStepIndex(idx)
          }
        })
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    stepsRef.current.forEach((el) => {
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  if (loading) return <div className="loader-screen">Loading datasets…</div>

  return (
    <VizLayout
      vizId="24-anatomy-scrolly"
      title="Anatomy of a Sample"
      dek="Scroll-driven narrative that builds a chromatogram one component at a time."
      how={<p>The sticky chart visual remains fixed while each scroll step adds a substance signal and contextual interpretation.</p>}
      provenance="Narrative composition anchored to `aggregates.retention_times`."
      harm="A sample expected as one drug can contain mixed opioid and sedative signals; plan for uncertainty."
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <div className="viz-panel" style={{ position: 'sticky', top: 20, height: 'min(70vh, 520px)' }}>
          <svg id="scrolly-svg" width="100%" height="100%" />
        </div>
        <div>
          {STEPS.map((step, i) => (
            <div
              key={`${step.title}-${i}`}
              ref={(el) => {
                stepsRef.current[i] = el
              }}
              data-i={i}
              style={{ minHeight: '76vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px 0' }}
            >
              <div className="viz-panel" style={step.final ? { borderLeft: '3px solid var(--ok)' } : undefined}>
                <div className="muted mono" style={{ fontSize: 11, marginBottom: 6 }}>
                  STEP {i + 1} / {STEPS.length}
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: 19, lineHeight: 1.2 }}>{step.title}</h3>
                <p className="muted" style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </VizLayout>
  )
}
