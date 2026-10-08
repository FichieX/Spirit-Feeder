import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  REVIEW_DAYS,
  VERSES,
  WATER_PER_DAY,
  choicesFor,
  dueVerses,
  finishVerse,
  isMastered,
  learnedVerses,
  loadMemory,
  nextNewVerse,
  pickBlanks,
  same,
  saveMemory,
  scrambled,
  tokenize,
  waterLeftToday,
  type Kind,
  type MemoryState,
  type Token,
  type Verse,
} from '../../memorize/verses';
import { completeMemorize } from '../../api/memorize';

// ---------- Colors ----------
const BG = '#2B211B';
const CARD = '#3D2B22';
const INK = '#1B1612';
const PAPER = '#F0E1B2';
const PAPER_INK = '#3A281C';
const GOLD = '#D9A441';
const PARCHMENT = '#E8D9B5';
const DIM = '#8C7765';
const GREEN = '#5E8A4A';
const WATER = require('../../../assets/images/food_water.png');

// The four steps for one verse
const STEPS = ['Read it', 'Fill a few words', 'Fill more words', 'Put the words in order'];

type Props = {
  visible: boolean;
  username?: string;
  userId: number;
  onClose: () => void;
  onWater: () => void; // +1 water into the food basket
  onXp: (gained: number) => void; // XP was added on the server
};

type Session = {
  verse: Verse;
  kind: Kind;
  tokens: Token[];
  step: number; // 0..3
  round1: number[]; // blanks in step 1 (they stay hidden in step 2)
  blanks: number[]; // blanks in the current step
  filled: number; // how many blanks are filled so far
  choices: string[];
  tiles: { id: number; text: string }[];
  built: number[]; // token indexes placed in step 3
  mistakes: number;
};

type Result = { kind: Kind; water: boolean; waterFull: boolean; xp: number | null; xpError: string; leveledUp: boolean; mistakes: number; nextDays: number | null };

// Verse memorization: review due verses, learn the next new one, or practice for XP
export default function MemorizeScreen({ visible, username, userId, onClose, onWater, onXp }: Props) {
  const insets = useSafeAreaInsets();
  const [mem, setMem] = useState<MemoryState | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setSession(null);
    setResult(null);
    loadMemory(username).then(setMem);
  }, [visible, username]);

  const due = useMemo(() => (mem ? dueVerses(mem) : []), [mem]);
  const next = mem ? nextNewVerse(mem) : null;
  const learned = mem ? learnedVerses(mem) : [];
  const practice = learned.filter((v) => !due.includes(v));
  const waterLeft = mem ? waterLeftToday(mem) : WATER_PER_DAY;

  const wrong = () => {
    shake.setValue(0);
    Animated.sequence([10, -10, 6, -6, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 45, useNativeDriver: true }))).start();
    setSession((s) => (s ? { ...s, mistakes: s.mistakes + 1 } : s));
  };

  // ---------- Start / steps ----------
  const start = (verse: Verse, kind: Kind) => {
    const tokens = tokenize(verse.text);
    setResult(null);
    setSession({ verse, kind, tokens, step: 0, round1: [], blanks: [], filled: 0, choices: [], tiles: [], built: [], mistakes: 0 });
  };

  const goStep = (s: Session, step: number): Session => {
    if (step === 1 || step === 2) {
      const blanks = step === 1 ? pickBlanks(s.tokens, 1 / 3) : pickBlanks(s.tokens, 2 / 3, s.round1);
      return {
        ...s,
        step,
        round1: step === 1 ? blanks : s.round1,
        blanks,
        filled: 0,
        choices: choicesFor(s.tokens, blanks[0]),
      };
    }
    if (step === 3) return { ...s, step, tiles: scrambled(s.tokens), built: [] };
    return { ...s, step };
  };

  const pickWord = (w: string) => {
    if (!session) return;
    const idx = session.blanks[session.filled];
    if (!same(w, session.tokens[idx].word)) return wrong();
    const filled = session.filled + 1;
    if (filled >= session.blanks.length) {
      setSession(goStep(session, session.step + 1));
    } else {
      setSession({ ...session, filled, choices: choicesFor(session.tokens, session.blanks[filled]) });
    }
  };

  const pickTile = (tile: { id: number; text: string }) => {
    if (!session) return;
    const wantIdx = session.built.length;
    // Any tile with the same text counts (a verse can repeat a word)
    if (tile.text !== session.tokens[wantIdx].full) return wrong();
    const built = [...session.built, wantIdx];
    const tiles = session.tiles.filter((t) => t.id !== tile.id);
    if (built.length >= session.tokens.length) {
      setSession({ ...session, built, tiles });
      finish({ ...session, built, tiles });
    } else {
      setSession({ ...session, built, tiles });
    }
  };

  // ---------- Finish: save progress, water, XP ----------
  const finish = async (s: Session) => {
    if (!mem || busy) return;
    setBusy(true);
    const { state, water } = finishVerse(mem, s.verse.ref, s.kind);
    setMem(state);
    await saveMemory(username, state);
    if (water) onWater();
    const p = state.verses[s.verse.ref];
    const nextDays = s.kind === 'practice' ? null : REVIEW_DAYS[Math.min(p.stage, REVIEW_DAYS.length - 1)];
    let xp: number | null = null;
    let xpError = '';
    let leveledUp = false;
    if (userId) {
      try {
        const r = await completeMemorize(userId, s.verse.ref, s.kind);
        xp = r.xp_gained;
        leveledUp = r.leveled_up;
        onXp(r.xp_gained);
      } catch (err: any) {
        xpError = err?.message || 'No XP this time.';
      }
    }
    setResult({ kind: s.kind, water, waterFull: s.kind !== 'practice' && !water, xp, xpError, leveledUp, mistakes: s.mistakes, nextDays });
    setBusy(false);
  };

  // ---------- Pieces ----------
  const VerseText = ({ s }: { s: Session }) => {
    const hidden = new Set(s.step === 3 ? s.tokens.map((_, i) => i) : s.blanks);
    const current = s.step === 1 || s.step === 2 ? s.blanks[s.filled] : s.step === 3 ? s.built.length : -1;
    return (
      <Text style={styles.verse}>
        {s.tokens.map((t, i) => {
          const isHidden = s.step > 0 && hidden.has(i);
          const done = s.step === 3 ? i < s.built.length : isHidden && s.blanks.indexOf(i) < s.filled;
          if (!isHidden || done) {
            return (
              <Text key={i} style={done ? styles.filledWord : undefined}>
                {t.full}
                {i < s.tokens.length - 1 ? ' ' : ''}
              </Text>
            );
          }
          return (
            <Text key={i}>
              {t.before}
              <Text style={[styles.blank, i === current && styles.blankNow]}>{'_'.repeat(Math.max(3, t.word.length))}</Text>
              {t.after}
              {i < s.tokens.length - 1 ? ' ' : ''}
            </Text>
          );
        })}
      </Text>
    );
  };

  const Stars = ({ mistakes }: { mistakes: number }) => {
    const n = mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1;
    return <Text style={styles.stars}>{'★'.repeat(n) + '☆'.repeat(3 - n)}</Text>;
  };

  const Row = ({ v, label, kind }: { v: Verse; label: string; kind: Kind }) => {
    const p = mem?.verses[v.ref];
    return (
      <Pressable onPress={() => start(v, kind)} style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityRole="button">
        <View style={{ flex: 1 }}>
          <Text style={styles.rowRef}>{v.ref}</Text>
          <Text style={styles.rowText} numberOfLines={1}>
            {v.text}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.rowLabel}>{label}</Text>
          {p ? <Text style={styles.rowStage}>{isMastered(p) ? 'MASTERED' : `${'●'.repeat(p.stage + 1)}${'○'.repeat(Math.max(0, 3 - p.stage))}`}</Text> : null}
        </View>
      </Pressable>
    );
  };

  // ---------- Screens ----------
  const hub = (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
      <Text style={styles.title}>MEMORIZE</Text>
      <Text style={styles.sub}>{`${learned.length} / ${VERSES.length} verses learned`}</Text>

      <View style={styles.waterBox}>
        {Array.from({ length: WATER_PER_DAY }, (_, i) => (
          <Image key={i} source={WATER} style={[styles.waterIcon, i >= waterLeft && { opacity: 0.25 }]} />
        ))}
        <Text style={styles.waterText}>
          {waterLeft > 0 ? `${waterLeft} water left to earn today` : 'All water earned today. Practice still gives XP!'}
        </Text>
      </View>

      {due.length ? (
        <>
          <Text style={styles.section}>{`REVIEW (${due.length})`}</Text>
          {due.map((v) => (
            <Row key={v.ref} v={v} label="REVIEW" kind="review" />
          ))}
        </>
      ) : null}

      <Text style={styles.section}>NEW VERSE</Text>
      {next ? <Row v={next} label="LEARN" kind="new" /> : <Text style={styles.empty}>You've learned every verse! Keep reviewing to master them.</Text>}

      {practice.length ? (
        <>
          <Text style={styles.section}>PRACTICE (XP ONLY)</Text>
          {practice.map((v) => (
            <Row key={v.ref} v={v} label="PRACTICE" kind="practice" />
          ))}
        </>
      ) : null}
    </ScrollView>
  );

  const sessionView = session ? (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
      <View style={styles.stepRow}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.stepDot, i <= session.step && styles.stepDotOn]} />
        ))}
      </View>
      <Text style={styles.stepName}>{`STEP ${session.step + 1}: ${STEPS[session.step].toUpperCase()}`}</Text>

      <Animated.View style={[styles.paper, { transform: [{ translateX: shake }] }]}>
        <Text style={styles.paperRef}>{session.verse.ref}</Text>
        <VerseText s={session} />
      </Animated.View>

      {session.step === 0 ? (
        <>
          <Text style={styles.hint}>Read it slowly, out loud if you can. Then try it from memory!</Text>
          <Pressable onPress={() => setSession(goStep(session, 1))} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>I'VE READ IT</Text>
          </Pressable>
        </>
      ) : null}

      {session.step === 1 || session.step === 2 ? (
        <>
          <Text style={styles.hint}>{`Tap the missing word (${session.filled + 1} of ${session.blanks.length})`}</Text>
          <Animated.View style={[styles.choiceRow, { transform: [{ translateX: shake }] }]}>
            {session.choices.map((c) => (
              <Pressable key={c} onPress={() => pickWord(c)} style={({ pressed }) => [styles.choice, pressed && styles.pressed]}>
                <Text style={styles.choiceText}>{c}</Text>
              </Pressable>
            ))}
          </Animated.View>
        </>
      ) : null}

      {session.step === 3 ? (
        <>
          <Text style={styles.hint}>Tap the words in the right order</Text>
          <Animated.View style={[styles.tiles, { transform: [{ translateX: shake }] }]}>
            {session.tiles.map((t) => (
              <Pressable key={t.id} onPress={() => pickTile(t)} disabled={busy} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
                <Text style={styles.tileText}>{t.text}</Text>
              </Pressable>
            ))}
          </Animated.View>
        </>
      ) : null}

      <Text style={styles.mistakes}>{`Mistakes: ${session.mistakes}`}</Text>
    </ScrollView>
  ) : null;

  const resultView = result && session ? (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30, alignItems: 'stretch' }}>
      <Text style={[styles.title, { marginTop: 20 }]}>
        {result.kind === 'new' ? 'MEMORIZED!' : result.kind === 'review' ? 'REVIEWED!' : 'PRACTICED!'}
      </Text>
      <Stars mistakes={result.mistakes} />
      <View style={styles.paper}>
        <Text style={styles.paperRef}>{session.verse.ref}</Text>
        <Text style={styles.verse}>{session.verse.text}</Text>
      </View>

      <View style={styles.rewards}>
        {result.water ? (
          <View style={styles.rewardLine}>
            <Image source={WATER} style={styles.waterIcon} />
            <Text style={styles.rewardText}>+1 water in your food basket</Text>
          </View>
        ) : null}
        {result.waterFull ? <Text style={styles.rewardDim}>{`Today's ${WATER_PER_DAY} waters are already earned.`}</Text> : null}
        {result.xp !== null ? <Text style={styles.rewardText}>{`+${result.xp} XP${result.leveledUp ? '  ·  LEVEL UP!' : ''}`}</Text> : null}
        {result.xpError ? <Text style={styles.rewardDim}>{result.xpError}</Text> : null}
        {result.nextDays ? (
          <Text style={styles.rewardDim}>{`Review it again in ${result.nextDays} day${result.nextDays > 1 ? 's' : ''}.`}</Text>
        ) : null}
      </View>

      {next && result.kind !== 'practice' ? (
        <Pressable onPress={() => start(next, 'new')} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
          <Text style={styles.primaryText}>NEXT VERSE</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={() => start(session.verse, 'practice')} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
        <Text style={styles.secondaryText}>PRACTICE AGAIN (XP)</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          setSession(null);
          setResult(null);
        }}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>ALL VERSES</Text>
      </Pressable>
    </ScrollView>
  ) : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top + 6 }]}>
        <View style={styles.topBar}>
          {session && !result ? (
            <Pressable onPress={() => setSession(null)} hitSlop={12} accessibilityRole="button">
              <Text style={styles.back}>‹ VERSES</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable onPress={onClose} hitSlop={14} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.close}>X</Text>
          </Pressable>
        </View>
        {result ? resultView : session ? sessionView : hub}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  topBar: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  back: { fontFamily: 'Silkscreen_700Bold', fontSize: 15, color: PARCHMENT },
  close: { fontFamily: 'Silkscreen_700Bold', fontSize: 22, color: '#C9B48A' },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 26, color: GOLD, textAlign: 'center' },
  sub: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: DIM, textAlign: 'center', marginTop: 4 },
  waterBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CARD, borderWidth: 2, borderColor: INK, padding: 10, marginTop: 14 },
  waterIcon: { width: 30, height: 30 },
  waterText: { flex: 1, marginLeft: 6, fontFamily: 'Montserrat_500Medium', fontSize: 13, color: PARCHMENT },
  section: { fontFamily: 'Silkscreen_700Bold', fontSize: 14, color: PARCHMENT, marginTop: 20, marginBottom: 8 },
  empty: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: DIM },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: CARD, borderWidth: 2, borderColor: INK, borderBottomWidth: 4, padding: 12, marginBottom: 8 },
  rowRef: { fontFamily: 'Silkscreen_700Bold', fontSize: 13, color: GOLD },
  rowText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: PARCHMENT, marginTop: 2 },
  rowLabel: { fontFamily: 'Silkscreen_700Bold', fontSize: 11, color: INK, backgroundColor: GOLD, paddingHorizontal: 6, paddingVertical: 2 },
  rowStage: { fontFamily: 'Montserrat_500Medium', fontSize: 11, color: DIM, marginTop: 4 },
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  stepDot: { width: 34, height: 8, backgroundColor: '#5A3E2B' },
  stepDotOn: { backgroundColor: GOLD },
  stepName: { fontFamily: 'Silkscreen_700Bold', fontSize: 13, color: PARCHMENT, textAlign: 'center', marginTop: 8 },
  paper: { backgroundColor: PAPER, borderWidth: 3, borderColor: INK, padding: 18, marginTop: 14 },
  paperRef: { fontFamily: 'Silkscreen_700Bold', fontSize: 13, color: '#7A2626', marginBottom: 8 },
  verse: { fontFamily: 'Montserrat_500Medium', fontSize: 19, lineHeight: 32, color: PAPER_INK },
  blank: { color: '#B79A63', letterSpacing: 1 },
  blankNow: { color: '#7A2626', backgroundColor: '#E8C35A' },
  filledWord: { color: GREEN, fontFamily: 'Montserrat_700Bold' },
  hint: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: DIM, textAlign: 'center', marginTop: 16, marginBottom: 10 },
  choiceRow: { gap: 10 },
  choice: { backgroundColor: GOLD, borderWidth: 3, borderColor: '#8A6420', paddingVertical: 12, alignItems: 'center' },
  choiceText: { fontFamily: 'Montserrat_700Bold', fontSize: 17, color: INK },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tile: { backgroundColor: CARD, borderWidth: 2, borderColor: GOLD, borderBottomWidth: 4, paddingVertical: 8, paddingHorizontal: 12 },
  tileText: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: PARCHMENT },
  mistakes: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: DIM, textAlign: 'center', marginTop: 18 },
  stars: { fontSize: 34, color: GOLD, textAlign: 'center', marginTop: 6 },
  rewards: { backgroundColor: CARD, borderWidth: 2, borderColor: INK, padding: 14, marginTop: 14, gap: 8 },
  rewardLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rewardText: { fontFamily: 'Silkscreen_700Bold', fontSize: 15, color: GOLD },
  rewardDim: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: DIM },
  primary: { marginTop: 16, height: 56, backgroundColor: '#F2BE4A', borderWidth: 3, borderColor: INK, borderBottomWidth: 7, borderBottomColor: '#B07E1E', alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: 'Silkscreen_700Bold', fontSize: 17, color: INK, letterSpacing: 1 },
  secondary: { marginTop: 10, height: 48, backgroundColor: CARD, borderWidth: 2, borderColor: INK, borderBottomWidth: 4, borderBottomColor: '#5A3E2B', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: 'Silkscreen_700Bold', fontSize: 14, color: PARCHMENT },
  pressed: { transform: [{ translateY: 2 }], opacity: 0.85 },
});
