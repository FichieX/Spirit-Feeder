import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
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
import { fetchPetStatus, fetchNextReading, feedPet, restartPet, completeReading } from '../api/auth';
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
  withNecklace,
} from '../pets/forms';
import DecorMenu from '../components/study/DecorMenu';
import BibleReader from '../components/study/BibleReader';
import MemorizeScreen from '../components/study/MemorizeScreen';
import { DECOR, loadDecor, saveDecor, type DecorKey, type DecorState } from '../decor/items';
import { loadPowers, savePowers } from '../battle/powerups';

// A serpent ambushes the pet every 5 levels (Lv 5, 10, 15 ...)
const SERPENT_EVERY = 5;

// Same level rules as the server (main.py): level N starts at N^3 total XP, max Lv 100
const MAX_LEVEL = 100;
const levelFromXp = (xp: number) => {
  const x = Math.max(0, Math.floor(xp));
  let l = Math.max(1, Math.round(Math.cbrt(x)));
  while (l > 1 && l ** 3 > x) l -= 1;
  while (l < MAX_LEVEL && (l + 1) ** 3 <= x) l += 1;
  return Math.min(l, MAX_LEVEL);
};
const progressFromXp = (xp: number) => {
  const l = levelFromXp(xp);
  return Math.max(0, Math.min(1, (xp - l ** 3) / ((l + 1) ** 3 - l ** 3)));
};
// XP for one feeding, same tiers as the server's get_feeding_xp
const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const feedingXp = (level: number) => (level < 5 ? rand(15, 50) : level < 30 ? rand(50, 150) : level < 60 ? 700 : 1800);

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
// Room decorations are drawn at the same size as the room: 4 points per pixel-art pixel
const ROOM_PX = 4;

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
  // The first name is free. After that the name can be changed ONE more time, then it's permanent.
  const [renamed, setRenamed] = useState(false);
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
  const [serverLevel, setLevel] = useState(1);
  // Test accounts can set their own XP with the test tools. While set, it is used
  // instead of the server's, and feeding adds XP to it with the server's rules,
  // so a test Lv 10 adult grows to Lv 11, 12 ... instead of jumping back.
  const [testXp, setTestXp] = useState<number | null>(null);
  const level = testXp !== null ? levelFromXp(testXp) : serverLevel;

  // Baby -> teen (young) at TEEN_LEVEL -> adult at ADULT_LEVEL
  const adult = level >= ADULT_LEVEL;
  const teen = !adult && level >= TEEN_LEVEL;
  const form = adult ? 'adult' : teen ? 'teen' : 'baby';
  const baby = (adult ? ADULTS : teen ? TEENS : BABIES)[petKey];
  const [serverProgress, setProgress] = useState(0);
  // Serpent battles: which ones are beaten, and XP lost to the serpent this level
  const [serpentBeaten, setSerpentBeaten] = useState<number[]>([]);
  const [xpLoss, setXpLoss] = useState({ amount: 0, level: 0 });
  const baseProgress = testXp !== null ? progressFromXp(testXp) : serverProgress;
  const progress = Math.max(0, baseProgress - (xpLoss.level === level ? xpLoss.amount : 0));
  const [isDead, setIsDead] = useState(false);

  // Scripture reading screen
  const [readingOpen, setReadingOpen] = useState(false);
  const [reading, setReading] = useState<{ chapter?: number; title: string; content: string } | null>(null);
  const [readingBusy, setReadingBusy] = useState(false);
  // Verse memorization (earns water + XP)
  const [memorizeOpen, setMemorizeOpen] = useState(false);

  // Test tools (only for test accounts, see TestPanel.tsx)
  const tester = isTester(username);
  const [testOpen, setTestOpen] = useState(false);

  // Decorations won in battles (saved on the phone, per account)
  const [decor, setDecor] = useState<DecorState>({ owned: [], used: [] });
  const [decorOpen, setDecorOpen] = useState(false);
  const necklaceOn = decor.used.includes('necklace');
  useEffect(() => {
    loadDecor(username).then(setDecor);
  }, [username]);
  const updateDecor = (next: DecorState) => {
    setDecor(next);
    saveDecor(username, next);
  };
  const toggleDecor = (key: DecorKey) => {
    const used = decor.used.includes(key) ? decor.used.filter((k) => k !== key) : [...decor.used, key];
    updateDecor({ ...decor, used });
  };

  const loadStatus = async () => {
    if (!numericUserId) return;
    try {
      const data = await fetchPetStatus(numericUserId);
      if (data.animal_id && !petChosen.current) setAnimalId(data.animal_id);
      setLevel(data.animal_level ?? 1);
      setHunger((data.hunger ?? 100) / 100); // server hunger is 0-100
      // Server levels: level N starts at N^3 total XP (Lv 2 = 8, Lv 5 = 125, Lv 10 = 1000)
      const lv = data.animal_level ?? 1;
      const start = lv ** 3;
      const next = data.next_level_xp ?? (lv + 1) ** 3;
      setProgress(Math.max(0, Math.min(1, ((data.xp ?? 0) - start) / Math.max(1, next - start))));
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
          testXp?: number | null;
          renamed?: boolean;
        } = raw ? JSON.parse(raw) : {};
        if (isTester(username) && typeof saved.testXp === 'number') setTestXp(saved.testXp);
        setSerpentBeaten(saved.serpentBeaten ?? []);
        setXpLoss({ amount: saved.xpLoss ?? 0, level: saved.xpLossLevel ?? 0 });
        if (!animalParam && saved.animalId) {
          setAnimalId(saved.animalId);
          petChosen.current = true;
        }
        if (saved.stage === 'baby') setStage('baby');
        if (saved.name) setPetName(saved.name);
        setRenamed(!!saved.renamed);

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
        testXp,
        renamed,
        updatedAt: Date.now(),
      }),
    ).catch(() => {});
  }, [loaded, stage, petName, food, hunger, wineDate, animalId, saveKey, serpentBeaten, xpLoss, testXp, renamed]);

  // Tapping the name: first name, or the one allowed change, or "it's permanent"
  const tapName = () => {
    if (petName && renamed) {
      Alert.alert('Name is permanent', `${petName}'s name has already been changed once, so it can't be changed again.`);
      return;
    }
    setNaming(true);
  };

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
    // Test level: bread adds XP to it with the same rules as the server
    if (kind === 'bread') setTestXp((x) => (x === null ? x : x + feedingXp(levelFromXp(x))));
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

  // DONE: reading earns a loaf of bread, and the server moves to the next passage
  const finishReading = async () => {
    if (readingBusy) return;
    setReadingBusy(true);
    if (numericUserId && reading) {
      try {
        await completeReading(numericUserId);
      } catch (err: any) {
        console.warn('Saving reading failed:', err?.message);
      }
    }
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
        { label: 'Back to egg', onPress: () => { setTestOpen(false); setMood('idle'); setPetName(''); setRenamed(false); setTestXp(1); setStage('egg'); } },
        { label: 'Allow rename again', onPress: () => setRenamed(false) },
        { label: 'Hatch now', onPress: () => { setTestOpen(false); setTestXp(1); setStage('hatching'); } },
      ],
    },
    {
      title: 'Level & XP',
      actions: [
        { label: 'Level +1', onPress: () => setTestXp(Math.min(MAX_LEVEL, level + 1) ** 3) },
        { label: 'Level 1 (baby)', onPress: () => { setMood('idle'); setTestXp(1); } },
        { label: `Teen (Lv ${TEEN_LEVEL})`, onPress: () => { setStage('baby'); setTestXp(TEEN_LEVEL ** 3); setMood('tap'); } },
        { label: `Adult (Lv ${ADULT_LEVEL})`, onPress: () => { setStage('baby'); setTestXp(ADULT_LEVEL ** 3); setMood('tap'); } },
        { label: 'XP 0%', onPress: () => { setXpLoss({ amount: 0, level: 0 }); setTestXp(level ** 3); } },
        { label: 'XP 50%', onPress: () => setTestXp(Math.floor(level ** 3 + 0.5 * ((level + 1) ** 3 - level ** 3))) },
        { label: 'XP 95%', onPress: () => setTestXp(Math.floor(level ** 3 + 0.95 * ((level + 1) ** 3 - level ** 3))) },
        { label: 'Use real server level', onPress: () => setTestXp(null) },
      ],
    },
    {
      title: 'Battle',
      actions: [
        { label: 'Serpent battle', onPress: () => startBattle(milestone) },
        { label: 'Serpent ambush', onPress: () => { setTestOpen(false); serpentAttacks(milestone); } },
        { label: 'Forget beaten serpents', onPress: () => setSerpentBeaten([]) },
        { label: 'Get all decorations', onPress: () => updateDecor({ ...decor, owned: DECOR.map((d) => d.key) }) },
        { label: 'Remove all decorations', onPress: () => updateDecor({ owned: [], used: [] }) },
        {
          label: '+10 each power-up',
          onPress: async () => {
            const bag = await loadPowers(username);
            await savePowers(username, { freeze: bag.freeze + 10, shield: bag.shield + 10, fifty: bag.fifty + 10 });
            Alert.alert('Power-ups', 'Added +10 Freeze Time, +10 Immunity and +10 Eliminate.');
          },
        },
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
            setPetName(''); setRenamed(false);
            setStage('egg');
            setTestXp(null);
            setSerpentBeaten([]);
            setXpLoss({ amount: 0, level: 0 });
            setFood(START_FOOD);
            setHunger(0.7);
          },
        },
      ],
    },
  ];
  const testInfo = `${petKey} · ${stage === 'baby' ? form : stage} · hunger ${Math.round(hunger * 100)}% · Lv ${level}${testXp !== null ? ` (test, ${testXp} XP)` : ''} · XP ${Math.round(progress * 100)}% · bread ${food.bread} water ${food.water} wine ${food.wine}`;

  // After dying: start over with a new egg of the same pet. Level, XP, name,
  // food and beaten serpents all reset, then it hatches into a baby again.
  const [restarting, setRestarting] = useState(false);
  const startOver = async () => {
    if (restarting) return;
    setRestarting(true);
    if (numericUserId) {
      try {
        await restartPet(numericUserId); // server: XP 0, Lv 1, hunger full
      } catch (err: any) {
        console.warn('Restart on server failed:', err?.message);
      }
    }
    setIsDead(false);
    setMood('idle');
    setPetName(''); setRenamed(false);
    setStage('egg');
    setLevel(1);
    setProgress(0);
    setTestXp(tester ? 1 : null);
    setSerpentBeaten([]);
    setXpLoss({ amount: 0, level: 0 });
    setFood(START_FOOD);
    setHunger(1);
    setRestarting(false);
  };

  if (isDead) {
    return (
      <View style={[styles.screen, styles.deadContainer]}>
        <Text style={styles.deadTitle}>YOUR PET HAS PASSED AWAY</Text>
        <Text style={styles.deadSub}>It went unfed for over 72 hours.</Text>
        <Pressable
          onPress={startOver}
          disabled={restarting}
          accessibilityRole="button"
          style={({ pressed }) => [styles.doneButton, pressed && styles.donePressed]}
        >
          <Text style={styles.doneButtonText}>{restarting ? '...' : 'HATCH A NEW EGG'}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.doneButton, styles.backButton, pressed && styles.donePressed]}
        >
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
      <PreloadSheets sheets={ALL_SHEETS.map((sh) => withNecklace(sh, necklaceOn))} />

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

      {/* Room decorations (fixed spots, behind the pet). 1 pixel-art pixel = 4 points, like the room. */}
      {DECOR.filter((d) => d.group === 'room' && decor.used.includes(d.key)).map((d) => {
        const w = d.art!.w * ROOM_PX;
        const h = d.art!.h * ROOM_PX;
        const floorTop = height - floorH;
        const spot: Record<string, { left: number; top: number }> = {
          door: { left: 10, top: floorTop + 4 - h },
          window: { left: (width - w) / 2, top: insets.top + 175 },
          frame_jesus: { left: 22, top: insets.top + 190 },
          frame_scripture: { left: width - 22 - w, top: insets.top + 190 },
          cross: { left: width - 66 - w / 2, top: insets.top + 318 },
        };
        return (
          <Image
            key={d.key}
            source={d.icon}
            pointerEvents="none"
            style={{ position: 'absolute', width: w, height: h, ...spot[d.key] }}
          />
        );
      })}

      {/* Top-left: name + bars */}
      <View style={[styles.hud, { top: insets.top + 24 }]}>
        <Pressable
          onPress={tapName}
          accessibilityRole="button"
          accessibilityLabel={
            !petName ? 'Pick a name for your pet' : renamed ? `Pet name ${petName}. Permanent` : `Pet name ${petName}. Tap to rename once`
          }
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
          onPress={() => {
            // Ranked battles against other players (the serpent still ambushes every 5 levels)
            if (stage !== 'baby') {
              Alert.alert('Battles', 'Hatch your egg first, then your pet can battle!');
              return;
            }
            router.replace({
              pathname: '/ranked',
              params: {
                username: username ?? '',
                userId: userId ?? '',
                animalId: String(animalId),
                petName: petName || '',
                level: String(level),
              },
            });
          }}
        />
      </View>

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
            sheet={withNecklace(anim.sheet, necklaceOn)}
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

      {/* Bottom-right: decorate menu */}
      <Pressable
        onPress={() => {
          setTrayOpen(false);
          setDecorOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Decorate"
        hitSlop={8}
        style={({ pressed }) => [
          styles.decorBtn,
          { bottom: insets.bottom + 14, right: stage === 'baby' ? 88 : 16 },
          pressed && { transform: [{ scale: 0.92 }] },
        ]}
      >
        <Image source={require('../../assets/images/icon_decor.png')} style={styles.exitIcon} />
        <Text style={styles.menuLabel}>decor</Text>
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
        onMemorize={() => {
          setTrayOpen(false);
          // wait for the basket to slide away (iOS can't open a new screen while one is closing)
          setTimeout(() => setMemorizeOpen(true), 450);
        }}
      />

      {/* Verse memorization: +1 water (3 a day) and XP every time */}
      <MemorizeScreen
        visible={memorizeOpen}
        username={username}
        userId={numericUserId}
        onClose={() => setMemorizeOpen(false)}
        onWater={() => setFood((f) => ({ ...f, water: f.water + 1 }))}
        onXp={(gained) => {
          setTestXp((x) => (x === null ? x : x + gained)); // test level (test accounts)
          loadStatus(); // real level + XP from the server
        }}
      />

      {/* Scripture reading: the Bible opens from the cover and flips to John */}
      <BibleReader
        visible={readingOpen}
        reading={reading}
        busy={readingBusy}
        onDone={finishReading}
        onClose={() => setReadingOpen(false)}
      />

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
        warning={
          petName
            ? 'You can only change your name once. If you change it now, the new name will be permanent.'
            : undefined
        }
        onClose={() => setNaming(false)}
        onSave={(n) => {
          // Changing an existing name uses up the one allowed change
          if (petName && n !== petName) setRenamed(true);
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

      {/* Test tools button (test accounts only). Drawn near the end so nothing
          else (the big grown-up pet, the bars) can sit on top of it and eat the tap. */}
      {tester && !testOpen ? (
        <Pressable
          onPress={() => {
            console.log('[TEST] button pressed');
            setTrayOpen(false);
            setTestOpen(true);
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Open test tools"
          style={({ pressed }) => [styles.testButton, { top: insets.top + 100 }, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.testButtonText}>TEST</Text>
        </Pressable>
      ) : null}

      {/* Test tools: last, so they sit on top of everything */}
      <DecorMenu
        visible={decorOpen}
        state={decor}
        onToggle={toggleDecor}
        onClose={() => setDecorOpen(false)}
        note={petKey === 'lion' && form === 'adult' ? 'Your adult lion always wears his cross.' : undefined}
      />

      <TestPanel visible={testOpen} groups={testGroups} info={testInfo} onClose={() => setTestOpen(false)} />
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  decorBtn: { position: 'absolute', alignItems: 'center' },
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
  backButton: { backgroundColor: '#C9B48A', borderBottomColor: '#8C7765', marginTop: 12 },
  reviveButton: { backgroundColor: '#9CC48A', borderBottomColor: '#5F8A4E', marginTop: 12 },
  testButton: {
    position: 'absolute',
    zIndex: 50,
    elevation: 50,
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
