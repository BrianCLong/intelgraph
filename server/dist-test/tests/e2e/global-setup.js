"use strict";
/**
 * Playwright Global Setup
 * Runs before all E2E tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
async function globalSetup(config) {
    console.log('🚀 Starting Playwright Global Setup...');
    try {
        // Set up environment variables for E2E tests
        process.env.NODE_ENV = 'test';
        process.env.E2E_TEST = 'true';
        // Wait for services to be ready
        await waitForServices();
        // Set up authentication if needed
        await setupAuth();
        console.log('✅ Playwright Global Setup completed successfully');
    }
    catch (error) {
        console.error('❌ Playwright Global Setup failed:', error);
        throw error;
    }
}
async function waitForServices() {
    const maxWait = 60000; // 60 seconds
    const interval = 2000; // 2 seconds
    let waited = 0;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    while (waited < maxWait) {
        try {
            console.log(`⏳ Waiting for services... (${waited}ms/${maxWait}ms)`);
            // Check if client is ready
            const clientResponse = await fetch(baseUrl);
            if (!clientResponse.ok)
                throw new Error(`Client not ready: ${clientResponse.status}`);
            // Check if server is ready
            const serverResponse = await fetch(`${apiUrl}/health`);
            if (!serverResponse.ok)
                throw new Error(`Server not ready: ${serverResponse.status}`);
            console.log('✅ All services are ready for E2E tests');
            return;
        }
        catch (error) {
            waited += interval;
            if (waited < maxWait) {
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }
    }
    throw new Error('Services did not become ready in time for E2E tests');
}
async function setupAuth() {
    // Set up authentication state for tests if needed
    // This might include creating test users, setting up JWT tokens, etc.
    console.log('🔐 Setting up authentication for E2E tests...');
    // Example: Create test users in the database
    // const testUsers = [
    //   { email: 'admin@test.com', role: 'admin' },
    //   { email: 'analyst@test.com', role: 'analyst' },
    //   { email: 'viewer@test.com', role: 'viewer' }
    // ];
    // for (const user of testUsers) {
    //   await createTestUser(user);
    // }
}
exports.default = globalSetup;
//# sourceMappingURL=global-setup.js.map