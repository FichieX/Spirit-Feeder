import { API_URL } from './auth';

// Ranked battles against other players (live, over a WebSocket).
// Server side: pvp.py (Kirk's backend).

export type RankInfo = {
  season: string; // "2026-10"
  points: number;
  wins: number;
  losses: number;
  draws: number;
  rank: number | null; // null until you've played this month
  players: number;
};

export type BoardRow = { rank: number; userId: number; username: string; points: number; wins: number; losses: number };
export type Leaderboard = {
  season: string;
  reset: 'half' | 'zero';
  players: BoardRow[];
  pastWinners: { season: string; top: BoardRow[] }[];
};

async function getJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${API_URL}${path}`, { signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong.');
    return data as T;
  } catch (err: any) {
    if (err?.name === 'AbortError' || err instanceof TypeError) throw new Error("Can't reach the server.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const fetchMyRank = (userId: number) => getJson<RankInfo>(`/api/ranked/${userId}`);
export const fetchLeaderboard = () => getJson<Leaderboard>('/api/leaderboard');

// ws://<server>/ws/battle/<userId>
export const battleSocketUrl = (userId: number) => `${API_URL.replace(/^http/, 'ws')}/ws/battle/${userId}`;

// "2026-10" -> "October 2026"
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function seasonName(season: string) {
  const [y, m] = season.split('-').map(Number);
  return m ? `${MONTHS[m - 1]} ${y}` : season;
}
