import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLeft, sankeyLinkHorizontal } from 'd3-sankey';
import { classify, fmt, type SubstanceClass } from '@dcf/core';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { substanceColor } from '../../lib/colors';
import {
  allPartners,
  arcAngle,
  buildColorMap,
  buildCounts,
  buildDrillMatrix,
  buildMatrix,
  CLASS_FILTERS,
  filteredSubs,
  hubRibbonLink,
  layoutPartnerRing,
  shortLabel,
  TOTAL_SAMPLES,
} from '../../lib/cooccurrence';
import { V } from '../../lib/cssVars';
import { useSvgContainer } from '../../lib/hooks';
import { getVizEntry } from '../../registry';

type LayoutMode = 'chord' | 'nested' | 'sankey';

const entry = getVizEntry('12-cooccurrence-chord')!;

interface CoState {
  topN: number;
  clsFilt: SubstanceClass | 'all';
  focal: string | null;
  drilled: boolean;
}

interface SankeyNodeExtra {
  name: string;
  side: 'L' | 'R';
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

interface SankeyLinkExtra {
  source: SankeyNodeExtra | number;
  target: SankeyNodeExtra | number;
  value: number;
  width?: number;
  y0?: number;
  y1?: number;
}

function sankeyHeight(partnerCount: number): number {
  return Math.max(820, 96 + partnerCount * 42);
}

export default function CooccurrencePage() {
  const { aggregates } = useData();
  const [layout, setLayout] = useState<LayoutMode>('chord');
  const [state, setState] = useState<CoState>({ topN: 16, clsFilt: 'all', focal: null, drilled: false });
  const pieRef = useRef<SVGSVGElement>(null);
  const svgHRef = useRef(680);

  const counts = useMemo(() => (aggregates ? buildCounts(aggregates) : {}), [aggregates]);
  const co = aggregates?.cooccurrence ?? [];
  const topSubs = useMemo(() => {
    const names = [...new Set(co.flatMap((d) => [d.a, d.b]))];
    return names
      .filter((n) => counts[n])
      .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
      .slice(0, 16);
  }, [co, counts]);

  const resetAll = useCallback(() => {
    setState((s) => ({ ...s, focal: null, drilled: false }));
  }, []);

  const stepBack = useCallback(() => {
    setState((s) => {
      if (s.drilled) return { ...s, drilled: false };
      if (s.focal) return { ...s, focal: null };
      return s;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stepBack();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [stepBack]);

  const drawChordOverview = useCallback(
    (
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      opts: { M: number[][]; names: string[]; colors: Record<string, string>; R: number; ir: number; directed?: boolean },
    ) => {
      const { M, names, colors, R, ir } = opts;
      const chord = d3.chordDirected().padAngle(0.035).sortSubgroups(d3.descending)(M);
      const arc = d3.arc().innerRadius(ir).outerRadius(R);
      const ribbon = d3.ribbonArrow().radius(ir - 2);
      const ribbonPath = ribbon as unknown as (d: (typeof chord)[number]) => string | null;
      let ringG: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;

      const ribbons = g
        .append('g')
        .attr('fill-opacity', 0.55)
        .selectAll('path')
        .data(chord)
        .join('path')
        .attr('d', (d) => ribbonPath(d) ?? '')
        .attr('fill', (d) => colors[names[d.source.index]!]!)
        .attr('opacity', 0.55)
        .attr('stroke', V.bg)
        .attr('stroke-width', 0.3);

      g.append('g')
        .selectAll('path')
        .data(chord.groups)
        .join('path')
        .attr('d', (d) => arc({ innerRadius: ir, outerRadius: R, startAngle: d.startAngle, endAngle: d.endAngle }) ?? '')
        .attr('fill', (d) => colors[names[d.index]!]!)
        .attr('opacity', 0.9)
        .attr('stroke', V.bg)
        .style('cursor', 'pointer')
        .on('mouseover', (_, d) => {
          ribbons.attr('opacity', (r) =>
            r.source.index === d.index || r.target.index === d.index ? 0.85 : 0.06,
          );
          if (ringG) ringG.remove();
          ringG = g.append('g').attr('class', 'dcf-arc-rings');
          const a = d3.arc().innerRadius(R + 2).outerRadius(R + 10);
          ringG.append('path').attr('d', a({ innerRadius: R + 2, outerRadius: R + 10, startAngle: d.startAngle, endAngle: d.endAngle }) ?? '').attr('transform', 'rotate(-90)');
        })
        .on('mouseleave', () => {
          ribbons.attr('opacity', 0.55);
          ringG?.remove();
          ringG = null;
        });

      g.append('g')
        .selectAll('text')
        .data(chord.groups)
        .join('text')
        .each(function (d) {
          (d as { ang?: number }).ang = arcAngle(d);
        })
        .attr(
          'transform',
          (d) =>
            `rotate(${arcAngle(d) * (180 / Math.PI) - 90}) translate(${R + 8}) ${arcAngle(d) > Math.PI ? 'rotate(180)' : ''}`,
        )
        .attr('text-anchor', (d) => (arcAngle(d) > Math.PI ? 'end' : 'start'))
        .attr('dy', '.35em')
        .attr('fill', (d) => colors[names[d.index]!]!)
        .attr('font-size', 11)
        .text((d) => shortLabel(names[d.index]!, 16));
    },
    [],
  );

  const drawInteractiveChord = useCallback(
    (
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      opts: {
        M: number[][];
        names: string[];
        colors: Record<string, string>;
        R: number;
        ir: number;
        padAngle: number;
        focalIdx: number | null;
        mode: 'overview' | 'drill' | 'sankey-pick';
        onSelect: (name: string) => void;
      },
    ) => {
      const { M, names, colors, R, ir, padAngle, focalIdx, mode, onSelect } = opts;
      const chord = d3.chordDirected().padAngle(padAngle).sortSubgroups(d3.descending)(M);
      const arc = d3.arc().innerRadius(ir).outerRadius(R);
      const ribbon = d3.ribbonArrow().radius(ir - 2);
      const ribbonPath = ribbon as unknown as (d: (typeof chord)[number]) => string | null;

      g.append('g')
        .attr('class', 'ribbons')
        .selectAll('path')
        .data(chord)
        .join('path')
        .attr('d', (d) => ribbonPath(d) ?? '')
        .attr('fill', (d) => colors[names[d.source.index]!]!)
        .attr('stroke', V.bg)
        .attr('stroke-width', 0.35)
        .attr('opacity', (d) => {
          if (mode === 'sankey-pick' && focalIdx != null) {
            const hit = d.source.index === focalIdx || d.target.index === focalIdx;
            return hit ? 0.88 : 0.05;
          }
          return mode === 'drill' ? 0.62 : 0.52;
        })
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          if (mode === 'drill') {
            onSelect(names[d.source.index]!);
            return;
          }
          onSelect(names[d.source.index]!);
        });

      g.append('g')
        .attr('class', 'arcs')
        .selectAll('path')
        .data(chord.groups)
        .join('path')
        .attr('d', (d) =>
          arc.cornerRadius(2)({
            startAngle: d.startAngle,
            endAngle: d.endAngle,
            innerRadius: ir,
            outerRadius: R + (d.index === focalIdx ? 6 : 0),
          }),
        )
        .attr('fill', (d) => colors[names[d.index]!]!)
        .attr('opacity', (d) => (d.index === focalIdx ? 1 : 0.88))
        .attr('stroke', (d) => (d.index === focalIdx ? V.ink : V.bg))
        .attr('stroke-width', (d) => (d.index === focalIdx ? 2 : 1))
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          const n = names[d.index]!;
          if (mode === 'drill' && n === state.focal) {
            setState((s) => ({ ...s, drilled: false }));
            return;
          }
          onSelect(n);
        });

      g.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(chord.groups)
        .join('text')
        .attr(
          'transform',
          (d) => {
            const rOff = d.index === focalIdx ? 12 : 8;
            return `rotate(${arcAngle(d) * (180 / Math.PI) - 90}) translate(${R + rOff}) ${arcAngle(d) > Math.PI ? 'rotate(180)' : ''}`;
          },
        )
        .attr('text-anchor', (d) => (arcAngle(d) > Math.PI ? 'end' : 'start'))
        .attr('dy', '.35em')
        .attr('fill', (d) => colors[names[d.index]!]!)
        .attr('font-size', (d) => (d.index === focalIdx ? 13 : 11))
        .attr('font-weight', (d) => (d.index === focalIdx ? 700 : 500))
        .style('pointer-events', 'none')
        .text((d) => shortLabel(names[d.index]!, 16));
    },
    [state.focal],
  );

  const drawHubView = useCallback(
    (
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      focal: string,
      R: number,
      ir: number,
    ) => {
      if (!aggregates) return;
      const partners = allPartners(focal, aggregates, counts, state.clsFilt, state.topN);
      if (!partners.length) {
        g.append('text').attr('text-anchor', 'middle').attr('fill', V.muted).text('No partners match the current filter.');
        return;
      }
      const partnerNames = partners.map((p) => p.name);
      const colors = buildColorMap([focal, ...partnerNames], counts);
      const groups = layoutPartnerRing(partners, 0.035);
      const maxCo = Math.max(...partners.map((p) => p.n), 1);
      const maxSamples = Math.max(...Object.values(counts), 1);
      const hubR = 22 + Math.sqrt((counts[focal] ?? 0) / maxSamples) * 38;
      const arc = d3.arc().innerRadius(ir).outerRadius(R);
      const varRibbon = d3
        .ribbon()
        .radius((d: { radius: number }) => d.radius)
        .startAngle((d: { startAngle: number }) => d.startAngle)
        .endAngle((d: { endAngle: number }) => d.endAngle);

      const hubLinks = groups.map((grp) => hubRibbonLink(hubR, ir, grp, grp.n, maxCo));
      g.append('g')
        .attr('class', 'hub-ribbons')
        .selectAll('path')
        .data(hubLinks)
        .join('path')
        .attr('d', (d) => varRibbon(d) ?? '')
        .attr('fill', (_, i) => colors[groups[i]!.name]!)
        .attr('stroke', V.bg)
        .attr('stroke-width', 0.35)
        .attr('opacity', 0.78);

      g.append('g')
        .attr('class', 'partner-arcs')
        .selectAll('path')
        .data(groups)
        .join('path')
        .attr('d', (d) =>
          arc.cornerRadius(2)({ startAngle: d.startAngle, endAngle: d.endAngle, innerRadius: ir, outerRadius: R }),
        )
        .attr('fill', (d) => colors[d.name]!)
        .attr('opacity', 0.92)
        .attr('stroke', V.bg)
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          setState((s) => ({ ...s, focal: s.focal === d.name ? null : d.name, drilled: false }));
        });

      g.append('g')
        .attr('class', 'partner-labels')
        .selectAll('text')
        .data(groups)
        .join('text')
        .attr(
          'transform',
          (d) =>
            `rotate(${arcAngle(d) * (180 / Math.PI) - 90}) translate(${R + 8}) ${arcAngle(d) > Math.PI ? 'rotate(180)' : ''}`,
        )
        .attr('text-anchor', (d) => (arcAngle(d) > Math.PI ? 'end' : 'start'))
        .attr('dy', '.35em')
        .attr('fill', (d) => colors[d.name]!)
        .attr('font-size', 11)
        .attr('font-weight', 500)
        .style('pointer-events', 'none')
        .text((d) => shortLabel(d.name, 16));

      const hubG = g.append('g').attr('class', 'hub');
      hubG
        .append('circle')
        .attr('r', hubR)
        .attr('fill', colors[focal]!)
        .attr('stroke', V.ink)
        .attr('stroke-width', 2.5)
        .style('cursor', 'pointer')
        .on('click', (event) => {
          event.stopPropagation();
          setState((s) => ({ ...s, drilled: true }));
        });
      hubG
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-.35em')
        .attr('fill', V.bg)
        .attr('font-size', Math.min(12, hubR / 2.8))
        .attr('font-weight', 700)
        .style('pointer-events', 'none')
        .text(shortLabel(focal, hubR > 40 ? 18 : 12));
      hubG
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1em')
        .attr('fill', V.bg)
        .attr('font-size', 9)
        .attr('opacity', 0.9)
        .style('pointer-events', 'none')
        .text(`${fmt.int(counts[focal] ?? 0)} samples`);
      hubG
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', hubR + 14)
        .attr('fill', V.faint)
        .attr('font-size', 9)
        .style('pointer-events', 'none')
        .text('click to drill in');
    },
    [aggregates, counts, state.clsFilt, state.topN],
  );

  const drawSankeyView = useCallback(
    (svg: SVGSVGElement, focal: string, partners: Array<{ name: string; n: number }>, colors: Record<string, string>, H: number) => {
      const sel = d3.select(svg);
      const W = svg.clientWidth;
      const titleH = 52;
      const margin = { top: titleH + 44, right: 160, bottom: 28, left: 160 };
      const innerW = W - margin.left - margin.right;
      const innerH = H - margin.top - margin.bottom;
      const minPad = Math.max(14, Math.min(22, (innerH / Math.max(partners.length, 1)) * 0.38));

      const nodes: SankeyNodeExtra[] = [
        { name: focal, side: 'L' },
        ...partners.map((p) => ({ name: p.name, side: 'R' as const })),
      ];
      const nidx = new Map(nodes.map((n, i) => [`${n.side}:${n.name}`, i]));
      const links = partners.map((p) => ({
        source: nidx.get(`L:${focal}`)!,
        target: nidx.get(`R:${p.name}`)!,
        value: p.n,
        partner: p.name,
      }));

      const sk = sankey<SankeyNodeExtra, SankeyLinkExtra>()
        .nodeWidth(20)
        .nodePadding(minPad)
        .nodeAlign(sankeyLeft)
        .extent([
          [margin.left, margin.top],
          [margin.left + innerW, margin.top + innerH],
        ]);

      const graph = sk({
        nodes: nodes.map((d) => ({ ...d })),
        links: links.map((d) => ({ ...d })),
      });

      const g = sel.append('g');
      const focalCol = colors[focal] ?? substanceColor(focal);

      g.append('text')
        .attr('x', margin.left)
        .attr('y', 28)
        .attr('fill', focalCol)
        .attr('font-size', 20)
        .attr('font-weight', 700)
        .text(focal);
      g.append('text')
        .attr('x', margin.left)
        .attr('y', 48)
        .attr('fill', V.muted)
        .attr('font-size', 12)
        .text(
          `${fmt.int(counts[focal] ?? 0)} total samples · ${partners.length} co-occurring partner${partners.length === 1 ? '' : 's'}`,
        );
      g.append('text')
        .attr('x', margin.left)
        .attr('y', margin.top - 10)
        .attr('fill', V.muted)
        .attr('font-size', 10)
        .attr('font-weight', 600)
        .attr('letter-spacing', '0.06em')
        .text('FOCAL SUBSTANCE');
      g.append('text')
        .attr('x', margin.left + innerW)
        .attr('y', margin.top - 10)
        .attr('text-anchor', 'end')
        .attr('fill', V.muted)
        .attr('font-size', 10)
        .attr('font-weight', 600)
        .attr('letter-spacing', '0.06em')
        .text('CO-OCCURRING PARTNERS');

      const linkG = g.append('g').attr('fill', 'none').attr('stroke-opacity', 0.55);
      linkG
        .selectAll<SVGPathElement, SankeyLinkExtra>('path')
        .data(graph.links as SankeyLinkExtra[])
        .join('path')
        .attr('d', (d) => sankeyLinkHorizontal()(d))
        .attr('stroke', (d) => colors[(d.target as SankeyNodeExtra).name] ?? substanceColor((d.target as SankeyNodeExtra).name))
        .attr('stroke-width', (d) => Math.max(2, d.width ?? 2))
        .on('mouseover', function () {
          d3.select(this).attr('stroke-opacity', 0.82);
        })
        .on('mouseout', function () {
          d3.select(this).attr('stroke-opacity', 0.55);
        });

      const gn = g.append('g').selectAll<SVGGElement, SankeyNodeExtra>('g').data(graph.nodes).join('g');
      gn.append('rect')
        .attr('x', (d) => d.x0 ?? 0)
        .attr('y', (d) => d.y0 ?? 0)
        .attr('width', (d) => Math.max(1, (d.x1 ?? 0) - (d.x0 ?? 0)))
        .attr('height', (d) => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
        .attr('fill', (d) => colors[d.name] ?? substanceColor(d.name))
        .attr('opacity', 0.92)
        .attr('rx', 2)
        .style('cursor', (d) => (d.side === 'R' ? 'pointer' : 'default'))
        .on('click', (event, d) => {
          event.stopPropagation();
          if (d.side === 'R') setState((s) => ({ ...s, focal: d.name }));
        });

      gn.append('text')
        .attr('x', (d) => (d.side === 'L' ? (d.x0 ?? 0) - 10 : (d.x1 ?? 0) + 10))
        .attr('y', (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
        .attr('dy', '.35em')
        .attr('text-anchor', (d) => (d.side === 'L' ? 'end' : 'start'))
        .attr('fill', (d) => colors[d.name] ?? substanceColor(d.name))
        .attr('font-size', (d) => (d.side === 'L' ? 13 : 11))
        .attr('font-weight', (d) => (d.side === 'L' ? 700 : 500))
        .text((d) => shortLabel(d.name, d.side === 'L' ? 24 : 20))
        .clone(true)
        .lower()
        .attr('stroke', V.bg)
        .attr('stroke-width', 3)
        .attr('fill', 'none');

      const lblG = g.append('g').attr('class', 'flow-labels');
      graph.links.forEach((link: SankeyLinkExtra) => {
        const src = link.source as SankeyNodeExtra;
        const tgt = link.target as SankeyNodeExtra;
        const mx = ((src.x1 ?? 0) + (tgt.x0 ?? 0)) / 2;
        const my = ((link.y0 ?? 0) + (link.y1 ?? 0)) / 2;
        const fs = (link.width ?? 0) >= 28 ? 11 : (link.width ?? 0) >= 18 ? 10 : 9;
        if ((link.width ?? 0) < 10) return;
        const tg = lblG.append('g').attr('transform', `translate(${mx},${my})`);
        const t = tg
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '.35em')
          .attr('fill', V.ink)
          .attr('font-size', fs)
          .attr('font-weight', 600);
        t.append('tspan').text(`${shortLabel(focal, 16)} → ${shortLabel(tgt.name, 16)}  `);
        t.append('tspan')
          .attr('fill', colors[tgt.name] ?? substanceColor(tgt.name))
          .text(`${fmt.int(link.value)} shared samples`);
        const bb = (t.node() as SVGTextElement).getBBox();
        tg.insert('rect', 'text')
          .attr('x', bb.x - 6)
          .attr('y', bb.y - 3)
          .attr('width', bb.width + 12)
          .attr('height', bb.height + 6)
          .attr('rx', 4)
          .attr('fill', V.bg)
          .attr('opacity', 0.88)
          .attr('stroke', V.line)
          .attr('stroke-width', 0.5);
      });
    },
    [counts],
  );

  const drawSamplePie = useCallback(
    (focal: string | null) => {
      const pieSvg = d3.select(pieRef.current);
      pieSvg.selectAll('*').remove();
      if (!focal || layout !== 'sankey') return;
      const r = 28;
      const cx = 36;
      const cy = 36;
      const focalN = counts[focal] ?? 0;
      const data = [
        { label: 'focal', value: focalN, color: buildColorMap([focal], counts)[focal] ?? substanceColor(focal) },
        { label: 'other', value: Math.max(0, TOTAL_SAMPLES - focalN), color: V.line },
      ];
      const pie = d3.pie<{ label: string; value: number; color: string }>().value((d) => d.value).sort(null);
      const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number; color: string }>>().innerRadius(14).outerRadius(r);
      const g = pieSvg.append('g').attr('transform', `translate(${cx},${cy})`);
      g.selectAll('path')
        .data(pie(data))
        .join('path')
        .attr('d', (d) => arc(d) ?? '')
        .attr('fill', (d) => d.data.color)
        .attr('stroke', V.bg)
        .attr('stroke-width', 1);
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .attr('fill', V.ink)
        .attr('font-size', 10)
        .attr('font-weight', 700)
        .text(`${Math.round((focalN / TOTAL_SAMPLES) * 100)}%`);
      pieSvg
        .append('text')
        .attr('x', cx)
        .attr('y', 68)
        .attr('text-anchor', 'middle')
        .attr('fill', V.faint)
        .attr('font-size', 8)
        .text('of samples');
      pieSvg
        .append('text')
        .attr('x', cx)
        .attr('y', 10)
        .attr('text-anchor', 'middle')
        .attr('fill', V.faint)
        .attr('font-size', 8)
        .text(`${fmt.int(focalN)}/${fmt.int(TOTAL_SAMPLES)}`);
    },
    [counts, layout],
  );

  const svgRef = useSvgContainer<SVGSVGElement>(
    (svg, W) => {
      if (!aggregates) return;
      const sel = d3.select(svg);
      sel.selectAll('*').remove();
      drawSamplePie(state.focal);

      const onSelect = (name: string) => {
        if (layout === 'sankey') {
          setState((s) => ({ ...s, focal: s.focal === name ? null : name }));
          return;
        }
        if (layout === 'nested') {
          setState((s) => ({ ...s, focal: s.focal === name ? null : name, drilled: false }));
          return;
        }
        setState((s) => ({ ...s, focal: s.focal === name ? null : name }));
      };

      if (layout === 'sankey' && state.focal) {
        const partners = allPartners(state.focal, aggregates, counts, state.clsFilt, state.topN);
        const names = [state.focal, ...partners.map((p) => p.name)];
        const colors = buildColorMap(names, counts);
        const H = sankeyHeight(partners.length);
        svgHRef.current = H;
        svg.setAttribute('height', String(H));
        if (!partners.length) {
          sel
            .append('text')
            .attr('x', W / 2)
            .attr('y', H / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', V.muted)
            .text('No partners match the current filter.');
          return;
        }
        drawSankeyView(svg, state.focal, partners, colors, H);
        return;
      }

      const H = 680;
      svgHRef.current = H;
      svg.setAttribute('height', String(H));
      const cx = W / 2;
      const cy = H / 2 + 10;
      const g = sel.append('g').attr('transform', `translate(${cx},${cy})`);
      const R = Math.min(W, H) / 2 - (layout === 'chord' ? 110 : 100);
      const ir = R - (layout === 'chord' ? 16 : 18);

      if (layout === 'nested' && state.drilled && state.focal) {
        const partners = allPartners(state.focal, aggregates, counts, state.clsFilt, state.topN);
        if (!partners.length) {
          g.append('text').attr('text-anchor', 'middle').attr('fill', V.muted).text('No partners match the current filter.');
          return;
        }
        const { names, M } = buildDrillMatrix(state.focal, partners);
        const colors = buildColorMap(names, counts);
        drawInteractiveChord(g, {
          M,
          names,
          colors,
          R,
          ir,
          padAngle: 0.04,
          focalIdx: 0,
          mode: 'drill',
          onSelect,
        });
        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -R - 24)
          .attr('fill', V.faint)
          .attr('font-size', 10)
          .text(`arc width = shared samples with ${shortLabel(state.focal, 20)}`);
        return;
      }

      if (layout === 'nested' && state.focal) {
        drawHubView(g, state.focal, R, ir);
        return;
      }

      if (layout === 'chord') {
        const idx = Object.fromEntries(topSubs.map((n, i) => [n, i]));
        const N = topSubs.length;
        const M = Array.from({ length: N }, () => Array(N).fill(0));
        co.forEach((d) => {
          if (idx[d.a] != null && idx[d.b] != null) {
            M[idx[d.a]!]![idx[d.b]!]! += d.n;
            M[idx[d.b]!]![idx[d.a]!]! += d.n;
          }
        });
        const colors = buildColorMap(topSubs, counts);
        drawChordOverview(g, { M, names: topSubs, colors, R, ir });
        return;
      }

      const names = filteredSubs(aggregates, counts, state.clsFilt, state.topN);
      if (!names.length) {
        g.append('text').attr('text-anchor', 'middle').attr('fill', V.muted).text('No substances match the current filter.');
        return;
      }
      const M = buildMatrix(names, co);
      const colors = buildColorMap(names, counts);
      const focalIdx = state.focal ? names.indexOf(state.focal) : -1;
      drawInteractiveChord(g, {
        M,
        names,
        colors,
        R,
        ir,
        padAngle: 0.035,
        focalIdx: focalIdx >= 0 ? focalIdx : null,
        mode: layout === 'sankey' ? 'sankey-pick' : 'overview',
        onSelect,
      });
    },
    [aggregates, co, counts, drawChordOverview, drawHubView, drawInteractiveChord, drawSamplePie, drawSankeyView, layout, state, topSubs],
  );

  const partners = state.focal && aggregates
    ? allPartners(state.focal, aggregates, counts, state.clsFilt, state.topN)
    : [];

  const crumb = () => {
    if (!state.focal) return null;
    if (layout === 'nested' && state.drilled) {
      return (
        <>
          <button type="button" className="viz-btn" onClick={() => setState((s) => ({ ...s, drilled: false }))}>
            ← hub
          </button>
          <button type="button" className="viz-btn" onClick={resetAll}>
            all
          </button>
          {' · '}
          <b>{state.focal}</b> partners (arc size = shared samples)
        </>
      );
    }
    if (layout === 'sankey') {
      return (
        <>
          <button type="button" className="viz-btn" onClick={resetAll}>
            ← chord
          </button>
          {' · '}
          <b>{state.focal}</b> Sankey — band width = shared samples
        </>
      );
    }
    if (layout === 'nested') {
      return (
        <>
          <button type="button" className="viz-btn" onClick={resetAll}>
            ← all
          </button>
          {' · '}
          <b>{state.focal}</b> hub — click center to drill in
        </>
      );
    }
    return null;
  };

  return (
    <VizLayout
      vizId="12-cooccurrence-chord"
      title="Adulterant Co-occurrence"
      dek={entry.dek}
      how={
        <>
          Switch layout: <b>chord</b> (classic ring), <b>nested</b> (hub drill-down), or <b>sankey</b> (partner flows).
          Each arc on the ring is a <b>substance</b>, sized by how many samples contained it. A <b>ribbon</b> between two
          arcs means they were detected <b>in the same sample</b>; thickness = how often. The tight knot of{' '}
          <span className="mono">fentanyl–4-ANPP–p-fluorofentanyl</span> reflects co-manufacture; the{' '}
          <span className="mono">fentanyl–xylazine</span> ribbon is the &quot;tranq-dope&quot; combination. Press{' '}
          <b>Esc</b> to step back.
        </>
      }
      provenance="Real co-occurrence counts among the 25 most common substances in 6,580 tested samples."
      harm="Fentanyl + xylazine + a street benzo is now a common trio. Each needs a different response — naloxone, wound care, and rescue breathing."
    >
      <div className="viz-controls">
        <span className="muted" style={{ fontSize: 11 }}>
          layout
        </span>
        {(['chord', 'nested', 'sankey'] as LayoutMode[]).map((m) => (
          <button
            key={m}
            type="button"
            className="viz-btn"
            aria-pressed={layout === m}
            onClick={() => {
              setLayout(m);
              setState((s) => ({ ...s, focal: null, drilled: false }));
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {crumb() && (
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          {crumb()}
        </p>
      )}

      {layout !== 'chord' && (
        <>
          <div className="viz-controls">
            <span className="muted" style={{ fontSize: 11 }}>
              Show top
            </span>
            <input
              type="range"
              min={8}
              max={20}
              value={state.topN}
              onChange={(e) =>
                setState((s) => ({ ...s, topN: +e.target.value, focal: null, drilled: false }))
              }
              style={{ width: 100 }}
            />
            <span className="mono">{state.topN}</span>
            <span className="muted" style={{ fontSize: 11 }}>
              substances
            </span>
            <button type="button" className="viz-btn" disabled={!state.focal} onClick={stepBack}>
              ← back
            </button>
            <button type="button" className="viz-btn" disabled={!state.focal} onClick={resetAll}>
              clear
            </button>
          </div>
          <div className="viz-controls">
            {CLASS_FILTERS.map(([c, l]) => (
              <button
                key={c}
                type="button"
                className="viz-btn"
                aria-pressed={state.clsFilt === c}
                onClick={() =>
                  setState((s) => ({ ...s, clsFilt: c, focal: null, drilled: false }))
                }
              >
                {l}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="viz-panel" style={{ position: 'relative' }}>
        {layout === 'nested' && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                zIndex: 2,
                width: 'min(300px, calc(100% - 28px))',
                background: 'var(--panel-2)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 12,
                lineHeight: 1.45,
                maxHeight: 'calc(100% - 28px)',
                overflow: 'auto',
              }}
            >
              {!state.focal ? (
                <p className="faint" style={{ fontSize: 11, margin: 0 }}>
                  Click a chord arc to focus it in the center hub.
                </p>
              ) : (
                <>
                  <h3 style={{ margin: '0 0 8px', fontSize: 14, color: substanceColor(state.focal) }}>
                    {state.focal}
                  </h3>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {fmt.int(counts[state.focal] ?? 0)} total samples · {partners.length} partner
                    {partners.length === 1 ? '' : 's'}
                  </div>
                  <ol style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
                    {partners.map((p) => (
                      <li
                        key={p.name}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          padding: '5px 0',
                          borderTop: '1px solid var(--line)',
                          fontSize: 11.5,
                        }}
                      >
                        <span className="muted">
                          {p.name} + {state.focal}
                        </span>
                        <span className="mono">{fmt.int(p.n)} shared</span>
                      </li>
                    ))}
                  </ol>
                  <button type="button" className="viz-btn" style={{ marginTop: 10 }} onClick={resetAll}>
                    clear
                  </button>
                </>
              )}
            </div>
            {state.focal && (
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  zIndex: 2,
                  background: 'var(--panel-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 11,
                  minWidth: 148,
                }}
              >
                <div className="muted" style={{ fontSize: 10 }}>
                  sample subset
                </div>
                <div className="mono" style={{ fontWeight: 700, fontSize: 18, margin: '4px 0' }}>
                  {(((counts[state.focal] ?? 0) / TOTAL_SAMPLES) * 100).toFixed(1)}%
                </div>
                <div className="muted mono" style={{ fontSize: 10 }}>
                  {fmt.int(counts[state.focal] ?? 0)} / {fmt.int(TOTAL_SAMPLES)} samples
                </div>
              </div>
            )}
          </>
        )}
        {layout === 'sankey' && (
          <svg
            ref={pieRef}
            width={72}
            height={72}
            style={{ position: 'absolute', top: 14, right: 14, zIndex: 2, pointerEvents: 'none' }}
            aria-hidden
          />
        )}
        <svg ref={svgRef} width="100%" height={svgHRef.current} role="img" aria-label="Co-occurrence diagram" />
      </div>
    </VizLayout>
  );
}
