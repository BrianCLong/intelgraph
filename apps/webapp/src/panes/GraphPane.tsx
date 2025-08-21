import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import $ from 'jquery';
import { useDispatch } from 'react-redux';
import { fetchGraph } from '../data/mockGraph';
import { selectNode } from '../store';

export function GraphPane() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    fetchGraph().then((data) => {
      const cy = cytoscape({
        container: containerRef.current!,
        elements: [
          ...data.nodes.map((n) => ({ data: { id: n.id, label: n.label } })),
          ...data.edges.map((e) => ({
            data: { id: e.id, source: e.source, target: e.target },
          })),
        ],
        style: [{ selector: 'node', style: { label: 'data(label)' } }],
        layout: { name: 'grid' },
      });

      cy.on('select', (evt) => dispatch(selectNode(evt.target.id())));
      cy.on('unselect', () => dispatch(selectNode(null)));

      // jQuery drag stub
      $(cy.container() as HTMLElement).on('mousedown', () => {
        $(document).on('mouseup.graphDrag', () => {
          $(document).off('.graphDrag');
        });
      });

      // jQuery context menu stub
      $(cy.container() as HTMLElement).on('contextmenu', (e: JQuery.Event) => {
        e.preventDefault();
      });
    });
  }, [dispatch]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
