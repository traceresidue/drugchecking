import { useEffect, useRef } from 'react';

export function useResizeRedraw(draw: () => void, deps: unknown[] = []): React.RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

export function useSvgContainer<T extends SVGSVGElement | null>(
  draw: (svg: T, width: number) => void,
  deps: unknown[] = [],
): React.RefObject<SVGSVGElement> {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.clientWidth || el.parentElement?.clientWidth || 800;
    draw(el as T, w);
    const onResize = () => {
      const width = el.clientWidth || el.parentElement?.clientWidth || 800;
      draw(el as T, width);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
