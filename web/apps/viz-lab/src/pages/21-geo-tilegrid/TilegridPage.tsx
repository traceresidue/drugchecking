import { fmt } from '@dcf/core'
import * as d3 from 'd3'
import { useEffect, useMemo, useState } from 'react'
import { VizLayout } from '../../components/VizLayout'
import { useData } from '../../context/DataContext'
import { svgClientWidth } from '../../lib/svg'

type Metric = 'vol' | 'fent' | 'xyl'

const GRID: Record<string, [number, number]> = {
  AL: [6, 6], AK: [0, 0], AZ: [5, 2], AR: [5, 5], CA: [4, 1], CO: [4, 3], CT: [3, 10], DE: [4, 9], FL: [7, 8], GA: [6, 7],
  HI: [7, 0], ID: [2, 2], IL: [3, 5], IN: [3, 6], IA: [3, 4], KS: [5, 4], KY: [4, 6], LA: [6, 4], ME: [0, 10], MD: [4, 8], MA: [2, 10],
  MI: [2, 7], MN: [2, 4], MS: [6, 5], MO: [4, 5], MT: [2, 3], NE: [4, 4], NV: [3, 2], NH: [1, 10], NJ: [3, 9], NM: [5, 3], NY: [2, 9],
  NC: [5, 8], ND: [1, 4], OH: [3, 7], OK: [5, 4], OR: [3, 1], PA: [3, 8], RI: [3, 11], SC: [6, 8], SD: [2, 4], TN: [5, 6], TX: [6, 3],
  UT: [4, 2], VT: [1, 9], VA: [5, 9], WA: [1, 1], WV: [4, 7], WI: [2, 5], WY: [3, 3],
}

export default function TilegridPage() {
  const { loading, aggregates } = useData()
  const [metric, setMetric] = useState<Metric>('vol')

  const stateCounts = useMemo(() => {
    const src = aggregates?.state_counts
    if (!src) return {}
    if (!Array.isArray(src) && typeof src === 'object') return src as Record<string, number>
    const out: Record<string, number> = {}
    if (Array.isArray(src)) src.forEach((r) => { if (r?.state && typeof r.n === 'number') out[r.state] = r.n })
    return out
  }, [aggregates?.state_counts])

  const stateAgg = useMemo(() => {
    const out: Record<string, { n: number; fent: number; xyl: number }> = {}
    const geo = Array.isArray(aggregates?.geo) ? aggregates.geo : []
    geo.forEach((g) => {
      if (!g?.state || typeof g.n !== 'number') return
      const current = out[g.state] ?? { n: 0, fent: 0, xyl: 0 }
      current.n += g.n
      current.fent += typeof g.fent === 'number' ? g.fent : 0
      current.xyl += typeof g.xyl === 'number' ? g.xyl : 0
      out[g.state] = current
    })
    return out
  }, [aggregates?.geo])

  useEffect(() => {
    const svg = d3.select('#tilegrid-svg')
    svg.selectAll('*').remove()
    const node = svg.node()
    if (!node) return
    const w = svgClientWidth(node, 900)
    const h = 440
    const cols = 12
    const rows = 8
    const pad = 4
    const size = Math.min((w - 20) / cols, (h - 20) / rows)
    const ox = (w - size * cols) / 2
    const oy = 10
    const maxVol = Math.max(1, ...Object.values(stateCounts).filter((v) => typeof v === 'number'))
    const volColor = d3.scaleSequential(d3.interpolateInferno).domain([0, Math.log(maxVol + 1)])
    const fentColor = d3.scaleSequential((t: number) => d3.interpolateRgb('var(--panel-2)', 'var(--c-fent)')(t)).domain([0, 1])
    const xylColor = d3.scaleSequential((t: number) => d3.interpolateRgb('var(--panel-2)', 'var(--c-xyl)')(t)).domain([0, 0.5])

    Object.entries(GRID).forEach(([state, [r, c]]) => {
      const n = stateCounts[state] ?? 0
      const agg = stateAgg[state] ?? { n: 0, fent: 0, xyl: 0 }
      const fpct = agg.n ? agg.fent / agg.n : 0
      const xpct = agg.n ? agg.xyl / agg.n : 0
      const fill = metric === 'vol' ? (n > 0 ? volColor(Math.log(n + 1)) : 'var(--panel-2)') : metric === 'fent' ? (agg.n > 0 ? fentColor(fpct) : 'var(--panel-2)') : agg.n > 0 ? xylColor(xpct) : 'var(--panel-2)'
      const x = ox + c * size
      const y = oy + r * size
      svg.append('rect').attr('x', x + pad / 2).attr('y', y + pad / 2).attr('width', size - pad).attr('height', size - pad).attr('rx', 4).attr('fill', fill).attr('stroke', n > 0 || agg.n > 0 ? 'var(--line)' : 'transparent').attr('opacity', n > 0 || agg.n > 0 ? 1 : 0.25)
      svg.append('text').attr('x', x + size / 2).attr('y', y + size / 2 - 2).attr('text-anchor', 'middle').attr('fill', n > 0 || agg.n > 0 ? '#fff' : 'var(--faint)').attr('font-size', Math.min(13, size / 3.4)).attr('font-weight', 600).text(state)
      if (n > 0 && metric === 'vol') {
        svg.append('text').attr('x', x + size / 2).attr('y', y + size / 2 + 12).attr('text-anchor', 'middle').attr('fill', '#fff').attr('opacity', 0.82).attr('font-size', 9).text(fmt.int(n))
      }
    })
  }, [metric, stateAgg, stateCounts])

  if (loading) return <div className="loader-screen">Loading datasets…</div>

  return (
    <VizLayout
      vizId="21-geo-tilegrid"
      title="Supply Tile-Grid Cartogram"
      dek="State tile map with equal area squares to avoid geographic-size distortion."
      how={<p>Each state gets identical visual area. Toggle between testing volume, fentanyl share, and xylazine share using state-level aggregates.</p>}
      provenance="Uses `aggregates.state_counts` and county rollups from `aggregates.geo`."
      harm="Low-intensity or blank states can indicate data gaps, not low risk."
    >
      <div className="viz-controls">
        <button type="button" className="viz-btn" aria-pressed={metric === 'vol'} onClick={() => setMetric('vol')}>
          testing volume
        </button>
        <button type="button" className="viz-btn" aria-pressed={metric === 'fent'} onClick={() => setMetric('fent')}>
          % fentanyl
        </button>
        <button type="button" className="viz-btn" aria-pressed={metric === 'xyl'} onClick={() => setMetric('xyl')}>
          % xylazine
        </button>
      </div>
      <div className="viz-panel" style={{ display: 'flex', justifyContent: 'center' }}>
        <svg id="tilegrid-svg" width="100%" height="440" role="img" aria-label="US state tile-grid cartogram" />
      </div>
      <div className="viz-legend">
        {metric === 'vol' && <span>Brightness uses log scale of sample count</span>}
        {metric === 'fent' && <span>Brighter states have higher fentanyl share</span>}
        {metric === 'xyl' && <span>Brighter states have higher xylazine share</span>}
      </div>
    </VizLayout>
  )
}
