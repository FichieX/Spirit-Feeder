import { API_URL } from './auth';

export async function selectPet(userId: number, animalId: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/pet/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, animal_id: animalId }),
      signal: controller.signal,
    });
  } catch {
    throw new Error("Can't reach the server. Check your Wi-Fi and that the backend is running.");
  } finally {
    clearTimeout(timeout);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (typeof data.detail === 'string') throw new Error(data.detail);
    if (Array.isArray(data.detail) && data.detail[0]?.msg) throw new Error(data.detail[0].msg);
    throw new Error('Could not choose this pet. Try again.');
  }
  return data;
}
