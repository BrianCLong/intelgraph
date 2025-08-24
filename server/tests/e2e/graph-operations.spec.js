"use strict";
/**
 * E2E Tests for Graph Operations
 * Tests the core graph functionality from a user perspective
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Graph Operations', () => {
    test_1.test.beforeEach(async ({ page }) => {
        // Navigate to the graph view
        await page.goto('/graph');
        // Wait for the graph to load
        await page.waitForSelector('[data-testid="graph-container"]');
    });
    (0, test_1.test)('should load empty graph initially', async ({ page }) => {
        // Check that graph container is visible
        await (0, test_1.expect)(page.locator('[data-testid="graph-container"]')).toBeVisible();
        // Check that no entities are displayed initially
        const entityCount = await page.locator('[data-testid="graph-node"]').count();
        (0, test_1.expect)(entityCount).toBe(0);
    });
    (0, test_1.test)('should create a new entity', async ({ page }) => {
        // Click the add entity button
        await page.click('[data-testid="add-entity-button"]');
        // Fill out the entity form
        await page.fill('[data-testid="entity-type-input"]', 'Person');
        await page.fill('[data-testid="entity-label-input"]', 'John Doe');
        await page.fill('[data-testid="entity-description-input"]', 'Test person entity');
        // Submit the form
        await page.click('[data-testid="save-entity-button"]');
        // Wait for the entity to appear in the graph
        await page.waitForSelector('[data-testid="graph-node"]');
        // Verify the entity was created
        const entityCount = await page.locator('[data-testid="graph-node"]').count();
        (0, test_1.expect)(entityCount).toBe(1);
        // Check that the entity has the correct label
        await (0, test_1.expect)(page.locator('[data-testid="graph-node"]').first()).toContainText('John Doe');
    });
    (0, test_1.test)('should create a relationship between entities', async ({ page }) => {
        // First create two entities
        await createTestEntity(page, 'Person', 'Alice', 'First person');
        await createTestEntity(page, 'Person', 'Bob', 'Second person');
        // Select the first entity
        await page.click('[data-testid="graph-node"]:has-text("Alice")');
        // Click create relationship button
        await page.click('[data-testid="create-relationship-button"]');
        // Select the target entity
        await page.click('[data-testid="graph-node"]:has-text("Bob")');
        // Fill out relationship form
        await page.fill('[data-testid="relationship-type-input"]', 'KNOWS');
        await page.fill('[data-testid="relationship-description-input"]', 'Alice knows Bob');
        // Submit the relationship
        await page.click('[data-testid="save-relationship-button"]');
        // Wait for the relationship to appear
        await page.waitForSelector('[data-testid="graph-edge"]');
        // Verify the relationship was created
        const relationshipCount = await page.locator('[data-testid="graph-edge"]').count();
        (0, test_1.expect)(relationshipCount).toBe(1);
    });
    (0, test_1.test)('should search entities', async ({ page }) => {
        // Create some test entities
        await createTestEntity(page, 'Person', 'Alice Johnson', 'Software Engineer');
        await createTestEntity(page, 'Person', 'Bob Smith', 'Data Scientist');
        await createTestEntity(page, 'Organization', 'TechCorp', 'Technology Company');
        // Use the search functionality
        await page.fill('[data-testid="search-input"]', 'Alice');
        await page.press('[data-testid="search-input"]', 'Enter');
        // Wait for search results
        await page.waitForSelector('[data-testid="search-results"]');
        // Verify search results
        const searchResults = page.locator('[data-testid="search-result-item"]');
        await (0, test_1.expect)(searchResults).toHaveCount(1);
        await (0, test_1.expect)(searchResults.first()).toContainText('Alice Johnson');
    });
    (0, test_1.test)('should filter entities by type', async ({ page }) => {
        // Create entities of different types
        await createTestEntity(page, 'Person', 'John Doe', 'Person entity');
        await createTestEntity(page, 'Organization', 'ACME Corp', 'Organization entity');
        await createTestEntity(page, 'Location', 'New York', 'Location entity');
        // Apply filter for Person entities only
        await page.click('[data-testid="filter-dropdown"]');
        await page.click('[data-testid="filter-person"]');
        // Wait for filter to apply
        await page.waitForTimeout(1000);
        // Verify only Person entities are visible
        const visibleNodes = page.locator('[data-testid="graph-node"]:visible');
        await (0, test_1.expect)(visibleNodes).toHaveCount(1);
        await (0, test_1.expect)(visibleNodes.first()).toContainText('John Doe');
    });
    (0, test_1.test)('should export graph data', async ({ page }) => {
        // Create some test data
        await createTestEntity(page, 'Person', 'Export Test', 'Test entity for export');
        // Click export button
        await page.click('[data-testid="export-button"]');
        // Select JSON format
        await page.click('[data-testid="export-format-json"]');
        // Start download
        const downloadPromise = page.waitForEvent('download');
        await page.click('[data-testid="confirm-export-button"]');
        // Verify download starts
        const download = await downloadPromise;
        (0, test_1.expect)(download.suggestedFilename()).toMatch(/.*\.json$/);
    });
    // Test for real-time collaboration (if implemented)
    (0, test_1.test)('should show presence of other users', async ({ page, context }) => {
        // This test would require a second browser context to simulate another user
        const secondPage = await context.newPage();
        await secondPage.goto('/graph');
        // Wait for both pages to load
        await Promise.all([
            page.waitForSelector('[data-testid="graph-container"]'),
            secondPage.waitForSelector('[data-testid="graph-container"]')
        ]);
        // Check if presence indicators are visible
        // This depends on the actual implementation of the collaboration features
        await (0, test_1.expect)(page.locator('[data-testid="user-presence"]')).toBeVisible();
    });
});
/**
 * Helper function to create a test entity
 */
async function createTestEntity(page, type, label, description) {
    await page.click('[data-testid="add-entity-button"]');
    await page.fill('[data-testid="entity-type-input"]', type);
    await page.fill('[data-testid="entity-label-input"]', label);
    await page.fill('[data-testid="entity-description-input"]', description);
    await page.click('[data-testid="save-entity-button"]');
    await page.waitForSelector(`[data-testid="graph-node"]:has-text("${label}")`);
}
//# sourceMappingURL=graph-operations.spec.js.map