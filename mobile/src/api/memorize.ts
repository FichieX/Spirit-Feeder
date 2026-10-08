import { API_URL } from './auth';

// Memorizing a verse earns XP on the server (server side: memorize.py)
export type MemorizeXp = { xp_gained: number; xp: number; animal_level: number; leveled_up: boolean; next_level_xp: number };

export async function completeMemorize(userId: number, verse: string, kind: 'new' | 'review' | 'practice'): Promise<MemorizeXp> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/memorize/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, verse, kind }),
      signal: controller.signal,
    });
  } catch {
    throw new Error("Can't reach the server, so no XP this time.");
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 404 && data.detail === 'Not Found') throw new Error('XP for memorizing is not set up on the server yet.');
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong.');
  }
  return data as MemorizeXp;
}
