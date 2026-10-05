// Change this to your computer's local IP while testing on a phone,
// e.g. 'http://192.168.1.23:8000'. "localhost" won't work from a phone.
export const API_URL = 'http://192.168.1.23:8000';

export type User = { id: number; username: string; email: string; birthday: string };

export async function login(identifier: string, password: string): Promise<User> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Login failed. Try again.');
  }
  return data.user;
}
