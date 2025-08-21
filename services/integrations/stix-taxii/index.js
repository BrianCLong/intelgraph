const axios = require('axios');

/**
 * Push a STIX bundle to a TAXII server.
 * @param {string} server - Base URL of the TAXII server.
 * @param {string} token - Authentication token.
 * @param {object} bundle - STIX bundle JSON.
 * @returns {Promise<object>} Server response.
 */
async function pushBundle(server, token, bundle) {
  const url = `${server}/collections`;
  const res = await axios.post(url, bundle, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return res.data;
}

/**
 * Pull STIX objects from a TAXII collection.
 * @param {string} server - Base URL of the TAXII server.
 * @param {string} token - Authentication token.
 * @param {string} collectionId - TAXII collection identifier.
 * @returns {Promise<object>} STIX objects from the collection.
 */
async function pullCollection(server, token, collectionId) {
  const url = `${server}/collections/${collectionId}/objects`;
  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

module.exports = { pushBundle, pullCollection };
