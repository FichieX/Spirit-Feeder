import { useEffect, useState } from 'react';

// Who is playing right now. The study screen fills this in, so parts of the app that
// don't get the login details passed to them (like the battle invite pop-up) know who you are.
export type Session = {
  userId: number;
  username: string;
  animalId: number;
  petName: string;
  level: number;
  hatched: boolean; // only hatched pets can battle
};

let current: Session | null = null;
let requests = 0; // friend requests waiting for you (from the server, every few seconds)
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getSession = () => current;

export function setSession(next: Session | null) {
  if (JSON.stringify(next) === JSON.stringify(current)) return;
  current = next;
  if (!next) requests = 0;
  emit();
}

export function setRequestCount(n: number) {
  if (n === requests) return;
  requests = n;
  emit();
}

function useStore<T>(read: () => T): T {
  const [value, setValue] = useState(read);
  useEffect(() => {
    const update = () => setValue(read);
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);
  return value;
}

export const useSession = () => useStore(() => current);
export const useRequestCount = () => useStore(() => requests);

// The usual route params (username, userId, animalId, petName, level) for router.replace
export const sessionParams = (s: Session) => ({
  username: s.username,
  userId: String(s.userId),
  animalId: String(s.animalId),
  petName: s.petName,
  level: String(s.level),
});
