import React, { useEffect, useRef } from 'react';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import $ from 'jquery';
import { useAppDispatch } from '../store/hooks';
import { setTimeRange } from '../features/viewSync/viewSyncSlice';

export default function TimelinePane() {
  const dispatch = useAppDispatch();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const items = new DataSet([
      { id: 1, content: 'Sample', start: new Date(Date.now() - 86400000), end: new Date() },
    ]);
    const tl = new Timeline(ref.current, items, { stack: false, zoomKey: 'ctrlKey' });
    const $t = $(ref.current);

    const fireRange = () => {
      const r = tl.getWindow();
      const payload = {
        start: new Date(r.start).toISOString(),
        end: new Date(r.end).toISOString(),
      };
      dispatch(setTimeRange(payload));
      $t.trigger('intelgraph:timeline:range_changed', [payload]);
    };
    tl.on('rangechanged', fireRange);
    fireRange();

    return () => {
      tl.destroy();
      $t.off();
    };
  }, []);

  return <div id="timeline" ref={ref} style={{ width: '100%', height: '100%' }} />;
}
