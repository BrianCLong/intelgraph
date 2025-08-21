import { Core } from 'cytoscape';
import $ from 'jquery';
export function attachGraphBridge(cy: Core) {
  const $c = $(cy.container());
  // Example: box select (lasso) → used by Focus Mode/Explain
  cy.on('boxstart', () => $c.trigger('intelgraph:graph:box_start'));
  cy.on('boxend', () => $c.trigger('intelgraph:graph:box_end'));
}
