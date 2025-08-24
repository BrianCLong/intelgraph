describe('link analysis canvas', () => {
  it('brushing time updates all panes', () => {
    cy.visit('/');
    cy.get('[data-testid="start-range"]').as('start');
    cy.get('@start').invoke('val', 20).trigger('input');
    cy.get('[data-testid="map-pane"]').should('contain', '20');
    cy.get('[data-testid="graph-pane"]').should('contain', '20');
    cy.get('[data-testid="explain-panel"]').should('contain', '20');
  });

  it('command palette executes a saved query', () => {
    cy.visit('/');
    cy.get('body').type('{meta}k');
    cy.get('[data-testid="command-palette"]').contains('recent-incidents').click();
    cy.get('[data-testid="explain-panel"]').should('contain', 'recent-incidents');
  });

  it('explain panel reflects active filters', () => {
    cy.visit('/');
    cy.get('[data-testid="start-range"]').invoke('val', 30).trigger('input');
    cy.get('body').type('{meta}k');
    cy.get('[data-testid="command-palette"]').contains('top-entities').click();
    cy.get('[data-testid="explain-panel"]').should('contain', '30');
    cy.get('[data-testid="explain-panel"]').should('contain', 'top-entities');
  });

  it('pinning a node updates explain panel', () => {
    cy.visit('/');
    cy.get('[data-testid="graph-pane"] .react-flow__node').click();
    cy.get('[data-testid="explain-panel"]').should('contain', 'Pinned: 1');
  });

  it('clear pinned resets count', () => {
    cy.visit('/');
    cy.get('[data-testid="graph-pane"] .react-flow__node').click();
    cy.contains('Clear pinned').click();
    cy.get('[data-testid="explain-panel"]').should('contain', 'Pinned: 0');
  });
});
