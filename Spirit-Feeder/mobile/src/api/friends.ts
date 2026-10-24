import { API_URL } from './auth';

// Friends + live friend battles. Server side: friends.py (and pvp.py for the battle itself).

export type FriendStatus = 'online' | 'battle' | 'serpent' | 'offline';
export type Friend = {
  userId: number;
  username: string;
  animalId: number;
  level: number;
  status: FriendStatus; // battle = in a live battle, serpent = fighting a serpent
  canBattle: boolean;
};
export type FriendRequest = Friend & { requestId: number };
export type FriendList = { friends: Friend[]; incoming: FriendRequest[]; outgoing: FriendRequest[] };

export type BattleMode = 'fun' | 'ranked';
export type BattleInvite = { inviteId: string; fromId: number; fromName: string; mode: BattleMode; seconds: number };
// accepted = your friend had already invited you, so you joined their battle instead
export type InviteSent = { inviteId: string; accepted: boolean; mode: BattleMode; friend: string; seconds?: number };

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

export const fetchFriends = (userId: number) => call<FriendList>('GET', `/api/friends/${userId}`);

// "I'm online" + any battle invites waiting for me. The app calls this every few seconds.
export const pingFriends = (userId: number, screen: string, hatched: boolean) =>
  call<{ invites: BattleInvite[]; requests: number }>(
    'GET',
    `/api/friends/${userId}/ping?screen=${encodeURIComponent(screen)}&ready=${hatched ? 1 : 0}`,
  );

export const sendFriendRequest = (userId: number, username: string) =>
  call<{ message: string; status: 'pending' | 'accepted' }>('POST', '/api/friends/request', { user_id: userId, username });

export const answerFriendRequest = (userId: number, requestId: number, accept: boolean) =>
  call<{ message: string }>('POST', '/api/friends/respond', { user_id: userId, request_id: requestId, accept });

// Unfriend, or cancel a request you sent
export const removeFriend = (userId: number, friendId: number) =>
  call<{ message: string }>('POST', '/api/friends/remove', { user_id: userId, friend_id: friendId });

export const inviteToBattle = (userId: number, friendId: number, mode: BattleMode) =>
  call<InviteSent>('POST', '/api/friends/battle', { user_id: userId, friend_id: friendId, mode });

export const answerBattleInvite = (userId: number, inviteId: string, accept: boolean) =>
  call<{ ok: boolean }>('POST', '/api/friends/battle/respond', { user_id: userId, invite_id: inviteId, accept });

export const MODE_INFO: Record<BattleMode, { name: string; info: string }> = {
  fun: { name: 'FUN', info: 'Just for practice. No points won or lost.' },
  ranked: { name: 'RANKED', info: 'Counts for ranked points, like a normal ranked battle.' },
};
