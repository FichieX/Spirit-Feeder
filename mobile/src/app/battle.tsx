import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sprite, { PreloadSheets } from '../components/pets/Sprite';
import { PET_BY_ANIMAL, PET_SCALE, animsFor, dressed, type Anim } from '../pets/forms';
import { pickQuestions, choicesFor, loadSeen, markSeen, type Question } from '../battle/questions';
import { POWERS, isRarePower, loadPowers, savePowers, type PowerBag, type PowerKey } from '../battle/powerups';
import { rollReward, type Reward } from '../battle/rewards';
import { decorItem, loadDecor, outfitOn, saveDecor, type DecorState } from '../decor/items';
import { VICTORY_VERSES, COMFORT_VERSES, pickVerse, type Verse } from '../battle/verses';
import { reportSerpent, type SerpentXp } from '../api/serpent';

// ---------- Settings ----------
const HEARTS = 3; // hearts for each side
const TIME_MS = 15000; // time to answer each question
const XP_LOSS = 0.3; // losing takes away 30% of the XP bar

// ---------- Colors (dark academia) ----------
const INK = '#1B1612';
const SKY = '#181422';
const MAHOGANY = '#3A2219';
const MAHOGANY_DARK = '#24150F';
const GOLD = '#D9A441';
const PARCHMENT = '#E8D9B5';
const DIM = '#8C7765';
const EMBER = '#E06A4F';
const GREEN = '#7FA36B';
const FROST = '#7FB7D9';

// ---------- Art ----------
// The arena is 128 x 112 pixel-art pixels. Everything below is placed in those pixels.
const ARENA = require('../../assets/images/battle_arena.png');
const ARENA_W = 128;
const ARENA_H = 112;
const SERPENT_SPOT = { x: 96, y: 67 }; // where the serpent's belly sits
const PET_SPOT = { x: 34, y: 105 }; // where the pet's feet stand
const PET_SIZE = 0.68; // pet size compared to the arena

const SERPENT_W = 56;
const SERPENT_H = 52;
const SERPENT: Record<'idle' | 'attack' | 'hurt' | 'defeat', Anim> = {
  idle: { sheet: require('../../assets/images/serpent_idle.png'), ms: [500, 120, 120, 120, 400, 600] },
  attack: { sheet: require('../../assets/images/serpent_attack.png'), ms: [140, 110, 80, 220, 140, 220] },
  hurt: { sheet: require('../../assets/images/serpent_hurt.png'), ms: [110, 110, 110, 220] },
  defeat: { sheet: require('../../assets/images/serpent_defeat.png'), ms: [160, 160, 180, 220, 260, 700] },
};
const HEART = require('../../assets/images/icon_heart.png');

type Phase = 'intro' | 'ask' | 'resolve' | 'won' | 'lost';
type SerpentMove = keyof typeof SERPENT;
type PetMove = 'idle' | 'tap' | 'die';

function Hearts({ count }: { count: number }) {
  return (
    <View style={styles.hearts}>
      {Array.from({ length: HEARTS }, (_, i) => (
        <Image key={i} source={HEART} style={[styles.heart, i >= count && styles.heartLost]} />
      ))}
    </View>
  );
}

export default function Battle() {
  const params = useLocalSearchParams<{
    username?: string;
    userId?: string;
    animalId?: string;
    level?: string; // the pet's level
    milestone?: string; // which serpent (5, 10, 15 ...)
    petName?: string;
  }>();
  const { username, userId } = params;
  const animalId = Number(params.animalId) || 1;
  const level = Number(params.level) || 5;
  const milestone = Number(params.milestone) || Math.max(5, Math.floor(level / 5) * 5);
  const petName = (params.petName || 'Your pet').toString();
  const petKey = PET_BY_ANIMAL[animalId] ?? 'donkey';
  const anims = animsFor(petKey, level);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const k = width / ARENA_W; // screen points per arena pixel
  const arenaH = ARENA_H * k;

  // ---------- Battle state ----------
  // Random questions that get harder every 2 questions (and every serpent starts harder).
  // First a quick pick, then swapped for one that skips questions this player has already seen.
  const [questions, setQuestions] = useState<Question[]>(() => pickQuestions(milestone, 12));
  const [qIndex, setQIndex] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    loadSeen(username).then((seen) => {
      if (!started.current) setQuestions(pickQuestions(milestone, 12, seen));
    });
  }, [milestone, username]);
  const question = questions[qIndex % questions.length];
  const choices = useMemo(() => choicesFor(question), [question]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [petHp, setPetHp] = useState(HEARTS);
  const [serpentHp, setSerpentHp] = useState(HEARTS);
  const petHpRef = useRef(HEARTS);
  const serpentHpRef = useRef(HEARTS);
  const [picked, setPicked] = useState<string | null>(null); // the answer tapped (null = time ran out)
  const [log, setLog] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIME_MS);

  const [serpentMove, setSerpentMove] = useState<SerpentMove>('idle');
  const [petMove, setPetMove] = useState<PetMove>('idle');

  // Power-ups
  const [bag, setBag] = useState<PowerBag>({ freeze: 0, shield: 0, fifty: 0 });
  const [frozen, setFrozen] = useState(false);
  const [shieldOn, setShieldOn] = useState(false);
  const [hidden, setHidden] = useState<string | null>(null); // answer removed by Eliminate

  // Result
  const [reward, setReward] = useState<Reward | null>(null);
  // Decorations: what the player owns (for rewards) and whether the pet wears the necklace
  const [decor, setDecor] = useState<DecorState>({ owned: [], used: [] });
  const necklaceOn = decor.used.includes('necklace');
  const outfit = outfitOn(decor, petKey); // grown-up outfit
  const [verse, setVerse] = useState<Verse | null>(null);

  // ---------- Motion ----------
  const shake = useRef(new Animated.Value(0)).current; // whole screen
  const petX = useRef(new Animated.Value(-width)).current; // slides in, lunges
  const petBlink = useRef(new Animated.Value(1)).current;
  const serpentX = useRef(new Animated.Value(width)).current;
  const flash = useRef(new Animated.Value(0)).current; // red flash when bitten
  const banner = useRef(new Animated.Value(0)).current; // "A SERPENT APPEARS!"

  // Every timer, so nothing fires after leaving the screen
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    loadPowers(username).then(setBag);
    loadDecor(username).then(setDecor);
  }, [username]);

  const shakeScreen = (power = 10) => {
    shake.setValue(0);
    Animated.sequence(
      [power, -power, power * 0.7, -power * 0.7, power * 0.4, 0].map((v) =>
        Animated.timing(shake, { toValue: v, duration: 50, useNativeDriver: true }),
      ),
    ).start();
  };

  // ---------- Intro: the serpent ambush ----------
  useEffect(() => {
    shakeScreen(14);
    Animated.parallel([
      Animated.timing(serpentX, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(petX, { toValue: 0, duration: 700, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(banner, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(1300),
        Animated.timing(banner, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
    ]).start();
    later(500, () => setSerpentMove('attack'));
    setLog('A serpent blocks the path!');
    later(1900, () => {
      setLog('');
      setPhase('ask');
    });
  }, []);

  // Each question shown is remembered, so the next battles pick new ones
  useEffect(() => {
    if (phase !== 'ask') return;
    started.current = true;
    markSeen(username, question);
  }, [phase, qIndex]);

  // ---------- Timer ----------
  useEffect(() => {
    if (phase !== 'ask' || frozen) return;
    const t = setInterval(() => setTimeLeft((v) => Math.max(0, v - 100)), 100);
    return () => clearInterval(t);
  }, [phase, frozen, qIndex]);

  useEffect(() => {
    if (phase === 'ask' && timeLeft <= 0) answer(null);
  }, [timeLeft, phase]);

  // ---------- Answering ----------
  const nextQuestion = () => {
    setPicked(null);
    setHidden(null);
    setFrozen(false);
    setLog('');
    setTimeLeft(TIME_MS);
    setQIndex((i) => i + 1);
    setPhase('ask');
  };

  const win = () => {
    setPhase('resolve');
    setLog('The serpent is crushed!');
    setSerpentMove('defeat');
    later(1900, async () => {
      // Lv 5: always a power-up. Higher serpents: sometimes a decoration, sometimes nothing.
      const prize = rollReward(petKey, milestone, decor.owned);
      if (prize.kind === 'power') {
        const newBag = { ...bag, [prize.power]: bag[prize.power] + 1 };
        setBag(newBag);
        await savePowers(username, newBag);
      } else if (prize.kind === 'decor') {
        const latest = await loadDecor(username);
        const next = { ...latest, owned: [...latest.owned.filter((k) => k !== prize.item), prize.item] };
        setDecor(next);
        await saveDecor(username, next);
      }
      await saveResult(true);
      setReward(prize);
      setVerse(pickVerse(VICTORY_VERSES));
      setPhase('won');
    });
  };

  const lose = () => {
    setPhase('resolve');
    setLog(`${petName} has fallen...`);
    if (anims.die) setPetMove('die');
    later(anims.die ? 2600 : 1200, async () => {
      await saveResult(false);
      setVerse(pickVerse(COMFORT_VERSES));
      setPhase('lost');
    });
  };

  const answer = (choice: string | null) => {
    if (phase !== 'ask') return;
    setPhase('resolve');
    setPicked(choice);
    const right = choice === question.correct;

    if (right) {
      // Your pet strikes
      setLog(`${petName} strikes with the Word!`);
      later(250, () => {
        setPetMove('tap');
        Animated.sequence([
          Animated.timing(petX, { toValue: 26 * k, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(petX, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]).start();
      });
      later(520, () => {
        setSerpentMove('hurt');
        shakeScreen(6);
        serpentHpRef.current -= 1;
        setSerpentHp(serpentHpRef.current);
      });
      later(1800, () => (serpentHpRef.current <= 0 ? win() : nextQuestion()));
      return;
    }

    // Wrong answer or time ran out: the serpent bites
    const why = choice === null ? 'Too slow!' : 'Wrong!';
    setLog(`${why} It was "${question.correct}" (${question.ref})`);
    setSerpentMove('attack');
    if (shieldOn) {
      later(450, () => {
        setShieldOn(false);
        setLog(`Immunity blocked the bite! It was "${question.correct}"`);
      });
      later(2400, nextQuestion);
      return;
    }
    later(450, () => {
      shakeScreen(12);
      flash.setValue(0.45);
      Animated.timing(flash, { toValue: 0, duration: 450, useNativeDriver: true }).start();
      Animated.sequence(
        [0, 1, 0, 1, 0, 1].map((v) => Animated.timing(petBlink, { toValue: v, duration: 70, useNativeDriver: true })),
      ).start();
      petHpRef.current -= 1;
      setPetHp(petHpRef.current);
    });
    later(2400, () => (petHpRef.current <= 0 ? lose() : nextQuestion()));
  };

  // ---------- Power-ups ----------
  const activatePower = (key: PowerKey) => {
    if (phase !== 'ask' || bag[key] <= 0) return;
    if (key === 'freeze' && frozen) return;
    if (key === 'shield' && shieldOn) return;
    if (key === 'fifty' && hidden) return;
    const newBag = { ...bag, [key]: bag[key] - 1 };
    setBag(newBag);
    savePowers(username, newBag);
    if (key === 'freeze') setFrozen(true);
    if (key === 'shield') setShieldOn(true);
    if (key === 'fifty') setHidden(question.wrong[Math.floor(Math.random() * 2)]);
  };

  // ---------- Save the result: on the server (XP) and on the phone ----------
  const [xpResult, setXpResult] = useState<SerpentXp | null>(null);
  const saveResult = async (won: boolean) => {
    // Server: winning gives XP (first time per serpent), losing takes 30% of the level's XP bar
    let server: SerpentXp | null = null;
    const id = Number(userId) || 0;
    if (id) {
      try {
        server = await reportSerpent(id, milestone, won);
        setXpResult(server);
      } catch {
        server = null; // server not reachable or not set up: fall back to the phone-only XP loss
      }
    }
    const key = `pet:${username ?? 'guest'}`;
    try {
      const raw = await AsyncStorage.getItem(key);
      const save = raw ? JSON.parse(raw) : {};
      if (won) {
        const beaten: number[] = save.serpentBeaten ?? [];
        if (!beaten.includes(milestone)) beaten.push(milestone);
        save.serpentBeaten = beaten;
      } else if (!server) {
        // Lose XP (phone only, when the server couldn't save it): remembered for this level only
        const sameLevel = save.xpLossLevel === level;
        save.xpLoss = Math.min(1, (sameLevel ? save.xpLoss ?? 0 : 0) + XP_LOSS);
        save.xpLossLevel = level;
      }
      await AsyncStorage.setItem(key, JSON.stringify(save));
    } catch {}
  };

  const leave = () => {
    router.replace({
      pathname: '/study',
      params: { username: username ?? '', userId: userId ?? '', animalId: String(animalId), from: 'battle' },
    });
  };

  // ---------- Sizes ----------
  const sAnim = SERPENT[serpentMove];
  const serpentW = SERPENT_W * k;
  const serpentH = SERPENT_H * k;

  const petScale = k * PET_SIZE * ((anims.scale ?? PET_SCALE) / PET_SCALE);
  const dieSet = petMove === 'die' ? anims.die : undefined;
  const petAnim: Anim = dieSet ? dieSet.anim : petMove === 'tap' ? anims.tap : anims.idle;
  const petFrameW = dieSet ? dieSet.frameW : anims.frameW;
  const petFrameH = dieSet ? dieSet.frameH : anims.frameH;

  const timerColor = frozen ? FROST : timeLeft <= 5000 ? EMBER : GOLD;
  const showAnswers = phase === 'ask' || phase === 'resolve';

  return (
    <View style={styles.screen}>
      <PreloadSheets
        sheets={[...Object.values(SERPENT).map((a) => a.sheet), ...[anims.idle.sheet, anims.tap.sheet, ...(anims.die ? [anims.die.anim.sheet] : [])].map((sh) => dressed(sh, outfit, necklaceOn))]}
      />
      <Animated.View style={{ flex: 1, transform: [{ translateX: shake }] }}>
        {/* ---------- Arena ---------- */}
        <View style={{ height: insets.top, backgroundColor: SKY }} />
        <View style={{ width, height: arenaH }}>
          <Image source={ARENA} style={{ position: 'absolute', width, height: arenaH }} />

          {/* Serpent (top right) */}
          <Animated.View
            style={{
              position: 'absolute',
              left: SERPENT_SPOT.x * k - serpentW / 2,
              top: SERPENT_SPOT.y * k - serpentH,
              transform: [{ translateX: serpentX }],
            }}
          >
            <Sprite
              key={serpentMove}
              sheet={sAnim.sheet}
              ms={sAnim.ms}
              frameW={SERPENT_W}
              frameH={SERPENT_H}
              scale={k}
              loop={serpentMove === 'idle'}
              onDone={() => serpentMove !== 'defeat' && setSerpentMove('idle')}
            />
          </Animated.View>

          {/* Your pet (bottom left) */}
          <Animated.View
            style={{
              position: 'absolute',
              left: PET_SPOT.x * k - (petFrameW * petScale) / 2,
              top: PET_SPOT.y * k - petFrameH * petScale,
              opacity: petBlink,
              transform: [{ translateX: petX }],
            }}
          >
            <Sprite
              key={`${petKey}-${petMove}`}
              sheet={dressed(petAnim.sheet, outfit, necklaceOn)}
              ms={petAnim.ms}
              frameW={petFrameW}
              frameH={petFrameH}
              scale={petScale}
              loop={petMove === 'idle'}
              onDone={() => petMove === 'tap' && setPetMove('idle')}
            />
          </Animated.View>

          {/* Serpent's box (top left) */}
          <View style={[styles.infoBox, { left: 8, top: 8 }]}>
            <Text style={styles.infoName}>SERPENT</Text>
            <Text style={styles.infoLevel}>Lv {milestone}</Text>
            <Hearts count={serpentHp} />
          </View>

          {/* Your box (right, above the ground) */}
          <View style={[styles.infoBox, { right: 8, top: 74 * k }]}>
            <Text style={styles.infoName} numberOfLines={1}>
              {petName.toUpperCase()}
            </Text>
            <Text style={styles.infoLevel}>Lv {level}</Text>
            <Hearts count={petHp} />
            {shieldOn ? <Image source={POWERS[1].icon} style={styles.shieldBadge} /> : null}
          </View>

          {/* "A SERPENT APPEARS!" */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.banner,
              { top: arenaH * 0.38, opacity: banner, transform: [{ scale: banner.interpolate({ inputRange: [0, 1], outputRange: [1.4, 1] }) }] },
            ]}
          >
            <Text style={styles.bannerText}>A SERPENT APPEARS!</Text>
          </Animated.View>
        </View>

        {/* ---------- Question panel ---------- */}
        <View style={[styles.panel, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.panelTop}>
            <Text style={styles.qNumber}>QUESTION {qIndex + 1}</Text>
            <Text style={[styles.seconds, { color: timerColor }]}>
              {frozen ? 'FROZEN' : `${Math.ceil(timeLeft / 1000)}s`}
            </Text>
          </View>
          <View style={styles.timerTrack}>
            <View style={[styles.timerFill, { width: `${(timeLeft / TIME_MS) * 100}%`, backgroundColor: timerColor }]} />
          </View>

          <Text style={styles.question}>{phase === 'intro' ? '...' : question.q}</Text>

          {log ? <Text style={styles.log}>{log}</Text> : null}

          {showAnswers
            ? choices.map((c) => {
                const gone = c === hidden;
                const isRight = phase === 'resolve' && c === question.correct;
                const isWrongPick = phase === 'resolve' && c === picked && c !== question.correct;
                return (
                  <Pressable
                    key={c}
                    disabled={phase !== 'ask' || gone}
                    onPress={() => answer(c)}
                    style={({ pressed }) => [
                      styles.answer,
                      pressed && styles.answerPressed,
                      gone && styles.answerGone,
                      isRight && { backgroundColor: GREEN, borderColor: '#4E6B40' },
                      isWrongPick && { backgroundColor: EMBER, borderColor: '#8E3A28' },
                    ]}
                  >
                    <Text style={[styles.answerText, gone && { color: DIM }]}>{gone ? '—' : c}</Text>
                  </Pressable>
                );
              })
            : null}

          {/* Power-ups */}
          <View style={styles.powerRow}>
            {POWERS.map((p) => {
              const active = (p.key === 'freeze' && frozen) || (p.key === 'shield' && shieldOn) || (p.key === 'fifty' && !!hidden);
              const empty = bag[p.key] <= 0;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => activatePower(p.key)}
                  disabled={phase !== 'ask' || empty || active}
                  accessibilityLabel={`${p.name}: ${p.info}. You have ${bag[p.key]}`}
                  style={({ pressed }) => [styles.power, active && styles.powerActive, pressed && styles.answerPressed]}
                >
                  <Image source={p.icon} style={[styles.powerIcon, empty && !active && { opacity: 0.3 }]} />
                  <Text style={[styles.powerName, empty && !active && { color: DIM }]}>{p.name}</Text>
                  <Text style={styles.powerCount}>x{bag[p.key]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {/* Red flash when bitten */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: EMBER, opacity: flash }]} />

      {/* ---------- Result ---------- */}
      <Modal visible={phase === 'won' || phase === 'lost'} transparent animationType="none">
        <View style={styles.resultBackdrop}>
          <View style={styles.resultCard}>
            <Text style={[styles.resultTitle, { color: phase === 'won' ? GOLD : EMBER }]}>
              {phase === 'won' ? 'VICTORY!' : 'DEFEATED'}
            </Text>

            {phase === 'won' && reward?.kind === 'power'
              ? (() => {
                  const won = POWERS.find((p) => p.key === reward.power)!;
                  const rare = isRarePower(petKey, reward.power);
                  return (
                    <View style={[styles.rewardRow, rare && styles.rewardRare]}>
                      <Image source={won.icon} style={styles.rewardIcon} />
                      <View style={{ flex: 1 }}>
                        {rare ? <Text style={styles.rareTag}>RARE PULL!</Text> : null}
                        <Text style={styles.rewardName}>+1 {won.name}</Text>
                        <Text style={styles.rewardInfo}>{won.info}</Text>
                      </View>
                    </View>
                  );
                })()
              : null}

            {phase === 'won' && reward?.kind === 'decor'
              ? (() => {
                  const item = decorItem(reward.item);
                  return (
                    <View style={[styles.rewardRow, styles.rewardRare]}>
                      <Image source={item.icon} style={styles.rewardIcon} resizeMode="contain" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rareTag}>NEW DECORATION!</Text>
                        <Text style={styles.rewardName}>{item.name}</Text>
                        <Text style={styles.rewardInfo}>
                          {item.group === 'clothes' ? 'Open DECOR in the study to put it on.' : 'Open DECOR in the study to hang it up.'}
                        </Text>
                      </View>
                    </View>
                  );
                })()
              : null}

            {phase === 'won' && xpResult ? (
              xpResult.xp_change > 0 ? (
                <Text style={styles.xpWin}>{`+${xpResult.xp_change} XP${xpResult.leveled_up ? `  ·  LEVEL UP! Lv ${xpResult.animal_level}` : ''}`}</Text>
              ) : xpResult.note ? (
                <Text style={styles.xpNote}>{xpResult.note}</Text>
              ) : null
            ) : null}

            {phase === 'won' && reward?.kind === 'none' ? (
              <Text style={styles.lossText}>The serpent left nothing behind this time. Stronger serpents give rarer rewards!</Text>
            ) : null}

            {phase === 'lost' ? (
              <Text style={styles.lossText}>
                {xpResult
                  ? `${petName} lost ${Math.abs(xpResult.xp_change)} XP. The serpent will return — read and try again!`
                  : `${petName} lost ${Math.round(XP_LOSS * 100)}% XP. The serpent will return — read and try again!`}
              </Text>
            ) : null}

            {verse ? (
              <View style={styles.verseBox}>
                <Text style={styles.verseText}>“{verse.text}”</Text>
                <Text style={styles.verseRef}>— {verse.ref}</Text>
              </View>
            ) : null}

            <Pressable onPress={leave} style={({ pressed }) => [styles.continueButton, pressed && styles.answerPressed]}>
              <Text style={styles.continueText}>CONTINUE</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: MAHOGANY_DARK },

  infoBox: {
    position: 'absolute',
    minWidth: 130,
    maxWidth: 170,
    backgroundColor: 'rgba(27,22,18,0.88)',
    borderWidth: 3,
    borderColor: GOLD,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoName: { fontFamily: 'Silkscreen_700Bold', fontSize: 13, color: PARCHMENT },
  infoLevel: { fontFamily: 'Silkscreen_700Bold', fontSize: 11, color: GOLD, marginTop: 1 },
  hearts: { flexDirection: 'row', gap: 4, marginTop: 4 },
  heart: { width: 20, height: 20 },
  heartLost: { opacity: 0.2 },
  shieldBadge: { position: 'absolute', right: -12, top: -12, width: 28, height: 28 },

  banner: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: INK,
    borderWidth: 3,
    borderColor: EMBER,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerText: { fontFamily: 'Silkscreen_700Bold', fontSize: 20, color: EMBER, letterSpacing: 1 },

  panel: {
    flex: 1,
    backgroundColor: MAHOGANY,
    borderTopWidth: 4,
    borderTopColor: GOLD,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  panelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qNumber: { fontFamily: 'Silkscreen_700Bold', fontSize: 14, color: GOLD },
  seconds: { fontFamily: 'Silkscreen_700Bold', fontSize: 14 },
  timerTrack: { height: 8, backgroundColor: INK, marginTop: 6, borderWidth: 1, borderColor: '#5A3A2A' },
  timerFill: { height: '100%' },
  question: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    lineHeight: 23,
    color: PARCHMENT,
    marginTop: 12,
    marginBottom: 6,
  },
  log: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: GOLD, marginBottom: 6 },

  answer: {
    backgroundColor: GOLD,
    borderWidth: 3,
    borderColor: '#8A6420',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  answerPressed: { transform: [{ translateY: 2 }], opacity: 0.85 },
  answerGone: { backgroundColor: MAHOGANY_DARK, borderColor: '#4A2E22' },
  answerText: { fontFamily: 'Montserrat_700Bold', fontSize: 15, color: INK, textAlign: 'center' },

  powerRow: { flexDirection: 'row', gap: 8, marginTop: 'auto', paddingTop: 12 },
  power: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: MAHOGANY_DARK,
    borderWidth: 2,
    borderColor: '#5A3A2A',
    paddingVertical: 6,
  },
  powerActive: { borderColor: FROST, backgroundColor: '#1E2A33' },
  powerIcon: { width: 32, height: 32 },
  powerName: { fontFamily: 'Silkscreen_700Bold', fontSize: 9, color: PARCHMENT, marginTop: 2 },
  powerCount: { fontFamily: 'Silkscreen_700Bold', fontSize: 11, color: GOLD },

  resultBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  resultCard: { backgroundColor: MAHOGANY, borderWidth: 4, borderColor: GOLD, padding: 20 },
  resultTitle: { fontFamily: 'Silkscreen_700Bold', fontSize: 28, textAlign: 'center', marginBottom: 14 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: INK, padding: 10, marginBottom: 14 },
  rewardIcon: { width: 48, height: 48 },
  rewardRare: { borderWidth: 3, borderColor: GOLD, backgroundColor: '#2A1E10' },
  rareTag: { fontFamily: 'Silkscreen_700Bold', fontSize: 12, color: '#F2D27A', letterSpacing: 1, marginBottom: 2 },
  rewardName: { fontFamily: 'Silkscreen_700Bold', fontSize: 15, color: GOLD },
  rewardInfo: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: PARCHMENT, marginTop: 2 },
  xpWin: { fontFamily: 'Silkscreen_700Bold', fontSize: 18, color: GOLD, textAlign: 'center', marginBottom: 12 },
  xpNote: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: DIM, textAlign: 'center', marginBottom: 12 },
  lossText: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: PARCHMENT, textAlign: 'center', marginBottom: 14 },
  verseBox: { borderLeftWidth: 3, borderLeftColor: GOLD, paddingLeft: 12, marginBottom: 18 },
  verseText: { fontFamily: 'Montserrat_400Regular', fontStyle: 'italic', fontSize: 15, lineHeight: 22, color: PARCHMENT },
  verseRef: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: GOLD, marginTop: 6 },
  continueButton: { backgroundColor: GOLD, borderWidth: 3, borderColor: '#8A6420', paddingVertical: 12, alignItems: 'center' },
  continueText: { fontFamily: 'Silkscreen_700Bold', fontSize: 18, color: INK, letterSpacing: 1 },
});
