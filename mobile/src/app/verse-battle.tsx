import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { PET_BY_ANIMAL } from '../pets/forms';
import {
  ANIMAL_TYPES,
  chooseCpuMove,
  computeAnimalDamage,
  getAnimalMoves,
  scrambleWords,
  type AnimalKey,
  type AnimalMove,
} from '../battle/animals';
import MovePicker from '../components/verse/MovePicker';
import { isTester } from '../components/study/TestPanel';
import SinaiArena, { SINAI_SKY } from '../components/verse/SinaiArena';
import MoveTablets, { moveColor } from '../components/verse/MoveTablets';

// Bright word tiles: each tile gets one of these (by position, so colors say nothing about the answer)
const TILE_COLORS = ['#FF4F79', '#3DA5FF', '#4FE08A', '#FFD23D', '#FF8A3D', '#B26BFF'];
import { loadDecor, outfitOn, type DecorState } from '../decor/items';

type BattleMove = AnimalMove & {
  pp: number;
  maxPp: number;
};

const PLAYER_MAX_HP = 100;

const getAnimalMaxHealth = (level: number, animalKey: AnimalKey) => {
  const base = {
    lion: 150,
    donkey: 145,
    camel: 155,
    raven: 140,
    dove: 150,
    fish: 148,
  }[animalKey] ?? 145;

  return Math.round(base + Math.max(0, level - 1) * 18);
};

export default function VerseBattle() {
  const params = useLocalSearchParams<{
    username?: string;
    userId?: string;
    animalId?: string;
    level?: string;
    milestone?: string;
    petName?: string;
  }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Players must know the verse by heart. Test accounts can see it, to make testing easier.
  const showVerse = isTester(params.username);

  const animalId = Number(params.animalId) || 1;
  const petKey = (PET_BY_ANIMAL[animalId] ?? 'donkey') as AnimalKey;
  const playerLevel = Number(params.level) || 1;
  const milestone = Number(params.milestone) || 5;
  const petName = (params.petName || 'Your pet').toString();

  const enemyKey: AnimalKey = useMemo(() => {
    // Only animals that have pixel art yet (dove and fish don't, so they can't show up in the arena)
    const order: AnimalKey[] = ['lion', 'donkey', 'camel', 'raven'];
    const idx = order.indexOf(petKey);
    return order[(idx + 1 + (milestone % order.length)) % order.length];
  }, [milestone, petKey]);

  // Your pet wears its outfit / necklace in the arena too
  const [decor, setDecor] = useState<DecorState>({ owned: [], used: [] });
  useEffect(() => {
    loadDecor(params.username).then(setDecor);
  }, [params.username]);

  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [enemyHp, setEnemyHp] = useState(PLAYER_MAX_HP);
  const [log, setLog] = useState('Choose 4 moves for the battle, or use all unlocked moves if you have fewer than 5.');
  const [selectedMove, setSelectedMove] = useState<BattleMove | null>(null);
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [orderedWords, setOrderedWords] = useState<string[]>([]);
  const [usedTiles, setUsedTiles] = useState<number[]>([]); // which word tiles are placed, in order
  const [timer, setTimer] = useState(30);
  const [round, setRound] = useState(1);
  const [availableMoves, setAvailableMoves] = useState<BattleMove[]>([]);
  const [selectedMoves, setSelectedMoves] = useState<BattleMove[]>([]);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [battleEnded, setBattleEnded] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const baseMoves = getAnimalMoves(petKey).map((move) => ({
      ...move,
      pp: move.pp ?? 3,
      maxPp: move.pp ?? 3,
      verseText: move.verseText ?? move.name,
    })) as BattleMove[];

    if (baseMoves.length === 0) {
      Alert.alert('Verse battle locked', 'You have not memorised any verse moves yet.');
      router.back();
      return;
    }

    setAvailableMoves(baseMoves);

    if (baseMoves.length < 5) {
      setSelectedMoves(baseMoves);
      setSelectionOpen(false);
    } else {
      setSelectedMoves([]);
      setSelectionOpen(true);
    }

    const playerMax = getAnimalMaxHealth(playerLevel, petKey);
    const enemyMax = getAnimalMaxHealth(milestone, enemyKey);

    setPlayerHp(playerMax);
    setEnemyHp(enemyMax);
  }, [petKey, playerLevel, milestone, enemyKey, router]);

  useEffect(() => {
    if (!selectedMove || battleEnded) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleMiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedMove, round, battleEnded]);

  const resetTurn = () => {
    setSelectedMove(null);
    setCurrentWords([]);
    setOrderedWords([]);
    setUsedTiles([]);
    setTimer(30);
  };

  const handleMiss = () => {
    if (battleEnded) return;

    const cpuMove = chooseCpuMove(enemyKey);
    const cpuDamage = computeAnimalDamage(enemyKey, petKey, cpuMove.power, milestone, playerLevel);

    setPlayerHp((prev) => Math.max(0, prev - cpuDamage.damage));
    setLog(`Time up! ${petName} missed the verse order and lost the turn.`);

    setTimeout(() => {
      setLog(`${cpuMove.name} hit for ${cpuDamage.damage} damage. Pick your next move.`);
    }, 200);

    // Back to your moves for the next round (before, the battle got stuck here)
    setTimeout(() => {
      resetTurn();
      setRound((r) => r + 1);
      if (playerHp - cpuDamage.damage <= 0) {
        setBattleEnded(true);
        Alert.alert('Defeat', `${petName} was overwhelmed. Try another round.`);
        router.back();
      }
    }, 900);
  };

  const tryMove = (move: BattleMove) => {
    if (move.pp <= 0) {
      Alert.alert('PP depleted', `${move.name} has no uses left this battle.`);
      return;
    }

    const verseText = move.verseText ?? move.name;

    setSelectedMove(move);
    setCurrentWords(scrambleWords(verseText));
    setOrderedWords([]);
    setUsedTiles([]);
    setTimer(30);
    setLog(`Reorder the verse for: ${move.name}`);
  };

  // Take a placed word back off the answer (and the words after it), so you can pick again
  const takeBackFrom = (pos: number) => {
    const keep = usedTiles.slice(0, pos);
    setUsedTiles(keep);
    setOrderedWords(keep.map((i) => currentWords[i]));
  };

  // Tiles are tracked by position, so verses with the same word twice ("the ... the") still work
  const handleWordTap = (word: string, tile: number) => {
    if (!selectedMove) return;
    const placedAt = usedTiles.indexOf(tile);
    if (placedAt !== -1) {
      takeBackFrom(placedAt); // tapped again: take it back
      return;
    }

    const nextTiles = [...usedTiles, tile];
    setUsedTiles(nextTiles);
    const next = nextTiles.map((i) => currentWords[i]);
    setOrderedWords(next);

    const verseText = selectedMove.verseText ?? selectedMove.name;
    const targetWords = verseText.split(/\s+/).filter(Boolean);

    if (next.join(' ') === verseText) {
      if (timerRef.current) clearInterval(timerRef.current);

      const playerDamage = computeAnimalDamage(
        petKey,
        enemyKey,
        Math.max(35, (verseText.split(/\s+/).length * 5) + selectedMove.power),
        playerLevel,
        milestone,
      );

      const cpuMove = chooseCpuMove(enemyKey);
      const cpuDamage = computeAnimalDamage(enemyKey, petKey, cpuMove.power, milestone, playerLevel);

      setEnemyHp((prev) => Math.max(0, prev - playerDamage.damage));
      setSelectedMoves((prev) =>
        prev.map((item) =>
          item.key === selectedMove.key
            ? { ...item, pp: Math.max(0, item.pp - 1) }
            : item,
        ),
      );

      setLog(`${petName} used ${selectedMove.name} and dealt ${playerDamage.damage} damage.`);

      setTimeout(() => {
        if (Math.random() < 0.5) {
          setPlayerHp((prev) => Math.max(0, prev - cpuDamage.damage));
          setLog(`${cpuMove.name} landed for ${cpuDamage.damage} damage.`);
        } else {
          setLog(`${cpuMove.name} missed the move.`);
        }
      }, 250);

      setTimeout(() => {
        resetTurn();
        setRound((r) => r + 1);

        const afterPlayer = enemyHp - playerDamage.damage;
        const afterEnemy = playerHp - cpuDamage.damage;

        if (afterPlayer <= 0) {
          setBattleEnded(true);
          Alert.alert('Victory!', `${petName} defeated the ${ANIMAL_TYPES[enemyKey].name}.`);
          router.back();
        } else if (afterEnemy <= 0) {
          setBattleEnded(true);
          Alert.alert('Defeat', `${petName} was overwhelmed. Try another round.`);
          router.back();
        }
      }, 700);
    }
  };

  const toggleSelectedMove = (move: BattleMove) => {
    if (selectedMoves.some((m) => m.key === move.key)) {
      setSelectedMoves((prev) => prev.filter((m) => m.key !== move.key));
      return;
    }

    if (selectedMoves.length >= 4) {
      Alert.alert('Verse battle', 'You can only choose 4 moves at a time.');
      return;
    }

    setSelectedMoves((prev) => [...prev, move]);
  };

  const canStartBattle = selectedMoves.length === 4;

  // Once the battle has started you can't just leave: leaving counts as a loss
  // (in ranked battles that will cost leaderboard points).
  const inBattle = !selectionOpen && !battleEnded;
  const confirmForfeit = () =>
    Alert.alert('Forfeit the battle?', 'Leaving now counts as a loss. In ranked battles you will lose points.', [
      { text: 'Keep fighting', style: 'cancel' },
      {
        text: 'Forfeit',
        style: 'destructive',
        onPress: () => {
          setBattleEnded(true);
          router.back();
        },
      },
    ]);
  useEffect(() => {
    if (!inBattle) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmForfeit(); // Android back button asks first
      return true;
    });
    return () => sub.remove();
  }, [inBattle]);

  return (
    <View style={styles.screen}>
      {/* No swipe-back during the battle */}
      <Stack.Screen options={{ gestureEnabled: !inBattle }} />
      {selectionOpen ? (
        <View style={[styles.pad, { flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
            <Text style={styles.pickerBack}>‹ BACK</Text>
          </Pressable>
          <Text style={styles.title}>VERSE BATTLE</Text>
          <Text style={styles.subTitle}>
            {petName} vs {ANIMAL_TYPES[enemyKey].name}
          </Text>
          <MovePicker
            moves={availableMoves}
            selected={selectedMoves}
            onToggle={toggleSelectedMove}
            onStart={() => {
              setSelectionOpen(false);
              setLog('Battle started. Reorder the verse to attack.');
            }}
          />
        </View>
      ) : null}

      {!selectionOpen ? (
        <>
          {/* Mount Sinai arena, like the serpent battle */}
          <View style={{ height: insets.top, backgroundColor: SINAI_SKY }} />
          <SinaiArena
            pet={{
              key: petKey,
              name: petName,
              level: playerLevel,
              hp: playerHp,
              maxHp: getAnimalMaxHealth(playerLevel, petKey),
              outfit: outfitOn(decor, petKey),
              necklace: decor.used.includes('necklace'),
            }}
            enemy={{
              key: enemyKey,
              name: ANIMAL_TYPES[enemyKey].name,
              level: milestone,
              hp: enemyHp,
              maxHp: getAnimalMaxHealth(milestone, enemyKey),
            }}
          />

          <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.pad, { paddingTop: 12, paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.logBox}>
            <Text style={styles.log}>{log}</Text>
            {selectedMove ? <Text style={[styles.timer, timer <= 5 && { color: '#E06A4F' }]}>{`⌛ ${timer}s`}</Text> : null}
          </View>

          {selectedMove ? (
            <View style={styles.challengeBox}>
              <View style={styles.challengeHead}>
                <Text style={styles.moveName} numberOfLines={1}>
                  {selectedMove.name.toUpperCase()}
                </Text>
                <Text style={[styles.kindTag, { backgroundColor: moveColor(selectedMove).main }]}>{selectedMove.verse_ref}</Text>
              </View>

              {showVerse ? (
              <View style={styles.versePaper}>
                <Text style={styles.testTag}>TEST: answer shown for testers only</Text>
                <Text style={styles.versePreview}>
                  {selectedMove.verseText ?? selectedMove.name}
                </Text>
              </View>
              ) : null}

              <Text style={styles.help}>Tap the words in order, from memory. Tap a word again to take it back.</Text>

              <View style={styles.wordRow}>
                {currentWords.map((word, index) => (
                  <Pressable
                    key={`${word}-${index}`}
                    style={({ pressed }) => [
                      styles.wordButton,
                      { backgroundColor: TILE_COLORS[index % TILE_COLORS.length] },
                      usedTiles.includes(index) && styles.wordButtonUsed,
                      pressed && { transform: [{ translateY: 2 }] },
                    ]}
                    onPress={() => handleWordTap(word, index)}
                    accessibilityLabel={usedTiles.includes(index) ? `${word}, placed. Tap to take it back` : word}
                  >
                    <Text style={styles.wordText}>{word}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.progressLabel}>YOUR VERSE</Text>
              <View style={styles.answerRow}>
                {(selectedMove.verseText ?? selectedMove.name)
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((word, index) => (
                    <Pressable
                      key={`${word}-${index}`}
                      disabled={orderedWords[index] === undefined}
                      onPress={() => takeBackFrom(index)}
                      accessibilityLabel={orderedWords[index] ? `${orderedWords[index]}. Tap to take it back` : 'Empty'}
                      style={[
                        styles.answerSlot,
                        orderedWords[index] !== undefined && styles.answerSlotFilled, // same color right or wrong: no hints
                      ]}
                    >
                      <Text style={styles.answerText}>{orderedWords[index] ?? '_'}</Text>
                    </Pressable>
                  ))}
              </View>
            </View>
          ) : (
            <MoveTablets moves={selectedMoves.length > 0 ? selectedMoves : availableMoves} onPick={tryMove} />
          )}

          <Pressable onPress={confirmForfeit} style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <Text style={styles.backText}>FORFEIT</Text>
          </Pressable>
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#2d1e1b',
  },
  pad: {
    paddingHorizontal: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f5d98b',
    textAlign: 'center',
    marginTop: 4,
  },
  subTitle: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  hpBlock: {
    flex: 1,
    backgroundColor: '#4a2d2d',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 4,
  },
  hpLabel: {
    color: '#f5d98b',
    fontWeight: '700',
  },
  hpValue: {
    color: '#fff',
    fontSize: 18,
    marginTop: 6,
  },
  logBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#433E4A',
    borderWidth: 3,
    borderColor: '#1B1612',
    borderBottomWidth: 6,
    borderBottomColor: '#2A2630',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  log: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Montserrat_500Medium',
  },
  pickerBack: {
    fontFamily: 'Silkscreen_700Bold',
    fontSize: 15,
    color: '#E8D9B5',
  },
  timer: {
    fontFamily: 'Silkscreen_700Bold',
    color: '#1B1612',
    backgroundColor: '#FFD23D',
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  selectionBox: {
    backgroundColor: '#3b2c29',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  selectionTitle: {
    color: '#f5d98b',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  selectionSub: {
    color: '#e6d6b3',
    fontSize: 14,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  moveCard: {
    width: '48%',
    backgroundColor: '#f0b54a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  selectedMoveCard: {
    backgroundColor: '#d9c79d',
  },
  moveTitle: {
    color: '#1a120d',
    fontSize: 16,
    fontWeight: '800',
  },
  moveRef: {
    color: '#563d28',
    fontSize: 12,
    marginTop: 4,
  },
  moveDesc: {
    color: '#2d1d14',
    marginTop: 6,
    fontSize: 12,
  },
  movePP: {
    color: '#1a120d',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  confirmButton: {
    backgroundColor: '#d9c79d',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#1a120d',
    fontWeight: '800',
    fontSize: 16,
  },
  backButton: {
    marginTop: 18,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#5A3E2B',
  },
  backText: {
    fontFamily: 'Silkscreen_700Bold',
    color: '#8C7765',
    fontSize: 12,
  },
  healthBarTrack: {
    height: 12,
    backgroundColor: '#251d1b',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 8,
  },
  healthBarFill: {
    height: '100%',
    backgroundColor: '#6edb7a',
  },
  healthBarFillEnemy: {
    height: '100%',
    backgroundColor: '#ff8d6e',
  },
  challengeBox: {
    backgroundColor: '#58525F',
    borderWidth: 3,
    borderColor: '#1B1612',
    borderBottomWidth: 7,
    borderBottomColor: '#2A2630',
    padding: 12,
    marginBottom: 12,
  },
  moveName: {
    flex: 1,
    fontFamily: 'Silkscreen_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  versePaper: {
    backgroundColor: '#F2E6C8',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FF4F79',
    padding: 10,
    marginBottom: 10,
  },
  versePreview: {
    color: '#3A281C',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
  },
  help: {
    color: '#CFC8D6',
    fontSize: 12,
    marginBottom: 10,
    fontFamily: 'Montserrat_500Medium',
  },
  wordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  wordButton: {
    borderWidth: 2,
    borderColor: '#1B1612',
    borderBottomWidth: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  wordText: {
    color: '#1B1612',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
  },
  progressLabel: {
    marginTop: 14,
    fontFamily: 'Silkscreen_700Bold',
    fontSize: 11,
    color: '#F5C542',
    letterSpacing: 1,
  },
  answerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#2E2A34',
    borderWidth: 2,
    borderColor: '#F5C542',
  },
  answerSlot: {
    minWidth: 40,
    minHeight: 32,
    paddingHorizontal: 6,
    backgroundColor: '#433E4A',
    borderWidth: 2,
    borderColor: '#1B1612',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerSlotFilled: {
    backgroundColor: '#F2E6C8',
  },
  testTag: {
    fontFamily: 'Silkscreen_700Bold',
    fontSize: 9,
    color: '#FF4F79',
    marginBottom: 4,
  },
  wordButtonUsed: {
    opacity: 0.25,
  },
  challengeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  kindTag: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 11,
    color: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  answerText: {
    color: '#1B1612',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
  },
});