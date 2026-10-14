import { fmt } from '@dcf/core'
import * as d3 from 'd3'
import { useEffect, useMemo, useState } from 'react'
import { VizLayout } from '../../components/VizLayout'
import { useData } from '../../context/DataContext'
import { svgClientWidth } from '../../lib/svg'

const GRID: Record<string, [number, number]> = {
  AL: [6, 6], AK: [0, 0], AZ: [5, 2], AR: [5, 5], CA: [4, 1], CO: [4, 3], CT: [3, 10], DE: [4, 9], FL: [7, 8], GA: [6, 7],
  HI: [7, 0], ID: [2, 2], IL: [3, 5], IN: [3, 6], IA: [3, 4], KS: [5, 4], KY: [4, 6], LA: [6, 4], ME: [0, 10], MD: [4, 8], MA: [2, 10],
  MI: [2, 7], MN: [2, 4], MS: [6, 5], MO: [4, 5], MT: [2, 3], NE: [4, 4], NV: [3, 2], NH: [1, 10], NJ: [3, 9], NM: [5, 3], NY: [2, 9],
  NC: [5, 8], ND: [1, 4], OH: [3, 7], OK: [5, 4], OR: [3, 1], PA: [3, 8], RI: [3, 11], SC: [6, 8], SD: [2, 4], TN: [5, 6], TX: [6, 3],
  UT: [4, 2], VT: [1, 9], VA: [5, 9], WA: [1, 1], WV: [4, 7], WI: [2, 5], WY: [3, 3],
}

interface MonthRow {
  m: string
  prim: number
  sec: number
  tot: number
}

export default function XylazinePage() {
  const { loading, aggregates } = useData()
  const [monthIdx, setMonthIdx] = useState(0)
  const [playing, setPlaying] = useState(false)

  const rows = useMemo<MonthRow[]>(() => {
    const src = (Array.isArray(aggregates?.xylazine_status) ? aggregates.xylazine_status : []) as Array<Record<string, unknown>>
    const byMonth = new Map<string, { prim: number; sec: number }>()
    src.forEach((d) => {
      const month = typeof d.month === 'string' ? d.month : ''
      const n = typeof d.n === 'number' ? d.n : 0
      if (!month || !n) return
      const prev = byMonth.get(month) ?? { prim: 0, sec: 0 }
      const primary = d.primary === '1' || d.primary === 1 || d.primary === true
      byMonth.set(month, { prim: prev.prim + (primary ? n : 0), sec: prev.sec + (primary ? 0 : n) })
    })
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, v]) => ({ m, prim: v.prim, sec: v.sec, tot: v.prim + v.sec }))
  }, [aggregates?.xylazine_status])

  const months = rows.map((r) => r.m)
  const clampedMonthIdx = Math.min(monthIdx, Math.max(months.length - 1, 0))

  const stateXyl = useMemo(() => {
    const out: Record<string, { n: number; xyl: number; rate: number }> = {}
    const geo = Array.isArray(aggregates?.geo) ? aggregates.geo : []
    geo.forEach((g) => {
      if (!g?.state || typeof g.n !== 'number') return
      const current = out[g.state] ?? { n: 0, xyl: 0, rate: 0 }
      current.n += g.n
      current.xyl += typeof g.xyl === 'number' ? g.xyl : 0
      current.rate = current.n > 0 ? current.xyl / current.n : 0
      out[g.state] = current
    })
    return out
  }, [aggregates?.geo])

  const counties = useMemo(() => {
    const geo = Array.isArray(aggregates?.geo) ? aggregates.geo : []
    return geo.filter((g) => typeof g?.xyl === 'number' && g.xyl > 0).sort((a, b) => (b.xyl as number) - (a.xyl as number)).slice(0, 10)
  }, [aggregates?.geo])

  const cumulativeRatio = useMemo(() => {
    if (!rows.length) return 0
    const total = rows.reduce((acc, r) => acc + r.tot, 0)
    const seen = rows.slice(0, clampedMonthIdx + 1).reduce((acc, r) => acc + r.tot, 0)
    return total > 0 ? seen / total : 0
  }, [clampedMonthIdx, rows])

  useEffect(() => {
    if (!playing || !rows.length) return
    const timer = window.setInterval(() => {
      setMonthIdx((idx) => {
        if (idx >= rows.length - 1) {
          setPlaying(false)
          return rows.length - 1
        }
        return idx + 1
      })
    }, 340)
    return () => window.clearInterval(timer)
  }, [playing, rows.length])

  useEffect(() => {
    const svg = d3.select('#xyl-map')
    svg.selectAll('*').remove()
    const node = svg.node()
    if (!node) return
    const w = svgClientWidth(node, 540)
    const h = 300
    const cols = 12
    const rowsN = 8
    const pad = 4
    const size = Math.min((w - 12) / cols, (h - 12) / rowsN)
    const ox = (w - size * cols) / 2
    const oy = 8
    const maxRate = Math.max(0.25, ...Object.values(stateXyl).map((s) => s.rate))
    const color = d3.scaleSequential((t: number) => d3.interpolateRgb('#1c2030', 'var(--c-xyl)')(t)).domain([0, Math.min(maxRate, 0.8)])

    Object.entries(GRID).forEach(([state, [r, c]]) => {
      const st = stateXyl[state]
      const scaledRate = st ? st.rate * cumulativeRatio : 0
      const x = ox + c * size
      const y = oy + r * size
      svg.append('rect').attr('x', x + pad / 2).attr('y', y + pad / 2).attr('width', size - pad).attr('height', size - pad).attr('rx', 4).attr('fill', st ? color(scaledRate) : '#1c2030').attr('stroke', 'var(--line)').attr('opacity', st ? 1 : 0.3)
      svg.append('text').attr('x', x + size / 2).attr('y', y + size / 2 + 4).attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', st ? '#fff' : 'var(--faint)').text(state)
    })
  }, [cumulativeRatio, stateXyl])

  useEffect(() => {
    const svg = d3.select('#xyl-area')
    svg.selectAll('*').remove()
    const node = svg.node()
    if (!node || !rows.length) return
    const w = svgClientWidth(node, 540)
    const h = 300
    const m = { t: 14, r: 12, b: 34, l: 34 }
    const vis = rows.slice(0, clampedMonthIdx + 1)
    const x = d3.scalePoint(months, [m.l, w - m.r])
    const y = d3.scaleLinear([0, Math.max(1, d3.max(rows, (d) => d.tot) ?? 1) * 1.15], [h - m.b, m.t])
    const stack = d3.stack<MonthRow>().keys(['sec', 'prim'])(vis)
    const area = d3
      .area<d3.SeriesPoint<MonthRow>>()
      .x((_, i) => x(vis[i]?.m ?? '') ?? m.l)
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveMonotoneX)
    const fillByKey: Record<string, string> = { sec: d3.interpolateRgb('var(--c-xyl)', 'var(--bg)')(0.5), prim: 'var(--c-xyl)' }
    svg
      .selectAll('path.band')
      .data(stack)
      .join('path')
      .attr('class', 'band')
      .attr('d', area)
      .attr('fill', (s) => fillByKey[s.key] ?? 'var(--c-other)')
      .attr('opacity', 0.9)
    y.ticks(4).forEach((t: number) => {
      svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', 'var(--line)').attr('opacity', 0.4)
    })
    months.forEach((mo, i) => {
      if (i % 6 === 0 || i === clampedMonthIdx) svg.append('text').attr('x', x(mo) ?? 0).attr('y', h - 14).attr('text-anchor', 'middle').attr('fill', i === clampedMonthIdx ? 'var(--ink)' : 'var(--faint)').attr('font-size', 10).text(fmt.month(mo))
    })
    const cx = x(months[clampedMonthIdx] ?? '')
    if (cx != null) svg.append('line').attr('x1', cx).attr('x2', cx).attr('y1', m.t).attr('y2', h - m.b).attr('stroke', 'var(--ink)').attr('opacity', 0.45).attr('stroke-dasharray', '4,3')
  }, [clampedMonthIdx, months, rows])

  useEffect(() => {
    const svg = d3.select('#xyl-county')
    svg.selectAll('*').remove()
    const node = svg.node()
    if (!node) return
    const w = svgClientWidth(node, 1000)
    const h = 220
    const m = { t: 8, r: 60, b: 10, l: 160 }
    const labels = counties.map((c) => `${String(c.county)}, ${String(c.state)}`)
    const y = d3.scaleBand(labels, [m.t, h - m.b]).padding(0.24)
    const x = d3.scaleLinear([0, Math.max(1, d3.max(counties, (c) => c.xyl as number) ?? 1)], [m.l, w - m.r])
    svg.selectAll('rect.bar').data(counties).join('rect').attr('class', 'bar').attr('x', m.l).attr('y', (c: Record<string, unknown>) => y(`${String(c.county)}, ${String(c.state)}`) ?? m.t).attr('width', (c: Record<string, unknown>) => (x((c.xyl as number) * cumulativeRatio) - m.l)).attr('height', y.bandwidth()).attr('fill', 'var(--c-xyl)').attr('opacity', 0.86).attr('rx', 3)
    svg.selectAll('text.lab').data(counties).join('text').attr('class', 'lab').attr('x', m.l - 6).attr('y', (c: Record<string, unknown>) => (y(`${String(c.county)}, ${String(c.state)}`) ?? m.t) + y.bandwidth() / 2 + 3).attr('text-anchor', 'end').attr('fill', 'var(--muted)').attr('font-size', 10).text((c: Record<string, unknown>) => `${String(c.county).replace(' County', '')}, ${String(c.state)}`)
    svg.selectAll('text.val').data(counties).join('text').attr('class', 'val').attr('x', (c: Record<string, unknown>) => x((c.xyl as number) * cumulativeRatio) + 4).attr('y', (c: Record<string, unknown>) => (y(`${String(c.county)}, ${String(c.state)}`) ?? m.t) + y.bandwidth() / 2 + 3).attr('fill', 'var(--faint)').attr('font-size', 9).text((c: Record<string, unknown>) => fmt.int(Math.round((c.xyl as number) * cumulativeRatio)))
  }, [counties, cumulativeRatio])

  if (loading) return <div className="loader-screen">Loading datasets…</div>

  return (
    <VizLayout
      vizId="22-xylazine-spread"
      title="Xylazine Spread"
      dek="Timeline playback of xylazine detections with synchronized tile map and trend charts."
      how={<p>Timeline rows come from `aggregates.xylazine_status`. Geographic intensity and county bars come from `aggregates.geo` and scale progressively during playback.</p>}
      provenance="Uses monthly xylazine status plus county/state aggregates."
      harm="Xylazine is a sedative, not an opioid; naloxone may be necessary but insufficient."
    >
      <div className="viz-controls">
        <button type="button" className="viz-btn" aria-pressed={playing} onClick={() => { if (!playing && clampedMonthIdx >= rows.length - 1) setMonthIdx(0); setPlaying((v) => !v) }}>
          {playing ? '❚❚ pause' : '▶ play timeline'}
        </button>
        <span className="mono" style={{ color: 'var(--c-xyl)' }}>
          {months[clampedMonthIdx] ? fmt.month(months[clampedMonthIdx]) : 'No monthly data'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="viz-panel">
          <div className="muted mono" style={{ fontSize: 11, marginBottom: 6, letterSpacing: '.1em' }}>
            XYLAZINE POSITIVITY BY STATE
          </div>
          <svg id="xyl-map" width="100%" height="300" />
        </div>
        <div className="viz-panel">
          <div className="muted mono" style={{ fontSize: 11, marginBottom: 6, letterSpacing: '.1em' }}>
            DETECTIONS PER MONTH
          </div>
          <svg id="xyl-area" width="100%" height="300" />
        </div>
      </div>
      <div className="viz-panel" style={{ marginTop: 14 }}>
        <div className="muted mono" style={{ fontSize: 11, marginBottom: 6, letterSpacing: '.1em' }}>
          TOP COUNTIES BY XYLAZINE DETECTION
        </div>
        <svg id="xyl-county" width="100%" height="220" />
      </div>
    </VizLayout>
  )
}
