import AsyncStorage from '@react-native-async-storage/async-storage';

// Things saved on this phone under the username (pet, decorations, power-ups, verses, quiz history).
const PREFIXES = ['pet', 'decor', 'powers', 'powersGift', 'memory', 'seenQuestions'];

// After a username change: move this phone's saved data to the new name, so nothing looks lost.
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
