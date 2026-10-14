export function svgClientWidth(node: unknown, fallback = 800): number {
  if (node && typeof node === 'object' && 'clientWidth' in node) {
    const w = (node as { clientWidth?: number }).clientWidth;
    return w && w > 0 ? w : fallback;
  }
  return fallback;
}

export function svgClientHeight(node: unknown, fallback = 400): number {
  if (node && typeof node === 'object' && 'clientHeight' in node) {
    const h = (node as { clientHeight?: number }).clientHeight;
    return h && h > 0 ? h : fallback;
  }
  return fallback;
}
