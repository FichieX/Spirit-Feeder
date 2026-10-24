import AsyncStorage from '@react-native-async-storage/async-storage';

// Decorations you can win from serpent battles.
//   clothes: worn by the pet (the necklace, plus each pet's grown-up outfit)
//   room:    hung in the study at a fixed spot
export type DecorKey =
  | 'necklace'
  | 'saddle'
  | 'pouch'
  | 'robe'
  | 'door'
  | 'window'
  | 'window_purple'
  | 'window_green'
  | 'window_blue'
  | 'frame_scripture'
  | 'frame_jesus'
  | 'cross';

export type DecorItem = {
  key: DecorKey;
  name: string;
  group: 'clothes' | 'room';
  sub?: 'windows' | 'frames'; // shown inside the "Windows" or "Frames" part of the Room list
  slot?: 'window'; // items with the same slot share one spot: hanging one takes the other down
  icon: number;
  art?: { w: number; h: number }; // room items: size in pixel-art pixels (drawn 4 points per pixel)
  pet?: string; // only this pet can wear it (grown-up outfits)
};

export const DECOR: DecorItem[] = [
  { key: 'necklace', name: 'Cross necklace', group: 'clothes', icon: require('../../assets/images/item_necklace.png') },
  { key: 'saddle', name: 'Saddle blanket', group: 'clothes', pet: 'donkey', icon: require('../../assets/images/item_saddle.png') },
  { key: 'pouch', name: 'Bread pouch', group: 'clothes', pet: 'raven', icon: require('../../assets/images/item_pouch.png') },
  { key: 'robe', name: 'Wise-men robe', group: 'clothes', pet: 'camel', icon: require('../../assets/images/item_robe.png') },
  { key: 'door', name: 'Door', group: 'room', icon: require('../../assets/images/decor_door.png'), art: { w: 30, h: 48 } },
  { key: 'window', name: 'Night window', group: 'room', sub: 'windows', slot: 'window', icon: require('../../assets/images/decor_window.png'), art: { w: 34, h: 40 } },
  { key: 'window_purple', name: 'Purple stained glass', group: 'room', sub: 'windows', slot: 'window', icon: require('../../assets/images/decor_window_purple.png'), art: { w: 33, h: 48 } },
  { key: 'window_green', name: 'Green stained glass', group: 'room', sub: 'windows', slot: 'window', icon: require('../../assets/images/decor_window_green.png'), art: { w: 33, h: 48 } },
  { key: 'window_blue', name: 'Blue stained glass', group: 'room', sub: 'windows', slot: 'window', icon: require('../../assets/images/decor_window_blue.png'), art: { w: 33, h: 48 } },
  { key: 'frame_scripture', name: 'Scripture', group: 'room', sub: 'frames', icon: require('../../assets/images/decor_scripture.png'), art: { w: 22, h: 26 } },
  { key: 'frame_jesus', name: 'Picture of Jesus', group: 'room', sub: 'frames', icon: require('../../assets/images/decor_jesus.png'), art: { w: 26, h: 32 } },
  { key: 'cross', name: 'Cross', group: 'room', sub: 'frames', icon: require('../../assets/images/decor_cross.png'), art: { w: 14, h: 22 } },
];

export const decorItem = (key: DecorKey) => DECOR.find((d) => d.key === key)!;

// What each pet gets to wear when it grows up (it can take it off and put it back on).
// The lion's is his cross necklace.
export const GROWN_UP_ITEM: Record<string, DecorKey> = { donkey: 'saddle', lion: 'necklace', raven: 'pouch', camel: 'robe' };

// Is the pet wearing its grown-up outfit? (decides which adult art is shown)
export const outfitOn = (state: DecorState, petKey: string) => {
  const item = GROWN_UP_ITEM[petKey];
  return !!item && state.used.includes(item);
};

// Grown up: give the outfit once and put it on. Returns null if nothing changes.
// (If the player takes it off later, it stays off.)
export function giveGrownUpItem(state: DecorState, petKey: string): DecorState | null {
  const item = GROWN_UP_ITEM[petKey];
  const gifted = state.gifted ?? [];
  if (!item || gifted.includes(item)) return null;
  return {
    owned: state.owned.includes(item) ? state.owned : [...state.owned, item],
    used: state.used.includes(item) ? state.used : [...state.used, item],
    gifted: [...gifted, item],
  };
}

// Put on / take off one item. Hanging a window takes down the other window (they share one spot).
export function toggleUsed(used: DecorKey[], key: DecorKey): DecorKey[] {
  if (used.includes(key)) return used.filter((k) => k !== key);
  const slot = decorItem(key).slot;
  const keep = slot ? used.filter((k) => decorItem(k)?.slot !== slot) : used;
  return [...keep, key];
}

// owned = won so far, used = currently worn / hung up, gifted = grown-up outfits already given
export type DecorState = { owned: DecorKey[]; used: DecorKey[]; gifted?: DecorKey[] };
const EMPTY: DecorState = { owned: [], used: [], gifted: [] };
const keyFor = (username?: string) => `decor:${username ?? 'guest'}`;

export async function loadDecor(username?: string): Promise<DecorState> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(username));
    const s = raw ? JSON.parse(raw) : {};
    return { owned: s.owned ?? [], used: s.used ?? [], gifted: s.gifted ?? [] };
  } catch {
    return { ...EMPTY };
  }
}

export async function saveDecor(username: string | undefined, state: DecorState) {
  try {
    await AsyncStorage.setItem(keyFor(username), JSON.stringify(state));
  } catch {}
}

// A decoration the player doesn't have yet (null if they have them all).
// Grown-up outfits aren't prizes: pets get them by growing up.
export function randomNewDecor(owned: DecorKey[]): DecorKey | null {
  const left = DECOR.filter((d) => !owned.includes(d.key) && !d.pet);
  return left.length ? left[Math.floor(Math.random() * left.length)].key : null;
}
