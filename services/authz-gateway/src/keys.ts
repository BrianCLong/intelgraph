import { generateKeyPair, exportJWK, JWK, KeyLike } from 'jose';

let privateKey: KeyLike;
let publicKey: KeyLike;
let publicJwk: JWK;

export async function initKeys() {
  const { publicKey: pub, privateKey: priv } = await generateKeyPair('RS256');
  privateKey = priv;
  publicKey = pub;
  publicJwk = await exportJWK(pub);
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';
  publicJwk.kid = 'authz-gateway-1';
}

export function getPrivateKey() {
  return privateKey;
}

export function getPublicKey() {
  return publicKey;
}

export function getPublicJwk() {
  return publicJwk;
}
