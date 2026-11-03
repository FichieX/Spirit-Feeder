import AsyncStorage from '@react-native-async-storage/async-storage';

// Decorations you can win from serpent battles.
//   clothes: worn by the pet (the necklace, each pet's grown-up outfit, and the Bible clothes)
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
  | 'cross'
  // Bible clothes (fit every pet at every age; coming to the coin shop)
  | 'lily_crown'
  | 'fisher_hat'
  | 'shepherd_scarf'
  | 'coat_colors'
  | 'purple_cape';

export type DecorItem = {
  key: DecorKey;
  name: string;
  group: 'clothes' | 'room';
  sub?: 'windows' | 'frames'; // shown inside the "Windows" or "Frames" part of the Room list
  // Items with the same slot share one spot: hanging/wearing one takes the other off.
  // Pets wear 1 hat + 1 neck piece + 1 body piece. Grown-up outfits count as the body piece.
  slot?: 'window' | 'hat' | 'neck' | 'body';
  icon: number;
  art?: { w: number; h: number }; // room items: size in pixel-art pixels (drawn 4 points per pixel)
  pet?: string; // only this pet can wear it (grown-up outfits)
  rare?: boolean; // rare pull: much harder to win from serpent battles
  shop?: boolean; // Bible clothes: sold in the coin shop (not a serpent prize)
  verse?: string; // where it comes from in the Bible
};

export const DECOR: DecorItem[] = [
  { key: 'necklace', name: 'Cross necklace', group: 'clothes', icon: require('../../assets/images/item_necklace.png') },
  { key: 'saddle', name: 'Saddle blanket', group: 'clothes', slot: 'body', pet: 'donkey', icon: require('../../assets/images/item_saddle.png') },
  { key: 'pouch', name: 'Bread pouch', group: 'clothes', slot: 'body', pet: 'raven', icon: require('../../assets/images/item_pouch.png') },
  { key: 'robe', name: 'Wise-men robe', group: 'clothes', slot: 'body', pet: 'camel', icon: require('../../assets/images/item_robe.png') },
  // Bible clothes
  { key: 'lily_crown', name: 'Lily flower crown', group: 'clothes', slot: 'hat', shop: true, verse: 'Matthew 6:28', icon: require('../../assets/images/item_lily_crown.png') },
  { key: 'fisher_hat', name: "Fisherman's hat", group: 'clothes', slot: 'hat', shop: true, verse: 'Peter · Matthew 4:19', icon: require('../../assets/images/item_fisher_hat.png') },
  { key: 'shepherd_scarf', name: "Shepherd's scarf", group: 'clothes', slot: 'neck', shop: true, verse: 'Shepherds · Luke 2:8', icon: require('../../assets/images/item_shepherd_scarf.png') },
  { key: 'coat_colors', name: 'Coat of many colors', group: 'clothes', slot: 'body', shop: true, verse: 'Joseph · Genesis 37:3', icon: require('../../assets/images/item_coat_colors.png') },
  { key: 'purple_cape', name: 'Royal purple cape', group: 'clothes', slot: 'body', shop: true, verse: 'Lydia · Acts 16:14', icon: require('../../assets/images/item_purple_cape.png') },
  { key: 'door', name: 'Door', group: 'room', icon: require('../../assets/images/decor_door.png'), art: { w: 30, h: 48 } },
  { key: 'window', name: 'Night window', group: 'room', sub: 'windows', slot: 'window', icon: require('../../assets/images/decor_window.png'), art: { w: 34, h: 40 } },
  { key: 'window_purple', name: 'Purple stained glass', group: 'room', sub: 'windows', slot: 'window', icon: require('../../assets/images/decor_window_purple.png'), art: { w: 33, h: 48 }, rare: true },
  { key: 'window_green', name: 'Green stained glass', group: 'room', sub: 'windows', slot: 'window', icon: require('../../assets/images/decor_window_green.png'), art: { w: 33, h: 48 }, rare: true },
  { key: 'window_blue', name: 'Blue stained glass', group: 'room', sub: 'windows', slot: 'window', icon: require('../../assets/images/decor_window_blue.png'), art: { w: 33, h: 48 }, rare: true },
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
// If the pet is already wearing something in that spot (like the coat), the outfit is given but not put on.
export function giveGrownUpItem(state: DecorState, petKey: string): DecorState | null {
  const item = GROWN_UP_ITEM[petKey];
  const gifted = state.gifted ?? [];
  if (!item || gifted.includes(item)) return null;
  const slot = decorItem(item).slot;
  const spotTaken = !!slot && state.used.some((k) => decorItem(k)?.slot === slot);
  return {
    owned: state.owned.includes(item) ? state.owned : [...state.owned, item],
    used: state.used.includes(item) || spotTaken ? state.used : [...state.used, item],
    gifted: [...gifted, item],
  };
}

// Put on / take off one item. Hanging a window takes down the other window (they share one spot),
// and putting on a hat / neck piece / body piece takes off the one already there.
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
    // Drop anything that isn't a decoration anymore (like the old rainbow scarf)
    const known = (list: unknown): DecorKey[] =>
      Array.isArray(list) ? list.filter((k): k is DecorKey => DECOR.some((d) => d.key === k)) : [];
    return { owned: known(s.owned), used: known(s.used), gifted: known(s.gifted) };
  } catch {
    return { ...EMPTY };
  }
}

export async function saveDecor(username: string | undefined, state: DecorState) {
  try {
    await AsyncStorage.setItem(keyFor(username), JSON.stringify(state));
  } catch {}
}

// When a serpent drops a decoration, the chance it's a rare one (the stained-glass windows).
// 0.1 = 1 in 10 decoration drops. Raise it to make them easier to get.
export const RARE_DECOR_CHANCE = 0.1;

const pick = (items: DecorItem[]) => items[Math.floor(Math.random() * items.length)].key;

// A decoration the player doesn't have yet, or null (then they get a power-up instead).
// Grown-up outfits aren't prizes: pets get them by growing up.
// Rare ones stay rare: even after you own every common decoration, a rare one
// only comes on a rare roll.
export function randomNewDecor(owned: DecorKey[]): DecorKey | null {
  const left = DECOR.filter((d) => !owned.includes(d.key) && !d.pet && !d.shop);
  const rares = left.filter((d) => d.rare);
  const commons = left.filter((d) => !d.rare);
  if (rares.length && Math.random() < RARE_DECOR_CHANCE) return pick(rares);
  return commons.length ? pick(commons) : null;
}

// The Bible clothes the pet has on right now (drawn on top of its animations)
export const wornClothes = (state: DecorState): DecorKey[] => state.used.filter((k) => decorItem(k)?.shop);

// Testers can try every Bible piece before the coin shop opens
export const ownsItem = (state: DecorState, key: DecorKey, tester = false) =>
  state.owned.includes(key) || (tester && !!decorItem(key)?.shop);
