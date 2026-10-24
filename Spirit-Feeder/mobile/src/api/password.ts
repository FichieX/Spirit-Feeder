import { API_URL } from './auth';

// Forgot password (server side: password_reset.py)

async function post(path: string, body: object) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000); // sending an email can take a few seconds
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 404) throw new Error('Password reset is not set up on the server yet.');
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong. Try again.');
  }
  return data;
}

// 1. Email a 6-digit code
export const requestResetCode = (email: string) => post('/api/password/forgot', { email });

// 2. Check the code before choosing a new password
export const checkResetCode = (email: string, code: string) => post('/api/password/check', { email, code });

// 3. Save the new password
export const resetPassword = (email: string, code: string, newPassword: string) =>
  post('/api/password/reset', { email, code, new_password: newPassword });
