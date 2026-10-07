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

export function randomPower(): PowerKey {
  const keys: PowerKey[] = ['freeze', 'shield', 'fifty'];
  return keys[Math.floor(Math.random() * keys.length)];
}
