"use strict";
/**
 * Authentication Setup for E2E Tests
 * Creates authenticated user sessions for testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const adminFile = 'tests/e2e/.auth/admin.json';
const analystFile = 'tests/e2e/.auth/analyst.json';
const viewerFile = 'tests/e2e/.auth/viewer.json';
(0, test_1.test)('authenticate as admin', async ({ page }) => {
    await page.goto('/login');
    // Perform authentication steps
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    // Wait for successful login
    await (0, test_1.expect)(page).toHaveURL('/dashboard');
    // Save authentication state
    await page.context().storageState({ path: adminFile });
});
(0, test_1.test)('authenticate as analyst', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'analyst@test.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    await (0, test_1.expect)(page).toHaveURL('/dashboard');
    await page.context().storageState({ path: analystFile });
});
(0, test_1.test)('authenticate as viewer', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'viewer@test.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    await (0, test_1.expect)(page).toHaveURL('/dashboard');
    await page.context().storageState({ path: viewerFile });
});
//# sourceMappingURL=auth.setup.js.map