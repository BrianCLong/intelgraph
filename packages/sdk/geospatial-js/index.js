import axios from 'axios';

const BASE = '/geo';

export async function geofenceCheck(payload) {
  const res = await axios.post(`${BASE}/geofence/check`, payload);
  return res.data;
}

export async function cluster(payload) {
  const res = await axios.post(`${BASE}/cluster`, payload);
  return res.data;
}

export async function trajectory(payload) {
  const res = await axios.post(`${BASE}/trajectory`, payload);
  return res.data;
}
