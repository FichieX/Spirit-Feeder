export const API_URL = 'http://192.168.0.104:8000';

export type User = { id: number; username: string; email: string; birthday: string };

async function post(path: string, body: object) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : null;
    throw new Error(detail ?? 'Something went wrong. Try again.');
  }
  return data;
}

export async function login(identifier: string, password: string): Promise<User> {
  const data = await post('/api/login', { identifier, password });
  return data.user;
}

export async function register(input: {
  username: string;
  email: string;
  password: string;
  birthday: string;
}): Promise<User> {
  const data = await post('/api/register', input);
  return data.user;
}