export async function api(path: string, options: RequestInit = {}) {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const res = await fetch(`${url}${path}`, options);
  if (!res.ok) {
    throw new Error('API error');
  }
  return res.json();
}
