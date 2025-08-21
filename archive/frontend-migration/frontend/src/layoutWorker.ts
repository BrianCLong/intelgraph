import cytoscape, { ElementDefinition, Position } from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

// eslint-disable-next-line no-restricted-globals
self.onmessage = (
  e: MessageEvent<{ elements: ElementDefinition[] }>
): void => {
  const { elements } = e.data;
  const cy = cytoscape({
    elements,
    style: [],
    headless: true,
  });
  const layout = cy.layout({ name: 'cose-bilkent', randomize: true });
  layout.run();
  const positions: Record<string, Position> = {};
  cy.nodes().forEach((n) => {
    positions[n.id()] = n.position();
  });
  // eslint-disable-next-line no-restricted-globals
  self.postMessage({ positions });
};
