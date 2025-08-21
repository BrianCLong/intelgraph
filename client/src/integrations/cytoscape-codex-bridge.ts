import $ from 'jquery';
import type { Core } from 'cytoscape';

export function attachCodexBridge(cy: Core, onAdd: (payload: any) => void) {
  const $container = $(cy.container());
  cy.on('select', 'node', (evt) => {
    const node = evt.target.data();
    $container.trigger('intelgraph:node_selected', [node]);
  });
  $container.on('intelgraph:add_to_codex', (_e, node) => {
    onAdd({
      type: 'entity',
      entityId: node.id,
      title: node.label,
      provenance: {
        sourceId: node.sourceId,
        link: `/entity/${node.id}`,
        capturedAt: new Date().toISOString(),
      },
    });
  });
}
