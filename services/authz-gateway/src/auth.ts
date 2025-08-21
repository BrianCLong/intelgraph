import { SignJWT, jwtVerify } from 'jose';
import { getPrivateKey, getPublicKey } from './keys';
import { log } from './audit';

interface User {
  username: string;
  password: string;
  sub: string;
  tenantId: string;
  roles: string[];
  clearance: string;
}

const users: Record<string, User> = {
  alice: {
    username: 'alice',
    password: 'password123',
    sub: 'alice',
    tenantId: 'tenantA',
    roles: ['reader'],
    clearance: 'confidential',
  },
};

export async function login(username: string, password: string) {
  const user = users[username];
  if (!user || user.password !== password) {
    throw new Error('invalid_credentials');
  }
  const token = await new SignJWT({
    sub: user.sub,
    tenantId: user.tenantId,
    roles: user.roles,
    clearance: user.clearance,
    acr: 'loa1',
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getPrivateKey());
  await log({
    subject: user.sub,
    action: 'login',
    resource: 'self',
    tenantId: user.tenantId,
    allowed: true,
    reason: 'login',
  });
  return token;
}

export async function introspect(token: string) {
  const { payload } = await jwtVerify(token, getPublicKey());
  return payload;
}
