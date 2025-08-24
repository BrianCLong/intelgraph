import { useEffect, useRef } from 'react';
import $ from 'jquery';

/**
 * FederatedSearch renders a placeholder matrix and demonstrates how jQuery
 * can be combined with React refs for high-frequency interactions.
 */
export function FederatedSearch() {
  const matrixRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = matrixRef.current ? $(matrixRef.current) : null;
    if (!el) return;
    const handler = (e: JQuery.MouseMoveEvent) => {
      el.text(`x:${e.offsetX}, y:${e.offsetY}`);
    };
    el.on('mousemove', handler);
    return () => {
      el.off('mousemove', handler);
    };
  }, []);

  return <div ref={matrixRef}>Federated search placeholder</div>;
}
