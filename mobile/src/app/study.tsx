import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sprite, { PreloadSheets } from '../components/pets/Sprite';
import SpeechBubble from '../components/study/SpeechBubble';
import NameModal from '../components/study/NameModal';
import ExitModal from '../components/study/ExitModal';
import FoodTray, { FoodCounts, FoodKind } from '../components/study/FoodTray';
import TestPanel, { isTester, type TestGroup } from '../components/study/TestPanel';
import { HungerBar, ProgressBar } from '../components/study/StatBars';
import { fetchPetStatus, fetchNextReading, feedPet } from '../api/auth';
import {
  ADULT_LEVEL,
  ADULTS,
  ALL_SHEETS,
  BABIES,
  EGG,
  PET_BY_ANIMAL,
  PET_SCALE,
  TEEN_LEVEL,
  TEENS,
  type Anim,
} from '../pets/forms';
import { loadPowers, savePowers } from '../battle/powerups';

// A serpent ambushes the pet every 5 levels (Lv 5, 10, 15 ...)
const SERPENT_EVERY = 5;

const INK = '#1B1612';

// Food a brand-new pet starts with (so you can test feeding right away)
const START_FOOD: FoodCounts = { bread: 3, water: 1, wine: 0 };
// How much each food fills the hunger bar (1 = full)
const FILLS: Record<FoodKind, number> = { bread: 0.15, water: 0.2, wine: 0.35 };
// Hunger empties completely in 2 days
const HUNGER_PER_HOUR = 1 / 48;
// Sabbath: 6 = Saturday, 0 = Sunday
const SABBATH_DAY = 6;

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};


type Stage = 'egg' | 'hatching' | 'baby';
type Mood = 'idle' | 'tap' | 'dance' | 'read' | 'die' | FoodKind;

// Below this the pet looks hungry instead of its normal idle
const HUNGRY_BELOW = 0.3;

// How long the random moods last before going back to idle (ms)
const MOOD_LENGTH = { dance: 4300, read: 8000 };

// Room art tiles (pixel art drawn at 8x; shown at 4 points per art pixel)
const WALL_W = 256;
const WALL_H = 192;
const FLOOR_RATIO = 512 / 224;

export default function Study() {
  const { username, userId, animalId: animalParam, from } = useLocalSearchParams<{
    username?: string;
    userId?: string;
    animalId?: string;
    from?: string; // 'battle' when coming back from a serpent fight
  }>();
  const numericUserId = Number(userId) || 0;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const [stage, setStage] = useState<Stage>('egg');
  const [mood, setMood] = useState<Mood>('idle');
  const [petName, setPetName] = useState('');
  const [naming, setNaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [food, setFood] = useState<FoodCounts>(START_FOOD);
  const [hunger, setHunger] = useState(0.7);
  const [wineDate, setWineDate] = useState('');
  // Which pet: from the pet-select screen, then the phone's save, then the server
  const [animalId, setAnimalId] = useState<number>(Number(animalParam) || 1);
  // Once the player has a pet (picked it, or it's saved on the phone), the server can't swap it
  const petChosen = useRef(!!Number(animalParam));
  const petKey = PET_BY_ANIMAL[animalId] ?? 'donkey';

  // Live stats from the server
  const [level, setLevel] = useState(1);

  // Baby -> teen (young) at TEEN_LEVEL -> adult at ADULT_LEVEL
  const adult = level >= ADULT_LEVEL;
  const teen = !adult && level >= TEEN_LEVEL;
  const form = adult ? 'adult' : teen ? 'teen' : 'baby';
  const baby = (adult ? ADULTS : teen ? TEENS : BABIES)[petKey];
  const [serverProgress, setProgress] = useState(0);
  // Serpent battles: which ones are beaten, and XP lost to the serpent this level
  const [serpentBeaten, setSerpentBeaten] = useState<number[]>([]);
  const [xpLoss, setXpLoss] = useState({ amount: 0, level: 0 });
  const progress = Math.max(0, serverProgress - (xpLoss.level === level ? xpLoss.amount : 0));
  const [isDead, setIsDead] = useState(false);

  // Scripture reading screen
  const [readingOpen, setReadingOpen] = useState(false);
  const [reading, setReading] = useState<{ chapter?: number; title: string; content: string } | null>(null);
  const [readingBusy, setReadingBusy] = useState(false);

  // Test tools (only for test accounts, see TestPanel.tsx)
  const tester = isTester(username);
  const [testOpen, setTestOpen] = useState(false);

  const loadStatus = async () => {
    if (!numericUserId) return;
    try {
      const data = await fetchPetStatus(numericUserId);
      if (data.animal_id && !petChosen.current) setAnimalId(data.animal_id);
      setLevel(data.animal_level ?? 1);
      setHunger((data.hunger ?? 100) / 100); // server hunger is 0-100
      setProgress(Math.min(1, (data.xp ?? 0) / 300));
      setIsDead(data.is_dead ?? false);
    } catch (err: any) {
      // Server not reachable: keep using what's saved on the phone
      console.warn('Failed to load pet status:', err?.message);
    }
  };

  // Remember the pet on this phone (one save per account)
  const saveKey = `pet:${username ?? 'guest'}`;

  useEffect(() => {
    AsyncStorage.getItem(saveKey)
      .then((raw) => {
        const saved: {
          stage?: Stage;
          name?: string;
          food?: FoodCounts;
          hunger?: number;
          updatedAt?: number;
          wineDate?: string;
          animalId?: number;
          serpentBeaten?: number[];
          xpLoss?: number;
          xpLossLevel?: number;
        } = raw ? JSON.parse(raw) : {};
        setSerpentBeaten(saved.serpentBeaten ?? []);
        setXpLoss({ amount: saved.xpLoss ?? 0, level: saved.xpLossLevel ?? 0 });
        if (!animalParam && saved.animalId) {
          setAnimalId(saved.animalId);
          petChosen.current = true;
        }
        if (saved.stage === 'baby') setStage('baby');
        if (saved.name) setPetName(saved.name);

        // Hunger goes down while you're away
        let h = typeof saved.hunger === 'number' ? saved.hunger : 0.7;
        if (saved.updatedAt) {
          const hoursAway = (Date.now() - saved.updatedAt) / 3600000;
          h = Math.max(0, h - hoursAway * HUNGER_PER_HOUR);
        }
        setHunger(h);

        // Free wine once every Sabbath
        const f = { ...START_FOOD, ...(saved.food ?? {}) };
        let wd = saved.wineDate ?? '';
        if (new Date().getDay() === SABBATH_DAY && wd !== todayKey()) {
          f.wine += 1;
          wd = todayKey();
        }
        setFood(f);
        setWineDate(wd);
      })
      .catch(() => {})
      .finally(() => {
        setLoaded(true);
        loadStatus(); // server numbers win over the phone's copy
      });
  }, [saveKey]);

  useEffect(() => {
    if (!loaded) return;
    const keep = stage === 'baby' ? 'baby' : 'egg';
    AsyncStorage.setItem(
      saveKey,
      JSON.stringify({
        pet: petKey,
        animalId,
        stage: keep,
        name: petName,
        food,
        hunger,
        wineDate,
        serpentBeaten,
        xpLoss: xpLoss.amount,
        xpLossLevel: xpLoss.level,
        updatedAt: Date.now(),
      }),
    ).catch(() => {});
  }, [loaded, stage, petName, food, hunger, wineDate, animalId, saveKey, serpentBeaten, xpLoss]);

  // ---- Serpent ambush: every 5 levels ----
  const [ambush, setAmbush] = useState(false);
  const ambushShake = useRef(new Animated.Value(0)).current;
  const milestone = Math.floor(level / SERPENT_EVERY) * SERPENT_EVERY;

  const startBattle = (m: number) => {
    setTestOpen(false);
    setTrayOpen(false);
    router.replace({
      pathname: '/battle',
      params: {
        username: username ?? '',
        userId: userId ?? '',
        animalId: String(animalId),
        level: String(level),
        milestone: String(Math.max(SERPENT_EVERY, m)),
        petName: petName || 'Your pet',
      },
    });
  };

  const serpentAttacks = (m: number) => {
    setAmbush(true);
    ambushShake.setValue(0);
    Animated.sequence(
      [14, -14, 10, -10, 6, -6, 0].map((v) => Animated.timing(ambushShake, { toValue: v, duration: 60, useNativeDriver: true })),
    ).start();
    setTimeout(() => {
      setAmbush(false);
      startBattle(m);
    }, 1600);
  };

  // Check once the pet has loaded: a new 5-level milestone that isn't beaten yet = ambush!
  // (Not right after coming back from a battle, so a lost fight doesn't restart instantly.)
  const checkedMilestone = useRef<number | null>(null);
  useEffect(() => {
    if (!loaded || checkedMilestone.current === milestone) return;
    if (stage !== 'baby' || isDead || milestone < SERPENT_EVERY) return;
    const t = setTimeout(() => {
      const firstCheck = checkedMilestone.current === null;
      checkedMilestone.current = milestone;
      if (firstCheck && from === 'battle') return; // just fought it
      if (!serpentBeaten.includes(milestone)) serpentAttacks(milestone);
    }, 1500); // wait for the server's level to arrive
    return () => clearTimeout(t);
  }, [loaded, stage, isDead, milestone, serpentBeaten, from]);

  const full = hunger >= 0.99;
  const hungry = stage === 'baby' && hunger < HUNGRY_BELOW;
  const eating = mood === 'bread' || mood === 'water' || mood === 'wine';
  const dying = mood === 'die';

  // "+15" with a heart that floats up over the pet after feeding
  const [popText, setPopText] = useState('');
  const pop = useRef(new Animated.Value(0)).current;

  const feed = (kind: FoodKind) => {
    if (food[kind] <= 0 || full || eating) return;
    setFood((f) => ({ ...f, [kind]: f[kind] - 1 }));
    setTrayOpen(false);
    setMood(kind); // plays the eating / drinking animation
  };

  // Called when the eating animation finishes: fill the bar and show the pop
  const finishMeal = (kind: FoodKind) => {
    setHunger((h) => Math.min(1, h + FILLS[kind]));
    setMood('idle');
    // Bread counts as a real feeding on the server (hunger + XP)
    if (kind === 'bread' && numericUserId) {
      feedPet(numericUserId)
        .then(loadStatus)
        .catch((err: any) => console.warn('Feed save failed:', err?.message));
    }
    setPopText(`+${Math.round(FILLS[kind] * 100)}`);
    pop.setValue(0);
    Animated.timing(pop, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(
      () => setPopText(''),
    );
  };

  // While idle, every few seconds pick a random mood: dance or read the Bible
  useEffect(() => {
    if (stage !== 'baby' || naming || leaving || trayOpen || testOpen) return;
    if (mood === 'idle' && !hungry && baby.moods.length > 0) {
      const pick = baby.moods[Math.floor(Math.random() * baby.moods.length)];
      const t = setTimeout(() => setMood(pick), 5000 + Math.random() * 5000);
      return () => clearTimeout(t);
    }
    if (mood === 'dance' || mood === 'read') {
      const t = setTimeout(() => setMood('idle'), MOOD_LENGTH[mood]);
      return () => clearTimeout(t);
    }
  }, [stage, mood, naming, leaving, trayOpen, testOpen, hungry, petKey, form]);

  // READ button: get the next passage from the server
  const openReading = async () => {
    setTrayOpen(false);
    try {
      const data = await fetchNextReading(numericUserId);
      setReading(data);
    } catch (err: any) {
      console.warn('Reading fetch failed:', err?.message);
      setReading(null); // falls back to John 1 below
    }
    setReadingOpen(true);
  };

  // DONE: reading earns a loaf of bread for the basket
  const finishReading = () => {
    if (readingBusy) return;
    setReadingBusy(true);
    setFood((f) => ({ ...f, bread: f.bread + 1 }));
    setReading(null);
    setReadingOpen(false);
    setReadingBusy(false);
    setMood('tap');
    Alert.alert('+1 Bread', `You earned a loaf of bread. Open the food basket to feed ${petName || 'your pet'}!`);
  };

  const tapPet = () => {
    if (stage === 'egg') setStage('hatching');
    else if (stage === 'baby' && mood !== 'tap' && !eating && !dying) setMood('tap');
  };

  const babyAnim = mood === 'idle' && hungry ? 'hungry' : mood;
  const isEgg = stage === 'egg' || stage === 'hatching';
  const dieSet = dying ? baby.die : undefined;
  const anim: Anim =
    stage === 'egg'
      ? EGG.idle
      : stage === 'hatching'
        ? EGG.hatch
        : dieSet
          ? dieSet.anim
          : ((babyAnim === 'die' ? undefined : (baby[babyAnim] as Anim | undefined)) ?? baby.idle);
  const frameW = isEgg ? EGG.frameW : dieSet ? dieSet.frameW : (anim.w ?? baby.frameW);
  const frameH = isEgg ? EGG.frameH : dieSet ? dieSet.frameH : (anim.h ?? baby.frameH);
  const animKey = stage === 'baby' ? `${petKey}-${form}-${babyAnim}` : stage;
  const scale = isEgg ? PET_SCALE : (baby.scale ?? PET_SCALE);
  const loops = stage === 'egg' || (stage === 'baby' && (mood === 'idle' || mood === 'dance' || mood === 'read'));

  const floorH = Math.round(height * 0.23);
  const floorTileW = Math.round(floorH * FLOOR_RATIO);
  const petW = frameW * scale;
  const petBottom = floorH - 70; // feet stand a little way into the floor

  // Plays the falling-over animation (if this pet has one), then the "passed away" screen
  const killPet = () => {
    if (stage === 'baby' && baby.die) {
      setMood('idle');
      setTimeout(() => setMood('die'), 50);
    } else {
      setIsDead(true);
    }
  };

  // ---- Test tool buttons ----
  const play = (m: Mood) => {
    setTestOpen(false);
    if (stage !== 'baby') setStage('baby');
    setMood('idle');
    setTimeout(() => setMood(m), 50);
  };
  const testGroups: TestGroup[] = [
    {
      title: 'Hunger',
      actions: [
        { label: 'Full 100%', onPress: () => setHunger(1) },
        { label: 'Half 50%', onPress: () => setHunger(0.5) },
        { label: 'Hungry 20%', onPress: () => setHunger(0.2) },
        { label: 'Starving 0%', onPress: () => setHunger(0) },
      ],
    },
    {
      title: 'Food basket',
      actions: [
        { label: '+5 bread', onPress: () => setFood((f) => ({ ...f, bread: f.bread + 5 })) },
        { label: '+5 water', onPress: () => setFood((f) => ({ ...f, water: f.water + 5 })) },
        { label: '+1 Sabbath wine', onPress: () => setFood((f) => ({ ...f, wine: f.wine + 1 })) },
        { label: 'Empty basket', onPress: () => setFood({ bread: 0, water: 0, wine: 0 }) },
      ],
    },
    {
      title: 'Play animation',
      actions: [
        { label: petKey === 'lion' ? 'Roar' : 'Love', onPress: () => play('tap') },
        { label: 'Read', onPress: () => play('read') },
        ...(baby.dance ? [{ label: 'Dance', onPress: () => play('dance') }] : []),
        { label: 'Eat bread', onPress: () => play('bread') },
        { label: 'Drink water', onPress: () => play('water') },
        { label: 'Drink wine', onPress: () => play('wine') },
        ...(baby.die ? [{ label: 'Die', onPress: () => killPet() }] : []),
        { label: 'Hungry look', onPress: () => { setTestOpen(false); setStage('baby'); setMood('idle'); setHunger(0.1); } },
      ],
    },
    {
      title: 'Pet',
      actions: [
        { label: 'Donkey', onPress: () => { setMood('idle'); petChosen.current = true; setAnimalId(1); } },
        { label: 'Lion', onPress: () => { setMood('idle'); petChosen.current = true; setAnimalId(2); } },
        // A new egg always hatches into a baby, so these also reset the level to 1
        { label: 'Back to egg', onPress: () => { setTestOpen(false); setMood('idle'); setPetName(''); setLevel(1); setProgress(0); setStage('egg'); } },
        { label: 'Hatch now', onPress: () => { setTestOpen(false); setLevel(1); setProgress(0); setStage('hatching'); } },
      ],
    },
    {
      title: 'Level & XP',
      actions: [
        { label: 'Level +1', onPress: () => setLevel((l) => l + 1) },
        { label: 'Level 1 (baby)', onPress: () => { setMood('idle'); setLevel(1); } },
        { label: `Teen (Lv ${TEEN_LEVEL})`, onPress: () => { setStage('baby'); setLevel(TEEN_LEVEL); setMood('tap'); } },
        { label: `Adult (Lv ${ADULT_LEVEL})`, onPress: () => { setStage('baby'); setLevel(ADULT_LEVEL); setMood('tap'); } },
        { label: 'XP 0%', onPress: () => { setXpLoss({ amount: 0, level: 0 }); setProgress(0); } },
        { label: 'XP 50%', onPress: () => setProgress(0.5) },
        { label: 'XP 95%', onPress: () => setProgress(0.95) },
      ],
    },
    {
      title: 'Battle',
      actions: [
        { label: 'Serpent battle', onPress: () => startBattle(milestone) },
        { label: 'Serpent ambush', onPress: () => { setTestOpen(false); serpentAttacks(milestone); } },
        { label: 'Forget beaten serpents', onPress: () => setSerpentBeaten([]) },
        {
          label: '+1 each power-up',
          onPress: async () => {
            const bag = await loadPowers(username);
            await savePowers(username, { freeze: bag.freeze + 1, shield: bag.shield + 1, fifty: bag.fifty + 1 });
            Alert.alert('Power-ups', 'Added +1 Freeze Time, +1 Immunity and +1 Eliminate.');
          },
        },
      ],
    },
    {
      title: 'Danger',
      actions: [
        { label: 'Kill pet', danger: true, onPress: () => { setTestOpen(false); killPet(); } },
        {
          label: 'Wipe save',
          danger: true,
          onPress: () => {
            AsyncStorage.removeItem(saveKey).catch(() => {});
            setTestOpen(false);
            setMood('idle');
            setPetName('');
            setStage('egg');
            setLevel(1);
            setProgress(0);
            setSerpentBeaten([]);
            setXpLoss({ amount: 0, level: 0 });
            setFood(START_FOOD);
            setHunger(0.7);
          },
        },
      ],
    },
  ];
  const testInfo = `${petKey} · ${stage === 'baby' ? form : stage} · hunger ${Math.round(hunger * 100)}% · Lv ${level} · XP ${Math.round(progress * 100)}% · bread ${food.bread} water ${food.water} wine ${food.wine}`;

  if (isDead) {
    return (
      <View style={[styles.screen, styles.deadContainer]}>
        <Text style={styles.deadTitle}>YOUR PET HAS PASSED AWAY</Text>
        <Text style={styles.deadSub}>It went unfed for over 72 hours.</Text>
        <Pressable onPress={() => router.replace('/')} style={({ pressed }) => [styles.doneButton, pressed && styles.donePressed]}>
          <Text style={styles.doneButtonText}>BACK</Text>
        </Pressable>
        {tester ? (
          <Pressable
            onPress={() => {
              setIsDead(false);
              setMood('idle');
              setHunger(1);
            }}
            style={({ pressed }) => [styles.doneButton, styles.reviveButton, pressed && styles.donePressed]}
          >
            <Text style={styles.doneButtonText}>REVIVE (TEST)</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <Animated.View style={[styles.screen, { transform: [{ translateX: ambushShake }] }]}>
      <PreloadSheets sheets={ALL_SHEETS} />

      {/* Brick wall, tiled */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: Math.ceil(height / WALL_H) }, (_, r) =>
          Array.from({ length: Math.ceil(width / WALL_W) }, (_, c) => (
            <Image
              key={`${r}-${c}`}
              source={require('../../assets/images/room_wall.png')}
              style={{ position: 'absolute', left: c * WALL_W, top: r * WALL_H, width: WALL_W, height: WALL_H }}
            />
          )),
        )}
      </View>

      {/* Wooden floor, tiled */}
      <View style={[styles.floor, { height: floorH }]} pointerEvents="none">
        {Array.from({ length: Math.ceil(width / floorTileW) }, (_, c) => (
          <Image
            key={c}
            source={require('../../assets/images/room_floor.png')}
            style={{ position: 'absolute', left: c * floorTileW, top: 0, width: floorTileW, height: floorH }}
          />
        ))}
      </View>

      {/* Top-left: name + bars */}
      <View style={[styles.hud, { top: insets.top + 24 }]}>
        <Pressable
          onPress={() => setNaming(true)}
          accessibilityRole="button"
          accessibilityLabel={petName ? `Pet name ${petName}. Tap to rename` : 'Pick a name for your pet'}
          style={({ pressed }) => [styles.nameButton, pressed && styles.nameButtonPressed]}
        >
          <Text style={styles.nameText} numberOfLines={1}>
            {petName || 'Pick name'}
          </Text>
        </Pressable>
        <View style={{ height: 10 }} />
        <ProgressBar level={level} value={stage === 'egg' || stage === 'hatching' ? 0 : progress} />
        <View style={{ height: 8 }} />
        <HungerBar value={stage === 'egg' || stage === 'hatching' ? 1 : hunger} />
      </View>

      {/* Top-right: tutorial + battle */}
      <View style={[styles.menu, { top: insets.top + 12 }]}>
        <MenuIcon
          label="tutorial"
          source={require('../../assets/images/icon_scroll.png')}
          onPress={() =>
            Alert.alert(
              'How to feed',
              'Tap FOOD, then READ to read a passage and earn bread. Feed your pet from the basket to fill its hunger and earn XP!',
            )
          }
        />
        <MenuIcon
          label="battle"
          source={require('../../assets/images/icon_coin.png')}
          onPress={() =>
            Alert.alert(
              'Battles',
              level < SERPENT_EVERY
                ? `A serpent will ambush ${petName || 'your pet'} at Lv ${SERPENT_EVERY}, then every ${SERPENT_EVERY} levels. Keep reading Scripture to be ready!`
                : `Next serpent at Lv ${milestone + SERPENT_EVERY}. Battles against other players are coming soon!`,
            )
          }
        />
      </View>

      {/* Test tools button (test accounts only) */}
      {tester ? (
        <Pressable
          onPress={() => setTestOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open test tools"
          style={({ pressed }) => [styles.testButton, { top: insets.top + 100 }, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.testButtonText}>TEST</Text>
        </Pressable>
      ) : null}

      {/* "Tap to hatch" bubble, only while it's still an egg */}
      {loaded && stage === 'egg' ? (
        <View style={[styles.bubbleWrap, { bottom: petBottom + 26 * PET_SCALE, left: width / 2 }]} pointerEvents="none">
          <SpeechBubble text="Tap to hatch" />
        </View>
      ) : null}

      {/* The pet */}
      {loaded ? (
        <Pressable
          onPress={tapPet}
          disabled={stage === 'hatching' || dying}
          accessibilityRole="button"
          accessibilityLabel={
            stage === 'egg' ? 'Egg. Tap to hatch' : `${petName || `Your ${form} ${petKey}`}. Tap to play`
          }
          style={{ position: 'absolute', bottom: petBottom, left: (width - petW) / 2 }}
        >
          <Sprite
            key={animKey}
            sheet={anim.sheet}
            ms={anim.ms}
            frameW={frameW}
            frameH={frameH}
            scale={scale}
            loop={loops}
            onDone={() => {
              if (mood === 'die') {
                setIsDead(true);
              } else if (mood === 'bread' || mood === 'water' || mood === 'wine') {
                finishMeal(mood);
              } else if (stage === 'hatching') {
                setStage('baby');
                setMood('tap');
              } else if (mood === 'tap') {
                setMood('idle');
                if (!petName) setNaming(true);
              }
            }}
          />
        </Pressable>
      ) : null}

      {/* Floating "+15" after a meal */}
      {popText ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pop,
            {
              bottom: petBottom + 50 * PET_SCALE,
              left: width / 2 - 50,
              opacity: pop.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
              transform: [{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [20, -40] }) }],
            },
          ]}
        >
          <Image source={require('../../assets/images/icon_heart.png')} style={styles.popHeart} />
          <Text style={styles.popText}>{popText}</Text>
        </Animated.View>
      ) : null}

      {/* Bottom-left: exit door */}
      <Pressable
        onPress={() => setLeaving(true)}
        accessibilityRole="button"
        accessibilityLabel="Exit"
        hitSlop={8}
        style={({ pressed }) => [
          styles.exit,
          { bottom: insets.bottom + 14 },
          pressed && { transform: [{ scale: 0.92 }] },
        ]}
      >
        <Image source={require('../../assets/images/icon_door.png')} style={styles.exitIcon} />
        <Text style={styles.menuLabel}>exit</Text>
      </Pressable>

      {/* Bottom-right: food basket (only once hatched) */}
      {stage === 'baby' ? (
        <Pressable
          onPress={() => setTrayOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open food basket"
          hitSlop={8}
          style={({ pressed }) => [
            styles.food,
            { bottom: insets.bottom + 14 },
            pressed && { transform: [{ scale: 0.92 }] },
          ]}
        >
          <Image source={require('../../assets/images/food_bread.png')} style={styles.exitIcon} />
          <Text style={styles.menuLabel}>food</Text>
        </Pressable>
      ) : null}

      <FoodTray
        visible={trayOpen}
        counts={food}
        petName={petName}
        full={full}
        onFeed={feed}
        onClose={() => setTrayOpen(false)}
        onRead={openReading}
        onMemorize={() => Alert.alert('Memorize', 'Memorization is coming soon!')}
      />

      {/* Scripture reading screen */}
      <Modal visible={readingOpen} animationType="slide" onRequestClose={() => setReadingOpen(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.readingHeader}>
            <Text style={styles.readingSubtitle}>{reading?.chapter ? `John Chapter ${reading.chapter}` : 'John 1'}</Text>
            <Pressable onPress={() => setReadingOpen(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.readingClose}>X</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.readingTitle}>{reading?.title || 'The Word Became Flesh'}</Text>
            <Text style={styles.readingText}>
              {reading?.content || 'In the beginning was the Word, and the Word was with God, and the Word was God...'}
            </Text>
          </ScrollView>
          <Pressable
            onPress={finishReading}
            disabled={readingBusy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.doneButton, pressed && styles.donePressed]}
          >
            <Text style={styles.doneButtonText}>DONE  +1 BREAD</Text>
          </Pressable>
        </View>
      </Modal>

      <TestPanel visible={testOpen} groups={testGroups} info={testInfo} onClose={() => setTestOpen(false)} />

      <ExitModal
        visible={leaving}
        petName={petName}
        onStay={() => setLeaving(false)}
        onLeave={() => {
          setLeaving(false);
          router.replace('/');
        }}
      />

      <NameModal
        visible={naming}
        initial={petName}
        onClose={() => setNaming(false)}
        onSave={(n) => {
          setPetName(n);
          setNaming(false);
        }}
      />

      {username ? (
        <Text style={[styles.owner, { bottom: insets.bottom + 8 }]} accessibilityLabel={`Signed in as ${username}`}>
          {username}'s study
        </Text>
      ) : null}

      {/* Serpent ambush warning */}
      {ambush ? (
        <View style={styles.ambushBackdrop} pointerEvents="none">
          <View style={styles.ambushBox}>
            <Text style={styles.ambushTitle}>A SERPENT APPEARS!</Text>
            <Text style={styles.ambushSub}>Answer with the Word to drive it away</Text>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

function MenuIcon({ label, source, onPress }: { label: string; source: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.menuItem, pressed && { transform: [{ scale: 0.92 }] }]}
    >
      <Image source={source} style={styles.menuIcon} />
      <Text style={styles.menuLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ambushBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(120,30,20,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambushBox: { backgroundColor: INK, borderWidth: 3, borderColor: '#E06A4F', paddingHorizontal: 18, paddingVertical: 14 },
  ambushTitle: { fontFamily: 'Silkscreen_700Bold', fontSize: 22, color: '#E06A4F', textAlign: 'center' },
  ambushSub: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#E8D9B5', textAlign: 'center', marginTop: 6 },
  screen: { flex: 1, backgroundColor: '#3A2A1E' },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  hud: { position: 'absolute', left: 18 },
  nameButton: {
    width: 170,
    height: 48,
    backgroundColor: '#F2BE4A',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 7,
    borderBottomColor: '#B07E1E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  nameButtonPressed: { borderBottomWidth: 3, borderBottomColor: INK, transform: [{ translateY: 4 }] },
  nameText: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: INK },
  menu: { position: 'absolute', right: 14, flexDirection: 'row', gap: 10 },
  menuItem: { alignItems: 'center', width: 70 },
  menuIcon: { width: 58, height: 58 },
  menuLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#F5ECD2',
    textShadowColor: INK,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  exit: { position: 'absolute', left: 16, alignItems: 'center' },
  exitIcon: { width: 54, height: 54 },
  food: { position: 'absolute', right: 16, alignItems: 'center' },
  pop: { position: 'absolute', width: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  popHeart: { width: 28, height: 28 },
  popText: {
    fontFamily: 'Silkscreen_700Bold',
    fontSize: 24,
    color: '#F2BE4A',
    textShadowColor: INK,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  bubbleWrap: { position: 'absolute', right: 12, alignItems: 'flex-start' },
  modalContainer: { flex: 1, paddingHorizontal: 22, backgroundColor: '#2B211B' },
  readingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readingClose: { fontFamily: 'Silkscreen_700Bold', fontSize: 22, color: '#C9B48A', paddingHorizontal: 6 },
  scrollContent: { paddingTop: 16, paddingBottom: 20 },
  readingTitle: { fontFamily: 'Silkscreen_700Bold', fontSize: 20, lineHeight: 28, color: '#D9A441', marginBottom: 14 },
  readingSubtitle: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#8C7765' },
  readingText: { fontFamily: 'Montserrat_400Regular', fontSize: 16, lineHeight: 26, color: '#E8D9B5' },
  doneButton: {
    alignSelf: 'stretch',
    height: 56,
    marginTop: 8,
    backgroundColor: '#F2BE4A',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 7,
    borderBottomColor: '#B07E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donePressed: { borderBottomWidth: 3, borderBottomColor: INK, transform: [{ translateY: 4 }] },
  doneButtonText: { fontFamily: 'Silkscreen_700Bold', fontSize: 18, color: INK, letterSpacing: 1 },
  reviveButton: { backgroundColor: '#9CC48A', borderBottomColor: '#5F8A4E', marginTop: 12 },
  testButton: {
    position: 'absolute',
    right: 18,
    paddingHorizontal: 12,
    height: 34,
    justifyContent: 'center',
    backgroundColor: '#9CC48A',
    borderWidth: 2,
    borderColor: INK,
    borderBottomWidth: 5,
    borderBottomColor: '#5F8A4E',
  },
  testButtonText: { fontFamily: 'Silkscreen_700Bold', fontSize: 14, color: INK },
  deadContainer: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  deadTitle: { fontFamily: 'Silkscreen_700Bold', fontSize: 22, color: '#E06A4F', textAlign: 'center' },
  deadSub: { fontFamily: 'Montserrat_400Regular', fontSize: 15, color: '#C9B48A', textAlign: 'center', marginTop: 10, marginBottom: 24 },
  owner: {
    position: 'absolute',
    alignSelf: 'center',
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#5A3E2B',
  },
});
