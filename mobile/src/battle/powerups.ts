import AsyncStorage from '@react-native-async-storage/async-storage';

// Power-ups you win from battles:
//   freeze = stop the timer for one question
//   shield = the next wrong answer doesn't hurt you
//   fifty  = remove one wrong answer
export type PowerKey = 'freeze' | 'shield' | 'fifty';
export type PowerBag = Record<PowerKey, number>;

export const POWERS: { key: PowerKey; name: string; info: string; icon: number }[] = [
  { key: 'freeze', name: 'Freeze Time', info: 'Stops the timer for this question', icon: require('../../assets/images/power_freeze.png') },
  { key: 'shield', name: 'Immunity', info: 'Your next wrong answer does no damage', icon: require('../../assets/images/power_shield.png') },
  { key: 'fifty', name: 'Eliminate', info: 'Removes one wrong answer', icon: require('../../assets/images/power_fifty.png') },
];

// Which power-up each pet usually gets (out of 100). The small ones are the rare pulls.
//   donkey: Freeze Time is common
//   lion:   Immunity is common
//   Eliminate is rare for everyone
export const POWER_ODDS: Record<string, Record<PowerKey, number>> = {
  donkey: { freeze: 70, shield: 15, fifty: 15 },
  lion: { shield: 70, freeze: 15, fifty: 15 },
};
const oddsFor = (petKey: string) => POWER_ODDS[petKey] ?? POWER_ODDS.donkey;
export const isRarePower = (petKey: string, key: PowerKey) => oddsFor(petKey)[key] < 50;

const EMPTY: PowerBag = { freeze: 0, shield: 0, fifty: 0 };
const keyFor = (username?: string) => `powers:${username ?? 'guest'}`;

export async function loadPowers(username?: string): Promise<PowerBag> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(username));
    return { ...EMPTY, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...EMPTY };
  }
}

export async function savePowers(username: string | undefined, bag: PowerBag) {
  try {
    await AsyncStorage.setItem(keyFor(username), JSON.stringify(bag));
  } catch {}
}

// Weighted pull, using this pet's odds
export function randomPower(petKey = 'donkey'): PowerKey {
  const odds = oddsFor(petKey);
  const keys = Object.keys(odds) as PowerKey[];
  const total = keys.reduce((sum, k) => sum + odds[k], 0);
  let roll = Math.random() * total;
  for (const k of keys) {
    roll -= odds[k];
    if (roll < 0) return k;
  }
  return keys[0];
}
