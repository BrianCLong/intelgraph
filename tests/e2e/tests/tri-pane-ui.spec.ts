import { test, expect } from '@playwright/test';

test.describe('IntelGraph Tri-Pane UI', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to main interface
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should display all three panes correctly', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    // Verify timeline pane
    await expect(page.locator('[data-testid="timeline-pane"]')).toBeVisible();
    await expect(page.locator('[data-testid="timeline-events"]')).toBeVisible();
    
    // Verify map pane
    await expect(page.locator('[data-testid="map-pane"]')).toBeVisible();
    await expect(page.locator('[data-testid="leaflet-map"]')).toBeVisible();
    
    // Verify graph pane
    await expect(page.locator('[data-testid="graph-pane"]')).toBeVisible();
    await expect(page.locator('[data-testid="cytoscape-graph"]')).toBeVisible();
  });

  test('should synchronize selection across panes', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    // Click on entity in timeline
    await page.click('[data-testid="timeline-entity-1"]');
    
    // Verify selection in map
    await expect(page.locator('[data-testid="map-entity-1"].selected')).toBeVisible();
    
    // Verify selection in graph
    await expect(page.locator('[data-testid="graph-entity-1"].selected')).toBeVisible();
    
    // Verify entity details panel
    await expect(page.locator('[data-testid="entity-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="entity-name"]')).toContainText('Entity 1');
  });

  test('should filter timeline events', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    // Open filter panel
    await page.click('[data-testid="timeline-filter-button"]');
    
    // Apply date filter
    await page.fill('[data-testid="date-from"]', '2024-01-01');
    await page.fill('[data-testid="date-to"]', '2024-12-31');
    await page.click('[data-testid="apply-filters"]');
    
    // Verify filtered results
    await expect(page.locator('[data-testid="timeline-events"] .timeline-event')).toHaveCount(5);
    
    // Apply entity type filter
    await page.selectOption('[data-testid="entity-type-filter"]', 'PERSON');
    await page.click('[data-testid="apply-filters"]');
    
    // Verify further filtered results
    await expect(page.locator('[data-testid="timeline-events"] .timeline-event')).toHaveCount(3);
  });

  test('should zoom and pan map correctly', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    // Test zoom in
    await page.click('[data-testid="map-zoom-in"]');
    const zoomLevel1 = await page.locator('[data-testid="map-zoom-level"]').textContent();
    
    await page.click('[data-testid="map-zoom-in"]');
    const zoomLevel2 = await page.locator('[data-testid="map-zoom-level"]').textContent();
    
    expect(parseInt(zoomLevel2!)).toBeGreaterThan(parseInt(zoomLevel1!));
    
    // Test reset view
    await page.click('[data-testid="map-reset-view"]');
    await expect(page.locator('[data-testid="map-zoom-level"]')).toContainText('10');
  });

  test('should expand and contract graph layout', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    // Test layout algorithms
    await page.click('[data-testid="graph-layout-button"]');
    await page.click('[data-testid="layout-force-directed"]');
    
    // Wait for layout animation
    await page.waitForTimeout(2000);
    
    // Verify layout applied
    const nodePosition1 = await page.locator('[data-testid="graph-node-1"]').boundingBox();
    
    // Change to hierarchical layout
    await page.click('[data-testid="graph-layout-button"]');
    await page.click('[data-testid="layout-hierarchical"]');
    await page.waitForTimeout(2000);
    
    const nodePosition2 = await page.locator('[data-testid="graph-node-1"]').boundingBox();
    
    // Positions should be different
    expect(nodePosition1?.x).not.toBe(nodePosition2?.x);
  });

  test('should create and edit case annotations', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    // Add timeline annotation
    await page.click('[data-testid="timeline-event-1"]', { button: 'right' });
    await page.click('[data-testid="context-add-annotation"]');
    
    await page.fill('[data-testid="annotation-text"]', 'Important timeline event');
    await page.click('[data-testid="save-annotation"]');
    
    // Verify annotation appears
    await expect(page.locator('[data-testid="timeline-annotation-1"]')).toBeVisible();
    
    // Add map annotation
    await page.click('[data-testid="map-location-1"]', { button: 'right' });
    await page.click('[data-testid="context-add-annotation"]');
    
    await page.fill('[data-testid="annotation-text"]', 'Key location in investigation');
    await page.click('[data-testid="save-annotation"]');
    
    // Verify map annotation
    await expect(page.locator('[data-testid="map-annotation-1"]')).toBeVisible();
  });

  test('should export investigation data', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    // Open export dialog
    await page.click('[data-testid="export-button"]');
    
    // Configure export options
    await page.check('[data-testid="export-timeline"]');
    await page.check('[data-testid="export-entities"]');
    await page.check('[data-testid="export-relationships"]');
    await page.selectOption('[data-testid="export-format"]', 'JSON');
    
    // Start export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="start-export"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/investigation-.*\.json/);
  });

  test('should handle real-time updates', async ({ page, context }) => {
    await page.goto('/case/test-case-1');
    
    // Open second tab to simulate another user
    const page2 = await context.newPage();
    await page2.goto('/login');
    await page2.fill('[data-testid="email"]', 'user2@example.com');
    await page2.fill('[data-testid="password"]', 'testpassword');
    await page2.click('[data-testid="login-button"]');
    await page2.goto('/case/test-case-1');
    
    // Add comment from second user
    await page2.fill('[data-testid="comment-input"]', 'New insight from user 2');
    await page2.click('[data-testid="send-comment"]');
    
    // Verify real-time update appears in first tab
    await expect(page.locator('[data-testid="comment-thread"]')).toContainText('New insight from user 2');
    
    // Verify notification indicator
    await expect(page.locator('[data-testid="new-activity-indicator"]')).toBeVisible();
  });

  test('should search across all data types', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    // Open global search
    await page.click('[data-testid="global-search"]');
    await page.fill('[data-testid="search-input"]', 'john doe');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Verify search results in different categories
    await expect(page.locator('[data-testid="search-results-entities"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-results-events"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-results-documents"]')).toBeVisible();
    
    // Click on entity result
    await page.click('[data-testid="search-result-entity-1"]');
    
    // Verify entity is highlighted in all panes
    await expect(page.locator('[data-testid="timeline-entity-1"].highlighted')).toBeVisible();
    await expect(page.locator('[data-testid="map-entity-1"].highlighted')).toBeVisible();
    await expect(page.locator('[data-testid="graph-entity-1"].highlighted')).toBeVisible();
  });

  test('should handle responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/case/test-case-1');
    
    // On mobile, panes should be in tab view
    await expect(page.locator('[data-testid="mobile-tab-timeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-tab-map"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-tab-graph"]')).toBeVisible();
    
    // Switch between tabs
    await page.click('[data-testid="mobile-tab-map"]');
    await expect(page.locator('[data-testid="map-pane"]')).toBeVisible();
    await expect(page.locator('[data-testid="timeline-pane"]')).not.toBeVisible();
    
    await page.click('[data-testid="mobile-tab-graph"]');
    await expect(page.locator('[data-testid="graph-pane"]')).toBeVisible();
    await expect(page.locator('[data-testid="map-pane"]')).not.toBeVisible();
  });

  test('should maintain state across page reloads', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    // Select entity and apply filters
    await page.click('[data-testid="timeline-entity-1"]');
    await page.click('[data-testid="timeline-filter-button"]');
    await page.selectOption('[data-testid="entity-type-filter"]', 'PERSON');
    await page.click('[data-testid="apply-filters"]');
    
    // Reload page
    await page.reload();
    
    // Verify state is restored
    await expect(page.locator('[data-testid="timeline-entity-1"].selected')).toBeVisible();
    await expect(page.locator('[data-testid="entity-type-filter"]')).toHaveValue('PERSON');
    await expect(page.locator('[data-testid="timeline-events"] .timeline-event')).toHaveCount(3);
  });
});