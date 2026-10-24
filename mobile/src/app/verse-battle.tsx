import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PET_BY_ANIMAL } from '../pets/forms';
import { ANIMAL_TYPES, chooseCpuMove, computeAnimalDamage, getAnimalMoves, scrambleWords, type AnimalKey, type AnimalMove } from '../battle/animals';

const PLAYER_HEARTS = 3;

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

  const [playerHp, setPlayerHp] = useState(PLAYER_HEARTS);
  const [enemyHp, setEnemyHp] = useState(PLAYER_HEARTS);
  const [log, setLog] = useState('Choose a move and rebuild the scripture order to attack.');
  const [selectedMove, setSelectedMove] = useState<AnimalMove | null>(null);
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [orderedWords, setOrderedWords] = useState<string[]>([]);
  const [timer, setTimer] = useState(12);
  const [round, setRound] = useState(1);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!selectedMove) return;

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
  }, [selectedMove, round]);

  const resetTurn = () => {
    setSelectedMove(null);
    setCurrentWords([]);
    setOrderedWords([]);
    setTimer(12);
  };

  const handleMiss = () => {
    setLog(`Time up! ${petName} missed the verse order and skipped the turn.`);
    const cpuMove = chooseCpuMove(enemyKey);
    const cpuDamage = computeAnimalDamage(enemyKey, petKey, cpuMove.power, milestone, playerLevel);
    setPlayerHp((prev) => Math.max(0, prev - 1));
    setTimeout(() => {
      setLog(`${cpuMove.name} hit for ${cpuDamage.damage} damage. Pick your next move.`);
    }, 200);
  };

  const tryMove = (move: AnimalMove) => {
    setSelectedMove(move);
    setCurrentWords(scrambleWords(move.name));
    setTimer(12);
    setLog(`Reorder the words for: ${move.name}`);
  };

  const handleWordTap = (word: string) => {
    if (!selectedMove) return;
    if (orderedWords.includes(word)) return;

    const next = [...orderedWords, word];
    setOrderedWords(next);

    const targetWords = selectedMove.name.split(/\s+/).filter(Boolean);

    if (next.join(' ') === selectedMove.name) {
      if (timerRef.current) clearInterval(timerRef.current);

      const playerDamage = computeAnimalDamage(petKey, enemyKey, selectedMove.power, playerLevel, milestone);
      const cpuMove = chooseCpuMove(enemyKey);
      const cpuDamage = computeAnimalDamage(enemyKey, petKey, cpuMove.power, milestone, playerLevel);

      setEnemyHp((prev) => Math.max(0, prev - playerDamage.damage));
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
          Alert.alert('Victory!', `${petName} defeated the ${ANIMAL_TYPES[enemyKey].name}.`);
          router.back();
        } else if (playerHp <= 1) {
          Alert.alert('Defeat', `${petName} was overwhelmed. Try another round.`);
          router.back();
        }
      }, 700);
    }
  };

  const availableMoves = getAnimalMoves(petKey);
  const targetWords = selectedMove ? selectedMove.name.split(/\s+/).filter(Boolean) : [];

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>VERSE BATTLE</Text>
      <Text style={styles.subTitle}>{petName} vs {ANIMAL_TYPES[enemyKey].name}</Text>

      <View style={styles.statusBar}>
        <View style={styles.hpBlock}>
          <Text style={styles.hpLabel}>{petName}</Text>
          <Text style={styles.hpValue}>{'❤'.repeat(playerHp)}{'.'.repeat(3 - playerHp)}</Text>
        </View>
        <View style={styles.hpBlock}>
          <Text style={styles.hpLabel}>{ANIMAL_TYPES[enemyKey].name}</Text>
          <Text style={styles.hpValue}>{'❤'.repeat(enemyHp)}{'.'.repeat(3 - enemyHp)}</Text>
        </View>
      </View>

      <Text style={styles.log}>{log}</Text>
      <Text style={styles.timer}>Time: {timer}s</Text>

      {selectedMove ? (
        <View style={styles.challengeBox}>
          <Text style={styles.moveName}>{selectedMove.name}</Text>
          <Text style={styles.help}>Tap the words in the correct order.</Text>

          <View style={styles.wordRow}>
            {currentWords.map((word, index) => (
              <Pressable key={`${word}-${index}`} style={styles.wordButton} onPress={() => handleWordTap(word)}>
                <Text style={styles.wordText}>{word}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.progressLabel}>Answer:</View>
          <View style={styles.answerRow}>
            {targetWords.map((word, index) => (
              <View key={`${word}-${index}`} style={[styles.answerSlot, orderedWords[index] === word && styles.answerSlotFilled]}>
                <Text style={styles.answerText}>{orderedWords[index] ?? '_'}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {!selectedMove ? (
        <View style={styles.moveGrid}>
          {availableMoves.map((move) => (
            <Pressable key={move.key} style={styles.moveCard} onPress={() => tryMove(move)}>
              <Text style={styles.moveTitle}>{move.name}</Text>
              <Text style={styles.moveRef}>{move.verse_ref}</Text>
              <Text style={styles.moveDesc}>{move.description}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#2d1e1b', padding: 18 },
  title: { fontSize: 28, fontWeight: '900', color: '#f5d98b', textAlign: 'center', marginTop: 24 },
  subTitle: { fontSize: 18, color: 'white', textAlign: 'center', marginBottom: 12 },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  hpBlock: { flex: 1, backgroundColor: '#4a2d2d', borderRadius: 12, padding: 10, marginHorizontal: 4 },
  hpLabel: { color: '#f5d98b', fontWeight: '700' },
  hpValue: { color: '#fff', fontSize: 18, marginTop: 6 },
  log: { color: '#f2ebd5', fontSize: 15, marginBottom: 8 },
  timer: { color: '#ffb454', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  challengeBox: { backgroundColor: '#3b2c29', borderRadius: 14, padding: 12, marginBottom: 12 },
  moveName: { fontSize: 22, fontWeight: '800', color: '#f7d56d', marginBottom: 6 },
  help: { color: '#e6d6b3', marginBottom: 8 },
  wordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wordButton: { backgroundColor: '#8d5e34', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, margin: 4 },
  wordText: { color: '#fff', fontWeight: '700' },
  progressLabel: { marginTop: 10, color: '#f5d98b', fontWeight: '700' },
  answerRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  answerSlot: { minWidth: 44, minHeight: 36, borderRadius: 8, backgroundColor: '#1d1a1b', margin: 4, alignItems: 'center', justifyContent: 'center' },
  answerSlotFilled: { backgroundColor: '#468c52' },
  answerText: { color: '#fff', fontWeight: '700' },
  moveGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  moveCard: { width: '48%', backgroundColor: '#f0b54a', borderRadius: 12, padding: 12, marginBottom: 10 },
  moveTitle: { color: '#1a120d', fontSize: 16, fontWeight: '800' },
  moveRef: { color: '#563d28', fontSize: 12, marginTop: 4 },
  moveDesc: { color: '#2d1d14', marginTop: 6, fontSize: 12 },
  backButton: { marginTop: 'auto', backgroundColor: '#d9c79d', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  backText: { color: '#1a120d', fontWeight: '800', fontSize: 16 },
});