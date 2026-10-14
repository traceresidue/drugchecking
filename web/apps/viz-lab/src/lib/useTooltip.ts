import { useEffect, useRef } from 'react';
import { tooltip } from '@dcf/core';

export function useTooltip() {
  const ref = useRef<ReturnType<typeof tooltip> | null>(null);

  useEffect(() => {
    ref.current = tooltip();
  }, []);

  return ref;
}
