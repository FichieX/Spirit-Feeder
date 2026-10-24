import { API_URL } from './auth';

// Test accounts only (tester, test, admin): save the test level's XP on the server,
// so friends, battles and the leaderboard show the same level as the study.
// Server side: testing.py
export async function saveTestXp(userId: number, xp: number) {
  const res = await fetch(`${API_URL}/api/test/xp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, xp: Math.round(xp) }),
  });
  if (!res.ok) throw new Error('Could not save the test level.');
  return res.json();
}
