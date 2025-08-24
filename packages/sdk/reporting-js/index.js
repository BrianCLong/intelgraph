const axios = require('axios');
const { createHash } = require('crypto');
const { readFileSync } = require('fs');

async function getTemplates(apiBase) {
  const { data } = await axios.get(`${apiBase}/reports/templates`);
  return data;
}

async function renderReport(apiBase, payload) {
  const { data } = await axios.post(`${apiBase}/reports/render`, payload);
  return data;
}

function verifyReport(filePath, expectedHash) {
  const file = readFileSync(filePath);
  const hash = createHash('sha256').update(file).digest('hex');
  return hash === expectedHash;
}

module.exports = { getTemplates, renderReport, verifyReport };
