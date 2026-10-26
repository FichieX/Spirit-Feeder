import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

  const animalId = Number(params.animalId) || 1;
  const petKey = (PET_BY_ANIMAL[animalId] ?? 'donkey') as AnimalKey;
  const playerLevel = Number(params.level) || 1;
  const milestone = Number(params.milestone) || 5;
  const petName = (params.petName || 'Your pet').toString();

  const enemyKey: AnimalKey = useMemo(() => {
    const order: AnimalKey[] = ['lion', 'donkey', 'camel', 'raven', 'dove', 'fish'];
    const idx = order.indexOf(petKey);
    return order[(idx + 1 + (milestone % order.length)) % order.length];
  }, [milestone, petKey]);

  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [enemyHp, setEnemyHp] = useState(PLAYER_MAX_HP);
  const [log, setLog] = useState('Choose 4 moves for the battle, or use all unlocked moves if you have fewer than 5.');
  const [selectedMove, setSelectedMove] = useState<BattleMove | null>(null);
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [orderedWords, setOrderedWords] = useState<string[]>([]);
  const [timer, setTimer] = useState(12);
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
    setTimer(12);
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
  };

  const tryMove = (move: BattleMove) => {
    if (move.pp <= 0) {
      Alert.alert('PP depleted', `${move.name} has no uses left this battle.`);
      return;
    }

    const verseText = move.verseText ?? move.name;

    setSelectedMove(move);
    setCurrentWords(scrambleWords(verseText));
    setTimer(12);
    setLog(`Reorder the verse for: ${move.name}`);
  };

  const handleWordTap = (word: string) => {
    if (!selectedMove) return;
    if (orderedWords.includes(word)) return;

    const next = [...orderedWords, word];
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

        if (enemyHp - playerDamage.damage <= 0) {
          setBattleEnded(true);
          Alert.alert('Victory!', `${petName} defeated the ${ANIMAL_TYPES[enemyKey].name}.`);
          router.back();
        } else if (playerHp <= cpuDamage.damage) {
          setBattleEnded(true);
          Alert.alert('Defeat', `${petName} was overwhelmed. Try another round.`);
          router.back();
        }
      }, 700);
    }
  };

  const toggleSelectedMove = (move: BattleMove) => {
    if (selectedMoves.some((item) => item.key === move.key)) {
      setSelectedMoves((prev) => prev.filter((item) => item.key !== move.key));
      return;
    }

    if (selectedMoves.length >= 4) {
      Alert.alert('Verse battle', 'You can only choose 4 moves at a time.');
      return;
    }

    setSelectedMoves((prev) => [...prev, move]);
  };

  const playerMaxHp = getAnimalMaxHealth(playerLevel, petKey);
  const enemyMaxHp = getAnimalMaxHealth(milestone, enemyKey);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>VERSE BATTLE</Text>
      <Text style={styles.subTitle}>
        {petName} vs {ANIMAL_TYPES[enemyKey].name}
      </Text>

      {selectionOpen ? (
        <View style={styles.selectionBox}>
          <Text style={styles.selectionTitle}>Choose 4 moves</Text>
          <Text style={styles.selectionSub}>Pick 4 memorised verse moves from your unlocked pool.</Text>

          <View style={styles.grid}>
            {availableMoves.map((move) => (
              <Pressable
                key={move.key}
                onPress={() => toggleSelectedMove(move)}
                style={[
                  styles.moveCard,
                  selectedMoves.some((item) => item.key === move.key) && styles.selectedMoveCard,
                ]}
              >
                <Text style={styles.moveTitle}>{move.name}</Text>
                <Text style={styles.moveRef}>{move.verse_ref}</Text>
                <Text style={styles.moveDesc}>{move.description}</Text>
                <Text style={styles.movePP}>
                  {move.pp}/{move.maxPp} PP
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.confirmButton}
            onPress={() => {
              if (selectedMoves.length === 0) {
                Alert.alert('Verse battle', 'Choose at least 1 move before starting.');
                return;
              }
              setSelectionOpen(false);
              setLog('Battle started. Reorder the verse to attack.');
            }}
          >
            <Text style={styles.confirmButtonText}>Start battle</Text>
          </Pressable>
        </View>
      ) : null}

      {!selectionOpen ? (
        <>
          <View style={styles.statusBar}>
            <View style={styles.hpBlock}>
              <Text style={styles.hpLabel}>{petName}</Text>
              <Text style={styles.hpValue}>
                {Math.max(0, Math.round(playerHp))}/{playerMaxHp}
              </Text>
              <View style={styles.healthBarTrack}>
                <View
                  style={[
                    styles.healthBarFill,
                    {
                      width: `${Math.max(0, Math.min(100, (playerHp / playerMaxHp) * 100))}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.hpBlock}>
              <Text style={styles.hpLabel}>{ANIMAL_TYPES[enemyKey].name}</Text>
              <Text style={styles.hpValue}>
                {Math.max(0, Math.round(enemyHp))}/{enemyMaxHp}
              </Text>
              <View style={styles.healthBarTrack}>
                <View
                  style={[
                    styles.healthBarFillEnemy,
                    {
                      width: `${Math.max(0, Math.min(100, (enemyHp / enemyMaxHp) * 100))}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          <Text style={styles.log}>{log}</Text>
          <Text style={styles.timer}>Time: {timer}s</Text>

          {selectedMove ? (
            <View style={styles.challengeBox}>
              <Text style={styles.moveName}>{selectedMove.name}</Text>
              <Text style={styles.help}>Reorder the verse itself, not the move name.</Text>

              <View style={styles.wordRow}>
                {currentWords.map((word, index) => (
                  <Pressable
                    key={`${word}-${index}`}
                    style={styles.wordButton}
                    onPress={() => handleWordTap(word)}
                  >
                    <Text style={styles.wordText}>{word}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.progressLabel}>Answer:</Text>
              <View style={styles.answerRow}>
                {(selectedMove.verseText ?? selectedMove.name)
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((word, index) => (
                    <View
                      key={`${word}-${index}`}
                      style={[
                        styles.answerSlot,
                        orderedWords[index] === word && styles.answerSlotFilled,
                      ]}
                    >
                      <Text style={styles.answerText}>{orderedWords[index] ?? '_'}</Text>
                    </View>
                  ))}
              </View>
            </View>
          ) : (
            <View style={styles.moveGrid}>
              {selectedMoves.length > 0 ? (
                selectedMoves.map((move) => (
                  <Pressable key={move.key} style={styles.moveCard} onPress={() => tryMove(move)}>
                    <Text style={styles.moveTitle}>{move.name}</Text>
                    <Text style={styles.moveRef}>{move.verse_ref}</Text>
                    <Text style={styles.moveDesc}>{move.description}</Text>
                    <Text style={styles.movePP}>
                      {move.pp}/{move.maxPp} PP
                    </Text>
                  </Pressable>
                ))
              ) : (
                availableMoves.map((move) => (
                  <Pressable key={move.key} style={styles.moveCard} onPress={() => tryMove(move)}>
                    <Text style={styles.moveTitle}>{move.name}</Text>
                    <Text style={styles.moveRef}>{move.verse_ref}</Text>
                    <Text style={styles.moveDesc}>{move.description}</Text>
                    <Text style={styles.movePP}>
                      {move.pp}/{move.maxPp} PP
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          )}

          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#2d1e1b',
    padding: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f5d98b',
    textAlign: 'center',
    marginTop: 24,
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
  log: {
    color: '#f2ebd5',
    fontSize: 15,
    marginBottom: 8,
  },
  timer: {
    color: '#ffb454',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
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
  challengeBox: {
    backgroundColor: '#3b2c29',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  moveName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f7d56d',
    marginBottom: 6,
  },
  help: {
    color: '#e6d6b3',
    marginBottom: 8,
  },
  wordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordButton: {
    backgroundColor: '#8d5e34',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    margin: 4,
  },
  wordText: {
    color: '#fff',
    fontWeight: '700',
  },
  progressLabel: {
    marginTop: 10,
    color: '#f5d98b',
    fontWeight: '700',
  },
  answerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  answerSlot: {
    minWidth: 44,
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: '#1d1a1b',
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerSlotFilled: {
    backgroundColor: '#468c52',
  },
  answerText: {
    color: '#fff',
    fontWeight: '700',
  },
  moveGrid: {
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
  confirmButtonText: {
    color: '#1a120d',
    fontWeight: '800',
    fontSize: 16,
  },
  backButton: {
    marginTop: 'auto',
    backgroundColor: '#d9c79d',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backText: {
    color: '#1a120d',
    fontWeight: '800',
    fontSize: 16,
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
});