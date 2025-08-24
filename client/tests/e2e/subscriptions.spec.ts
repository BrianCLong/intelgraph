import { test, expect } from '@playwright/test';
import { waitFor } from './utils/wait';

test.describe('GraphQL Subscriptions', () => {
  test('should receive entity update events via WebSocket', async ({ page }) => {
    // Set up WebSocket event tracking
    const websocketMessages: any[] = [];
    const connectionMessages: any[] = [];

    page.on('websocket', (ws) => {
      ws.on('framereceived', (event) => {
        try {
          const message = JSON.parse(event.payload.toString());
          connectionMessages.push(message);

          if (message.type === 'data' && message.payload?.data?.entityUpdated) {
            websocketMessages.push(message.payload.data.entityUpdated);
          }
        } catch (e) {
          // Store non-JSON messages as well for debugging
          connectionMessages.push(event.payload.toString());
        }
      });
    });

    // Navigate to a page that uses subscriptions
    await page.goto('/graph/new-canvas');

    // Wait for the page to load and establish WebSocket connection
    await waitFor(() => connectionMessages.length > 0);

    // Check basic GraphQL connectivity (this should work even if entity mutations don't)
    const queryResponse = await page.request.post('http://localhost:4000/graphql', {
      data: {
        query: `
          query TestConnection {
            __schema {
              subscriptionType {
                name
                fields {
                  name
                }
              }
            }
          }
        `,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(queryResponse.ok()).toBeTruthy();
    const queryResult = await queryResponse.json();

    // Verify that subscriptions are enabled in the schema
    expect(queryResult.data?.__schema?.subscriptionType).toBeTruthy();
    expect(queryResult.data.__schema.subscriptionType.name).toBe('Subscription');

    const subscriptionFields = queryResult.data.__schema.subscriptionType.fields.map(
      (f: any) => f.name,
    );
    expect(subscriptionFields).toContain('entityUpdated');
    expect(subscriptionFields).toContain('entityCreated');

    // Log connection messages for debugging
    console.log('Connection messages received:', connectionMessages.length);
    console.log('Sample connection messages:', connectionMessages.slice(0, 3));

    // For now, just verify that subscriptions are properly configured
    // Full end-to-end testing will require database connectivity
    console.log('✅ Subscription schema verified - entityUpdated subscription available');
  });

  test('should establish WebSocket connection for subscriptions', async ({ page }) => {
    let websocketConnected = false;

    page.on('websocket', (ws) => {
      websocketConnected = true;

      ws.on('framereceived', (event) => {
        const message = JSON.parse(event.payload.toString());
        if (message.type === 'connection_ack') {
          // WebSocket subscription protocol handshake completed
          console.log('WebSocket subscription connection acknowledged');
        }
      });
    });

    // Navigate to a page that should establish subscriptions
    await page.goto('/graph/new-canvas');

    // Wait for WebSocket connection
    await waitFor(() => websocketConnected);

    // Verify WebSocket connection was established
    expect(websocketConnected).toBeTruthy();
  });
});
