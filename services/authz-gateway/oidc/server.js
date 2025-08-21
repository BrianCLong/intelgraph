import express from 'express';
import { generateKeyPair, exportJWK, jwtVerify, SignJWT } from 'jose';

const app = express();
app.use(express.json());

// Generate an RSA key pair at startup. In production, use persistent keys.
const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = await exportJWK(publicKey);
jwk.use = 'sig';
jwk.kid = 'dev-key';

// Publish the JWKS for clients to validate tokens.
app.get('/.well-known/jwks.json', (req, res) => {
  res.json({ keys: [jwk] });
});

// Issue a token for demonstration purposes. Accepts { sub, acr } in the body.
app.post('/token', async (req, res) => {
  const { sub = 'user', acr = 'urn:pwd' } = req.body || {};
  const token = await new SignJWT({ sub, acr })
    .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(privateKey);
  res.json({ token });
});

// Middleware enforcing step-up based on the acr claim.
function requireAcr(requiredAcr) {
  return async (req, res, next) => {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ error: 'missing token' });
      const token = auth.replace('Bearer ', '');
      const { payload } = await jwtVerify(token, publicKey, {
        algorithms: ['RS256'],
      });
      if (payload.acr !== requiredAcr) {
        return res.status(403).json({
          error: 'step-up required',
          requiredAcr,
        });
      }
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'invalid token' });
    }
  };
}

// Example protected route requiring MFA-level assurance.
app.get('/sensitive', requireAcr('urn:mfa'), (req, res) => {
  res.json({ ok: true, sub: req.user.sub });
});

app.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log('OIDC gateway listening on port 3000');
});
