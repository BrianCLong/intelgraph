/**
 * @typedef {object} Record
 * @property {string} id
 * @property {string} license
 * @property {string} source
 */

/**
 * Create a client for the provenance ledger service
 * @param {string} baseUrl
 */
export function createClient(baseUrl) {
  const post = async (path, body) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  };

  return {
    /** @param {Record} data */
    createClaim: (data) => post('/claims', data),
    /** @param {Record} data */
    createEvidence: (data) => post('/evidence', data),
    /** @param {Record} data */
    createTransform: (data) => post('/transform', data),
    exportManifest: () => post('/export/manifests', {})
  };
}
