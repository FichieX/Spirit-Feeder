import { API_URL } from './auth';

// Serpent battle result: XP for winning (once per serpent), XP loss for losing.
// Server side: serpent.py
export type SerpentXp = { xp_change: number; xp: number; animal_level: number; leveled_up: boolean; next_level_xp: number; note: string };

export async function reportSerpent(userId: number, milestone: number, won: boolean): Promise<SerpentXp> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${API_URL}/api/battle/serpent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, milestone, won }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Battle result not saved.');
    return data as SerpentXp;
  } finally {
    clearTimeout(timer);
  }
}
