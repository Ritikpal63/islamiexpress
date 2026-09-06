export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function apiFetch(path, options={}) {
  try {
    const res = await fetch(`${API_URL}${path}`, { ...options, next: options.next ?? { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch (_) {
    return null;
  }
}

export function clientApi(path, options={}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ie_token') : null;
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{ }), ...(options.headers||{})}
  }).then(async r => {
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.message||'Request failed');
    return data;
  });
}
