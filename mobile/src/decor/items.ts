import AsyncStorage from '@react-native-async-storage/async-storage';

// Decorations you can win from serpent battles.
//   clothes: worn by the pet (only the necklace for now)
//   room:    hung in the study at a fixed spot
export type DecorKey = 'necklace' | 'door' | 'window' | 'frame_scripture' | 'frame_jesus' | 'cross';

export type DecorItem = {
  key: DecorKey;
  name: string;
  group: 'clothes' | 'room';
  sub?: 'frames'; // shown inside the "Frames" part of the Room list
  icon: number;
  art?: { w: number; h: number }; // room items: size in pixel-art pixels (drawn 4 points per pixel)
};

export const DECOR: DecorItem[] = [
  { key: 'necklace', name: 'Cross necklace', group: 'clothes', icon: require('../../assets/images/item_necklace.png') },
  { key: 'door', name: 'Door', group: 'room', icon: require('../../assets/images/decor_door.png'), art: { w: 30, h: 48 } },
  { key: 'window', name: 'Window', group: 'room', icon: require('../../assets/images/decor_window.png'), art: { w: 34, h: 40 } },
  { key: 'frame_scripture', name: 'Scripture', group: 'room', sub: 'frames', icon: require('../../assets/images/decor_scripture.png'), art: { w: 22, h: 26 } },
  { key: 'frame_jesus', name: 'Picture of Jesus', group: 'room', sub: 'frames', icon: require('../../assets/images/decor_jesus.png'), art: { w: 22, h: 26 } },
  { key: 'cross', name: 'Cross', group: 'room', sub: 'frames', icon: require('../../assets/images/decor_cross.png'), art: { w: 14, h: 22 } },
];

export const decorItem = (key: DecorKey) => DECOR.find((d) => d.key === key)!;

// owned = won so far, used = currently worn / hung up
export type DecorState = { owned: DecorKey[]; used: DecorKey[] };
const EMPTY: DecorState = { owned: [], used: [] };
const keyFor = (username?: string) => `decor:${username ?? 'guest'}`;

export async function loadDecor(username?: string): Promise<DecorState> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(username));
    const s = raw ? JSON.parse(raw) : {};
    return { owned: s.owned ?? [], used: s.used ?? [] };
  } catch {
    return { ...EMPTY };
  }
}

export async function saveDecor(username: string | undefined, state: DecorState) {
  try {
    await AsyncStorage.setItem(keyFor(username), JSON.stringify(state));
  } catch {}
}

// A decoration the player doesn't have yet (null if they have them all)
export function randomNewDecor(owned: DecorKey[]): DecorKey | null {
  const left = DECOR.filter((d) => !owned.includes(d.key));
  return left.length ? left[Math.floor(Math.random() * left.length)].key : null;
}
