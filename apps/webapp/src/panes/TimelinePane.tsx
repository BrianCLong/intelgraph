import { useEffect, useRef } from 'react';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import $ from 'jquery';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGraph } from '../data/mockGraph';
import { RootState, selectNode, setTimeRange } from '../store';

export function TimelinePane() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const dispatch = useDispatch();
  const selectedNode = useSelector(
    (s: RootState) => s.selection.selectedNodeId,
  );

  useEffect(() => {
    fetchGraph().then((data) => {
      const items = new DataSet(
        data.nodes.map((n) => ({
          id: n.id,
          content: n.label,
          start: n.timestamp,
        })),
      );
      const timeline = new Timeline(containerRef.current!, items, {});
      timelineRef.current = timeline;

      timeline.on('select', (props) => {
        const id = props.items[0];
        dispatch(selectNode(id ?? null));
      });

      // jQuery time-brushing stub
      $((timeline as any).dom.center).on('mouseup', () => {
        const range = timeline.getWindow();
        dispatch(setTimeRange([range.start.valueOf(), range.end.valueOf()]));
      });
    });
  }, [dispatch]);

  useEffect(() => {
    if (timelineRef.current) {
      (timelineRef.current as any).setSelection(
        selectedNode ? [selectedNode] : [],
        {
          focus: true,
          animation: false,
        },
      );
    }
  }, [selectedNode]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
