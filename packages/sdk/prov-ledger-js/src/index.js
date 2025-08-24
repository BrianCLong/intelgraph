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

  const get = async (path) => {
    const res = await fetch(`${baseUrl}${path}`);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  };

  return {
    createClaim: (data) => post('/claims', data),
    createEvidence: (data) => post('/evidence', data),
    createTransform: (data) => post('/transform', data),
    exportManifest: () => post('/export/manifests', {}),
    getManifest: (url) => get(url)
  };
}
