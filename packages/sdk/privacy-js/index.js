import axios from 'axios';

export async function scan(text) {
  const res = await axios.post('/privacy/scan', { text });
  return res.data;
}

export async function redactProposals(text) {
  const res = await axios.post('/privacy/redact-proposals', { text });
  return res.data;
}

export async function applyRedactions(text, proposals, authority, reason) {
  const res = await axios.post('/privacy/apply', {
    text,
    proposals,
    authority,
    reason,
  });
  return res.data;
}
