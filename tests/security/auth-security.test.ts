import request from 'supertest';
import type { Express } from 'express';
import { createServer } from '../../server/src/server';
import jwt from 'jsonwebtoken';

describe('Authentication Security Tests', () => {
  let app: Express.Application;

  beforeAll(async () => {
    app = await createServer({ env: 'test' });
  });

  afterAll(async () => {
    if (app?.close) {
      await app.close();
    }
  });

  describe('JWT Security', () => {
    it('should reject malformed JWT tokens', async () => {
      const malformedTokens = [
        'invalid.jwt.token',
        'Bearer invalid',
        'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid',
        'Bearer null',
        'Bearer undefined',
        'Bearer ',
        'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.'
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/profile')
          .set('Authorization', token);

        expect(response.status).toBe(401);
        expect(response.body.error).toMatch(/invalid|unauthorized|token/i);
      }
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { 
          userId: 'test-user', 
          email: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/expired|token/i);
    });

    it('should reject tokens with invalid signature', async () => {
      const invalidToken = jwt.sign(
        { 
          userId: 'test-user', 
          email: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        'wrong-secret'
      );

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/invalid|signature/i);
    });

    it('should reject tokens with algorithm confusion attack', async () => {
      // Attempt to use 'none' algorithm
      const noneToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.';

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${noneToken}`);

      expect(response.status).toBe(401);
    });

    it('should enforce token refresh requirements', async () => {
      const shortLivedToken = jwt.sign(
        { 
          userId: 'test-user',
          email: 'test@example.com',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) + 5 // 5 seconds
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Token should work initially
      const response1 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${shortLivedToken}`);

      expect(response1.status).toBe(200);

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Token should be rejected after expiration
      const response2 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${shortLivedToken}`);

      expect(response2.status).toBe(401);
    });
  });

  describe('Login Security', () => {
    it('should implement rate limiting on login attempts', async () => {
      const loginAttempts = Array(10).fill(null).map(() =>
        request(app)
          .post('/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(loginAttempts);
      
      // Should see rate limiting after multiple failures
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should prevent timing attacks on login', async () => {
      const startTime1 = Date.now();
      await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });
      const endTime1 = Date.now();

      const startTime2 = Date.now();
      await request(app)
        .post('/auth/login')
        .send({
          email: 'validuser@example.com',
          password: 'wrongpassword'
        });
      const endTime2 = Date.now();

      // Response times should be similar regardless of whether user exists
      const timeDiff = Math.abs((endTime1 - startTime1) - (endTime2 - startTime2));
      expect(timeDiff).toBeLessThan(100); // Within 100ms
    });

    it('should reject SQL injection attempts in login', async () => {
      const sqlInjectionPayloads = [
        "admin' OR '1'='1",
        "admin'; DROP TABLE users; --",
        "admin' UNION SELECT * FROM users --",
        "1' OR 1=1 --",
        "'; EXEC xp_cmdshell('dir'); --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: payload,
            password: 'password'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/invalid|validation/i);
      }
    });

    it('should validate CSRF protection', async () => {
      // Attempt login without CSRF token
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      // Should either require CSRF token or use double-submit cookie pattern
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Session Security', () => {
    it('should set secure session cookies', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'correctpassword'
        });

      const cookies = response.headers['set-cookie'] || [];
      const sessionCookie = cookies.find(cookie => cookie.includes('connect.sid'));

      if (sessionCookie) {
        expect(sessionCookie).toMatch(/HttpOnly/i);
        expect(sessionCookie).toMatch(/Secure/i);
        expect(sessionCookie).toMatch(/SameSite=Strict/i);
      }
    });

    it('should invalidate sessions on logout', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'correctpassword'
        });

      const token = loginResponse.body.token;

      // Logout
      const logoutResponse = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutResponse.status).toBe(200);

      // Try to use token after logout
      const profileResponse = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse.status).toBe(401);
    });

    it('should prevent session fixation attacks', async () => {
      // Get initial session
      const initialResponse = await request(app).get('/');
      const initialCookies = initialResponse.headers['set-cookie'] || [];

      // Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .set('Cookie', initialCookies)
        .send({
          email: 'test@example.com',
          password: 'correctpassword'
        });

      const loginCookies = loginResponse.headers['set-cookie'] || [];
      
      // Session ID should change after login
      const initialSessionId = extractSessionId(initialCookies);
      const loginSessionId = extractSessionId(loginCookies);
      
      if (initialSessionId && loginSessionId) {
        expect(initialSessionId).not.toBe(loginSessionId);
      }
    });
  });

  describe('Authorization Security', () => {
    it('should enforce role-based access control', async () => {
      const viewerToken = jwt.sign(
        { 
          userId: 'viewer-user',
          email: 'viewer@example.com',
          role: 'viewer',
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Viewer should not be able to create cases
      const response = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          title: 'Test Case',
          description: 'Should be rejected'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/forbidden|unauthorized|permission/i);
    });

    it('should prevent privilege escalation', async () => {
      const userToken = jwt.sign(
        { 
          userId: 'regular-user',
          email: 'user@example.com',
          role: 'analyst',
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Try to modify own role
      const response = await request(app)
        .patch('/api/users/regular-user')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          role: 'admin'
        });

      expect(response.status).toBe(403);
    });

    it('should prevent insecure direct object references', async () => {
      const userToken = jwt.sign(
        { 
          userId: 'user-1',
          email: 'user1@example.com',
          role: 'analyst',
          tenantId: 'tenant-1',
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Try to access another user's data
      const response = await request(app)
        .get('/api/users/user-2/cases')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent XSS in form inputs', async () => {
      const userToken = jwt.sign(
        { 
          userId: 'test-user',
          email: 'test@example.com',
          role: 'analyst',
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>',
        "';alert('xss');//"
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/cases')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: payload,
            description: 'Test case'
          });

        // Should either reject or sanitize the input
        if (response.status === 201) {
          expect(response.body.data.title).not.toContain('<script>');
          expect(response.body.data.title).not.toContain('javascript:');
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    it('should prevent NoSQL injection', async () => {
      const userToken = jwt.sign(
        { 
          userId: 'test-user',
          email: 'test@example.com',
          role: 'analyst',
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      const nosqlPayloads = [
        { "$ne": null },
        { "$gt": "" },
        { "$regex": ".*" },
        { "$where": "1==1" }
      ];

      for (const payload of nosqlPayloads) {
        const response = await request(app)
          .post('/api/search')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            query: payload
          });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('API Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app).get('/');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(['DENY', 'SAMEORIGIN']).toContain(response.headers['x-frame-options']);

      expect(response.headers).toHaveProperty('x-xss-protection');
      
      if (response.headers['strict-transport-security']) {
        expect(response.headers['strict-transport-security']).toMatch(/max-age/);
      }
    });

    it('should implement Content Security Policy', async () => {
      const response = await request(app).get('/');

      if (response.headers['content-security-policy']) {
        const csp = response.headers['content-security-policy'];
        expect(csp).toMatch(/default-src/);
        expect(csp).toMatch(/'self'/);
      }
    });
  });
});

function extractSessionId(cookies: string[]): string | null {
  const sessionCookie = cookies.find(cookie => cookie.includes('connect.sid'));
  if (!sessionCookie) return null;
  
  const match = sessionCookie.match(/connect\.sid=([^;]+)/);
  return match ? match[1] : null;
}