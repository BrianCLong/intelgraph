import { useEffect, useRef } from 'react';
import $ from 'jquery';
import 'jquery-ui/ui/widgets/draggable';
import 'jquery-ui/ui/widgets/resizable';

interface GraphAnnotationProps {
  id: string;
  text: string;
  onChange?: (position: { top: number; left: number }, size: { width: number; height: number }) => void;
}

export default function GraphAnnotations({ id, text, onChange }: GraphAnnotationProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = $(ref.current);
    el.draggable({
      stop: (_e, ui) => {
        const size = el.resizable('instance')?.size || { width: ui.helper.width(), height: ui.helper.height() };
        onChange?.(ui.position, size);
      },
    }).resizable({
      stop: (_e, ui) => {
        onChange?.(ui.position, ui.size);
      },
    });
  }, [onChange]);

  return (
    <div id={id} ref={ref} className="annotation">
      {text}
    </div>
  );
}
