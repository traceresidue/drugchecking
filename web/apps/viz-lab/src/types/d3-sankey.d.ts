declare module 'd3-sankey' {
  import type { SimulationNodeDatum } from 'd3';

  export interface SankeyNodeMinimal extends SimulationNodeDatum {
    name?: string;
    x0?: number;
    x1?: number;
    y0?: number;
    y1?: number;
    value?: number;
    index?: number;
    depth?: number;
    height?: number;
    layer?: number;
    sourceLinks?: SankeyLinkMinimal[];
    targetLinks?: SankeyLinkMinimal[];
  }

  export interface SankeyLinkMinimal {
    source: SankeyNodeMinimal | number;
    target: SankeyNodeMinimal | number;
    value: number;
    width?: number;
    y0?: number;
    y1?: number;
    index?: number;
  }

  export interface SankeyGraph<N extends SankeyNodeMinimal, L extends SankeyLinkMinimal> {
    nodes: N[];
    links: L[];
  }

  export interface SankeyLayout<N extends SankeyNodeMinimal, L extends SankeyLinkMinimal> {
    (graph: SankeyGraph<N, L>): SankeyGraph<N, L>;
    nodeId(accessor: (d: N) => string | number): SankeyLayout<N, L>;
    nodeAlign(align: (graph: SankeyGraph<N, L>, columns: number) => number): SankeyLayout<N, L>;
    nodeWidth(width: number): SankeyLayout<N, L>;
    nodePadding(padding: number): SankeyLayout<N, L>;
    extent(extent: [[number, number], [number, number]]): SankeyLayout<N, L>;
    nodeSort(comparator: ((a: N, b: N) => number) | null): SankeyLayout<N, L>;
  }

  export function sankey<N extends SankeyNodeMinimal, L extends SankeyLinkMinimal>(): SankeyLayout<N, L>;
  export function sankeyLinkHorizontal(): (d: SankeyLinkMinimal) => string;
  export function sankeyLeft<N extends SankeyNodeMinimal>(graph: SankeyGraph<N, SankeyLinkMinimal>, columns: number): number;
}
