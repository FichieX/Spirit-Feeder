import AsyncStorage from '@react-native-async-storage/async-storage';

// Things saved on this phone under the username (pet, decorations, power-ups, verses, verse battle moves, quiz history).
const PREFIXES = ['pet', 'decor', 'powers', 'powersGift', 'memory', 'seenQuestions', 'verseMoves'];

export async function moveUserData(oldName: string, newName: string) {
  for (const prefix of PREFIXES) {
    try {
      const from = `${prefix}:${oldName}`;
      const to = `${prefix}:${newName}`;
      const value = await AsyncStorage.getItem(from);
      if (value === null) continue;
      if ((await AsyncStorage.getItem(to)) === null) await AsyncStorage.setItem(to, value);
      await AsyncStorage.removeItem(from);
    } catch {}
  }
}