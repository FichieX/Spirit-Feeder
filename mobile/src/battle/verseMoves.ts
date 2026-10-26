import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnimalKey, AnimalMove } from './animals';

export const MAX_UNLOCKED_MOVES_PER_ANIMAL = 10;
export const MAX_SELECTED_MOVES_PER_BATTLE = 4;

export type VerseMove = {
  id: string;
  animalKey: AnimalKey;
  moveKey: string;
  moveName: string;
  verseRef: string;
  verseText: string;
  description: string;
  power: number;
  accuracy: number;
  pp: number;
  maxPp: number;
  unlockedAt: number;
};

export type VerseMoveMap = Record<string, VerseMove>;

export const keyForVerseMoves = (username?: string) => `verseMoves:${username ?? 'guest'}`;

export const buildVerseMove = (
  animalKey: AnimalKey,
  move: AnimalMove,
  unlockedAt = Date.now(),
): VerseMove => ({
  id: `${animalKey}:${move.key}`,
  animalKey,
  moveKey: move.key,
  moveName: move.name,
  verseRef: move.verse_ref,
  verseText: move.verseText ?? move.name,
  description: move.description,
  power: move.power,
  accuracy: move.accuracy,
  pp: move.pp ?? 3,
  maxPp: move.pp ?? 3,
  unlockedAt,
});

export async function loadUnlockedVerseMoves(username?: string): Promise<VerseMoveMap> {
  try {
    const raw = await AsyncStorage.getItem(keyForVerseMoves(username));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveUnlockedVerseMoves(username: string | undefined, value: VerseMoveMap) {
  try {
    await AsyncStorage.setItem(keyForVerseMoves(username), JSON.stringify(value));
  } catch {}
}

export const getUnlockedMovesForAnimal = (moves: VerseMoveMap, animalKey: AnimalKey) =>
  Object.values(moves)
    .filter((move) => move.animalKey === animalKey)
    .sort((a, b) => a.unlockedAt - b.unlockedAt);

export const getUnlockedMoveCount = (moves: VerseMoveMap, animalKey: AnimalKey) =>
  getUnlockedMovesForAnimal(moves, animalKey).length;

export const canStartVerseBattle = (moves: VerseMoveMap) => Object.keys(moves).length > 0;

export const hasAnyUnlockedMoves = (moves: VerseMoveMap) => Object.keys(moves).length > 0;

export const unlockVerseMoveForPlayer = async (
  username: string | undefined,
  animalKey: AnimalKey,
  move: AnimalMove,
) => {
  const current = await loadUnlockedVerseMoves(username);
  const entry = buildVerseMove(animalKey, move);
  current[entry.id] = entry;
  await saveUnlockedVerseMoves(username, current);
  return current[entry.id];
};

export const selectBattleMoves = (moves: VerseMove[], count = MAX_SELECTED_MOVES_PER_BATTLE) => {
  const arr = [...moves];
  if (arr.length <= count) return arr;
  return arr.slice(0, count);
};