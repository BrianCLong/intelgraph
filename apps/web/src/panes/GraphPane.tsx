import React, { useEffect, useRef } from 'react';
import cytoscape, { Core } from 'cytoscape';
import $ from 'jquery';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectTimeRange,
  selectGeoBounds,
  setSelectedNodeIds,
} from '../features/viewSync/viewSyncSlice';
import { attachGraphBridge } from '../sync/graph-bridge';

export default function GraphPane() {
  const el = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const tr = useAppSelector(selectTimeRange);
  const bbox = useAppSelector(selectGeoBounds);

  useEffect(() => {
    if (!el.current) return;
    const cy: Core = cytoscape({
      container: el.current,
      elements: [],
      style: [{ selector: 'node', style: { label: 'data(label)' } }],
    });
    const $c = $(cy.container());
    attachGraphBridge(cy);

    // inbound sync: respond to time/bbox changes (simple highlight/filter demo)
    $c.on('intelgraph:sync:apply_filters', (_e, payload) => {
      // TODO: re-query & update cy elements using payload.query
      cy.batch(() => {
        /* apply dim/highlight classes */
      });
    });

    // outbound: node selection
    cy.on('select unselect', 'node', () => {
      const ids = cy.$('node:selected').map((n) => n.id());
      dispatch(setSelectedNodeIds(ids));
      $c.trigger('intelgraph:graph:selection_changed', [{ nodeIds: ids }]);
    });

    return () => {
      $c.off();
      cy.destroy();
    };
  }, []);

  // when redux filters change, push into cy via jQuery event
  useEffect(() => {
    const payload = { query: { timeRange: tr, bbox } };
    const $c = $(el.current!);
    $c.trigger('intelgraph:sync:apply_filters', [payload]);
  }, [tr, bbox]);

  return <div id="graph" ref={el} style={{ width: '100%', height: '100%' }} />;
}
