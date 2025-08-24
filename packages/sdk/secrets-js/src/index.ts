/**
 * Typed helpers for brokered secrets retrieval.
 */

import axios from 'axios';

export interface SecretRequest {
  path: string;
}

export interface SecretResponse<T = unknown> {
  token: T;
}

/**
 * Request a short-lived token from the secrets broker.
 */
export async function getSecret<T>(req: SecretRequest): Promise<SecretResponse<T>> {
  const { data } = await axios.post<SecretResponse<T>>('/secrets/get', req);
  return data;
}
