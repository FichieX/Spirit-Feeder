export const API_URL = 'http://192.168.1.105:8000';

export type User = { id: number; username: string; email?: string; birthday?: string };

async function post(path: string, body: object) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new Error(`Can't reach the server at ${API_URL}. Check your Wi-Fi and that the backend is running.`);
  } finally {
    clearTimeout(timeout);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (typeof data.detail === 'string') throw new Error(data.detail);
    if (Array.isArray(data.detail) && data.detail[0]?.msg) {
      const field = data.detail[0].loc?.[data.detail[0].loc.length - 1];
      throw new Error(field ? `${field}: ${data.detail[0].msg}` : data.detail[0].msg);
    }
    throw new Error('Something went wrong. Try again.');
  }
  return data;
}

export async function login(identifier: string, password: string): Promise<User> {
  const data = await post('/api/login', { identifier, password });
  return data.user ?? data;
}

export async function register(input: {
  username: string;
  email: string;
  password: string;
  birthday: string;
}): Promise<User> {
  const data = await post('/api/register', input);
  return data.user ?? data;
}