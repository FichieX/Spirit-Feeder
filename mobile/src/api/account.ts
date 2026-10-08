import { API_URL } from './auth';

// Change your username once. Server side: account.py

async function call<T>(method: 'GET' | 'POST', path: string, body?: object): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong. Try again.');
    return data as T;
  } catch (err: any) {
    if (err?.name === 'AbortError' || err instanceof TypeError) throw new Error("Can't reach the server.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const fetchAccount = (userId: number) =>
  call<{ username: string; canChangeUsername: boolean }>('GET', `/api/account/${userId}`);

export const changeUsername = (userId: number, newUsername: string) =>
  call<{ username: string; message: string }>('POST', '/api/account/username', { user_id: userId, new_username: newUsername });

// Same rule as signing up
export const USERNAME_RULE = /^[A-Za-z0-9_]{3,20}$/;
