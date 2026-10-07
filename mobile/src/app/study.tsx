import { useEffect, useRef, useState } from 'react';
<<<<<<< HEAD
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
=======
import { Alert, Animated, Easing, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
>>>>>>> 47de9bf (i forgot what i should commit tbbh)
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sprite from '../components/pets/Sprite';
import SpeechBubble from '../components/study/SpeechBubble';
import NameModal from '../components/study/NameModal';
import ExitModal from '../components/study/ExitModal';
import FoodTray, { FoodCounts, FoodKind } from '../components/study/FoodTray';
import { HungerBar, ProgressBar } from '../components/study/StatBars';
import { fetchPetStatus, fetchNextReading, feedPet } from '../api/auth';
import { PETS } from '../pets/catalog';

const INK = '#1B1612';

<<<<<<< HEAD
// Egg animation config (shared between Donkey and Lion)
const EGG_ANIM = {
  eggIdle: { sheet: require('../../assets/images/egg_idle.png'), ms: [520, 160, 160, 160, 300], frameW: 48, frameH: 45 },
  eggHatch: { sheet: require('../../assets/images/egg_hatch.png'), ms: [110, 110, 110, 110, 160, 160, 140], frameW: 48, frameH: 45 },
=======
// Pretend numbers until the backend sends real ones.
const PRETEND = { level: 1, progress: 0.15 };

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

// Egg + baby sprites (all share one frame size so nothing jumps between them)
const FRAME_W = 51;
const FRAME_H = 66;
const PET_SCALE = 6;
const ANIM = {
  eggIdle: { sheet: require('../../assets/images/egg_idle.png'), ms: [520, 160, 160, 160, 300] },
  eggHatch: { sheet: require('../../assets/images/egg_hatch.png'), ms: [110, 110, 110, 110, 160, 160, 140] },
  idle: { sheet: require('../../assets/images/baby_idle.png'), ms: [700, 500, 700, 500] },
  love: {
    sheet: require('../../assets/images/baby_love.png'),
    ms: [90, 70, 70, 90, 70, 70, 90, 110, 170, 280],
  },
  dance: { sheet: require('../../assets/images/baby_dance.png'), ms: [180, 180, 180, 180, 180, 180, 180, 180] },
  read: { sheet: require('../../assets/images/baby_read.png'), ms: [600, 600, 400, 600, 600, 180, 180, 800] },
  hungry: { sheet: require('../../assets/images/baby_hungry.png'), ms: [500, 450, 450, 450, 400, 160, 160, 600] },
  bread: { sheet: require('../../assets/images/eat_bread.png'), ms: [260, 200, 200, 200, 200, 200, 450, 650] },
  water: { sheet: require('../../assets/images/eat_water.png'), ms: [260, 220, 220, 220, 220, 260, 450, 650] },
  wine: { sheet: require('../../assets/images/eat_wine.png'), ms: [260, 240, 240, 240, 240, 320, 450, 700] },
>>>>>>> 47de9bf (i forgot what i should commit tbbh)
};

type Stage = 'egg' | 'hatching' | 'baby';
type Mood = 'idle' | 'love' | 'dance' | 'read' | FoodKind;

// Below this the pet looks hungry instead of its normal idle
const HUNGRY_BELOW = 0.3;

// How long the random moods last before going back to idle (ms)
const MOOD_LENGTH = { dance: 4300, read: 8000 };

// Room art tile dimensions
const WALL_W = 256;
const WALL_H = 192;
const FLOOR_RATIO = 512 / 224;

export default function Study() {
  const { username, userId } = useLocalSearchParams<{ username?: string; userId?: string }>();
  const numericUserId = Number(userId) || 1;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  // Room & Animation States
  const [stage, setStage] = useState<Stage>('egg');
  const [mood, setMood] = useState<Mood>('idle');
  const [petName, setPetName] = useState('');
  const [naming, setNaming] = useState(false);
<<<<<<< HEAD
  const [animalId, setAnimalId] = useState<number>(1);

  // Live Game Stats State
  const [hunger, setHunger] = useState(1.0);
  const [progress, setProgress] = useState(0.0);
  const [level, setLevel] = useState(1);
  const [isDead, setIsDead] = useState(false);

  // Scripture Reading Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [reading, setReading] = useState<{ chapter?: number; title: string; content: string } | null>(null);

  // Fetch real pet status on load
  useEffect(() => {
    if (numericUserId) loadStatus();
  }, [numericUserId]);

  const loadStatus = async () => {
    try {
      const data = await fetchPetStatus(numericUserId);
      setAnimalId(data.animal_id ?? 1);
      setLevel(data.animal_level ?? 1);

      // Map 0-100 hunger to 0.0 - 1.0 range
      const hungerRatio = (data.hunger ?? 100) / 100.0;
      setHunger(hungerRatio);

      // Map current XP to progress ratio
      const currentXp = data.xp ?? 0;
      const progressRatio = Math.min(1.0, currentXp / 300.0);
      setProgress(progressRatio);

      setIsDead(data.is_dead ?? false);
    } catch (err: any) {
      console.error('Failed to load pet status:', err.message);
    }
  };

  const handleOpenReading = async () => {
    try {
      const data = await fetchNextReading(numericUserId);
      setReading(data);
      setModalVisible(true);
    } catch (err: any) {
      Alert.alert('Notice', err.message);
    }
  };

  const handleFinishReading = async () => {
    try {
      // 1. Send feed request to backend
      await feedPet(numericUserId);

      // 2. Refresh live pet status
      await loadStatus();

      // 3. Clear cached reading so next click gets fresh passage
      setReading(null);

      // 4. Close reading modal and trigger happy animation
      setModalVisible(false);
      setStage('babyHappy');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // Breathing animation loop
  const bob = useRef(new Animated.Value(0)).current;
=======
  const [loaded, setLoaded] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [food, setFood] = useState<FoodCounts>(START_FOOD);
  const [hunger, setHunger] = useState(0.7);
  const [wineDate, setWineDate] = useState('');

  // Remember the pet on this phone (one save per account)
  const saveKey = `pet:${username ?? 'guest'}`;

>>>>>>> 47de9bf (i forgot what i should commit tbbh)
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
        } = raw ? JSON.parse(raw) : {};
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
      .finally(() => setLoaded(true));
  }, [saveKey]);

  useEffect(() => {
    if (!loaded) return;
    const keep = stage === 'baby' ? 'baby' : 'egg';
    AsyncStorage.setItem(
      saveKey,
      JSON.stringify({ pet: 'donkey', stage: keep, name: petName, food, hunger, wineDate, updatedAt: Date.now() }),
    ).catch(() => {});
  }, [loaded, stage, petName, food, hunger, wineDate, saveKey]);

  const full = hunger >= 0.99;
  const hungry = stage === 'baby' && hunger < HUNGRY_BELOW;
  const eating = mood === 'bread' || mood === 'water' || mood === 'wine';

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
    setPopText(`+${Math.round(FILLS[kind] * 100)}`);
    pop.setValue(0);
    Animated.timing(pop, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(
      () => setPopText(''),
    );
  };

  // While idle, every few seconds pick a random mood: dance or read the Bible
  useEffect(() => {
    if (stage !== 'baby' || naming || leaving || trayOpen) return;
    if (mood === 'idle' && !hungry) {
      const t = setTimeout(() => setMood(Math.random() < 0.5 ? 'dance' : 'read'), 5000 + Math.random() * 5000);
      return () => clearTimeout(t);
    }
    if (mood === 'dance' || mood === 'read') {
      const t = setTimeout(() => setMood('idle'), MOOD_LENGTH[mood]);
      return () => clearTimeout(t);
    }
  }, [stage, mood, naming, leaving, trayOpen, hungry]);

  const tapPet = () => {
    if (stage === 'egg') setStage('hatching');
    else if (stage === 'baby' && mood !== 'love' && !eating) setMood('love');
  };

<<<<<<< HEAD
  // Match selected animal from catalog definition
  const selectedPetDef = PETS.find((p) => p.animalId === animalId) || PETS[0];
=======
  const babyAnim = mood === 'idle' && hungry ? 'hungry' : mood;
  const anim = stage === 'egg' ? ANIM.eggIdle : stage === 'hatching' ? ANIM.eggHatch : ANIM[babyAnim];
  const animKey = stage === 'baby' ? `baby-${babyAnim}` : stage;
  const loops = stage === 'egg' || (stage === 'baby' && (mood === 'idle' || mood === 'dance' || mood === 'read'));
>>>>>>> 47de9bf (i forgot what i should commit tbbh)

  const currentAnim =
    stage === 'egg'
      ? { sheet: EGG_ANIM.eggIdle.sheet, ms: EGG_ANIM.eggIdle.ms, frameW: EGG_ANIM.eggIdle.frameW, frameH: EGG_ANIM.eggIdle.frameH }
      : stage === 'hatching'
        ? { sheet: EGG_ANIM.eggHatch.sheet, ms: EGG_ANIM.eggHatch.ms, frameW: EGG_ANIM.eggHatch.frameW, frameH: EGG_ANIM.eggHatch.frameH }
        : stage === 'babyHappy'
          ? { sheet: selectedPetDef.happy.sheet, ms: selectedPetDef.happy.ms, frameW: selectedPetDef.frameW, frameH: selectedPetDef.frameH }
          : { sheet: selectedPetDef.idle.sheet, ms: selectedPetDef.idle.ms, frameW: selectedPetDef.frameW, frameH: selectedPetDef.frameH };

  const PET_SCALE = 4;
  const floorH = Math.round(height * 0.23);
  const floorTileW = Math.round(floorH * FLOOR_RATIO);
<<<<<<< HEAD
  const petW = currentAnim.frameW * PET_SCALE;
  const petBottom = floorH - 60;

  if (isDead) {
    return (
      <View style={[styles.screen, styles.deadContainer]}>
        <Text style={styles.deadTitle}>🪦 Your Pet Has Passed Away</Text>
        <Text style={styles.deadSub}>It went unfed for over 72 hours.</Text>
      </View>
    );
  }
=======
  const petW = FRAME_W * PET_SCALE;
  const petBottom = floorH - 70; // feet stand a little way into the floor
>>>>>>> 47de9bf (i forgot what i should commit tbbh)

  return (
    <View style={styles.screen}>
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

      {/* Top-left: Name + live stats */}
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

      {/* Top-right: Menu icons */}
      <View style={[styles.menu, { top: insets.top + 12 }]}>
        <MenuIcon
          label="tutorial"
          source={require('../../assets/images/icon_scroll.png')}
          onPress={() => Alert.alert('Tutorial', 'Tap "FEED" to read NASB passages, refill hunger, and earn XP!')}
        />
        <MenuIcon
          label="battle"
          source={require('../../assets/images/icon_coin.png')}
          onPress={() =>
            Alert.alert(
              'Battle locked',
              `Battles unlock when ${petName || selectedPetDef.name} grows up. Keep feeding with Scripture!`,
            )
          }
        />
      </View>

<<<<<<< HEAD
      {/* FEED Button */}
      <TouchableOpacity
        style={[styles.feedBannerButton, { bottom: insets.bottom + 40 }]}
        onPress={handleOpenReading}
        accessibilityRole="button"
        accessibilityLabel="FEED"
      >
        <Text style={styles.feedBannerText}>FEED</Text>
      </TouchableOpacity>

      {/* Owner Study Title */}
      {username ? (
        <Text style={[styles.owner, { bottom: insets.bottom + 12 }]} accessibilityLabel={`Signed in as ${username}`}>
          {username}'s study
        </Text>
      ) : null}

      {/* Scripture Reading Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.readingTitle}>{reading?.title || 'The Word Became Flesh'}</Text>
            <Text style={styles.readingSubtitle}>
              {reading?.chapter ? `John Chapter ${reading.chapter}` : 'John 1'}
            </Text>
            <Text style={styles.readingText}>
              {reading?.content ||
                'In the beginning was the Word, and the Word was with God, and the Word was God...'}
            </Text>
          </ScrollView>

          {/* DONE Button */}
          <TouchableOpacity style={styles.doneButton} onPress={handleFinishReading}>
            <Text style={styles.doneButtonText}>DONE</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* "Tap to hatch" speech bubble */}
      {stage === 'egg' ? (
        <View style={[styles.bubbleWrap, { bottom: petBottom + 130, left: width / 2 }]} pointerEvents="none">
=======
      {/* "Tap to hatch" bubble, only while it's still an egg */}
      {loaded && stage === 'egg' ? (
        <View style={[styles.bubbleWrap, { bottom: petBottom + 26 * PET_SCALE, left: width / 2 }]} pointerEvents="none">
>>>>>>> 47de9bf (i forgot what i should commit tbbh)
          <SpeechBubble text="Tap to hatch" />
        </View>
      ) : null}

      {/* The pet */}
<<<<<<< HEAD
      <Pressable
        onPress={tapPet}
        disabled={stage === 'hatching' || stage === 'babyHappy'}
        accessibilityRole="button"
        accessibilityLabel={stage === 'egg' ? 'Egg. Tap to hatch' : `${petName || selectedPetDef.name}. Tap to play`}
        style={{ position: 'absolute', bottom: petBottom, left: (width - petW) / 2 }}
      >
        <Animated.View
          style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }}
        >
          <Sprite
            key={`${selectedPetDef.key}-${stage}`}
            sheet={currentAnim.sheet}
            ms={currentAnim.ms}
            frameW={currentAnim.frameW}
            frameH={currentAnim.frameH}
=======
      {loaded ? (
        <Pressable
          onPress={tapPet}
          disabled={stage === 'hatching'}
          accessibilityRole="button"
          accessibilityLabel={
            stage === 'egg' ? 'Egg. Tap to hatch' : `${petName || 'Your baby donkey'}. Tap to give love`
          }
          style={{ position: 'absolute', bottom: petBottom, left: (width - petW) / 2 }}
        >
          <Sprite
            key={animKey}
            sheet={anim.sheet}
            ms={anim.ms}
            frameW={FRAME_W}
            frameH={FRAME_H}
>>>>>>> 47de9bf (i forgot what i should commit tbbh)
            scale={PET_SCALE}
            loop={loops}
            onDone={() => {
              if (mood === 'bread' || mood === 'water' || mood === 'wine') {
                finishMeal(mood);
              } else if (stage === 'hatching') {
                setStage('baby');
                setMood('love');
              } else if (mood === 'love') {
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
        onRead={() => Alert.alert('Read a verse', 'The reading room is coming next!')}
        onMemorize={() => Alert.alert('Memorize', 'Memorization is coming soon!')}
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
        onClose={() => setNaming(false)}
        onSave={(n) => {
          setPetName(n);
          setNaming(false);
        }}
      />
    </View>
  );
}

function MenuIcon({ label, source, onPress }: { label: string; source: any; onPress: () => void }) {
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
  menuItem: { alignItems: 'center', width: 60 },
  menuIcon: { width: 50, height: 50 },
  menuLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
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
  owner: {
    position: 'absolute',
    alignSelf: 'center',
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#D9A441',
  },
  modalContainer: {
    flex: 1,
    padding: 24,
    backgroundColor: '#2B211B',
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 20,
  },
  readingTitle: {
    fontFamily: 'Silkscreen_700Bold',
    fontSize: 20,
    marginBottom: 8,
    color: '#D9A441',
    lineHeight: 28,
  },
  readingSubtitle: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#8C7765',
    marginBottom: 20,
  },
  readingText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    lineHeight: 26,
    color: '#E8D9B5',
  },
  doneButton: {
    backgroundColor: '#F2BE4A',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#1B1612',
    borderBottomWidth: 6,
    borderBottomColor: '#B07E1E',
    alignItems: 'center',
    marginBottom: 20,
  },
  doneButtonText: {
    color: '#1B1612',
    fontFamily: 'Silkscreen_700Bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  deadContainer: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  deadTitle: { fontSize: 26, fontWeight: 'bold', color: '#E06A4F', textAlign: 'center' },
  deadSub: { fontSize: 16, color: '#C9B48A', textAlign: 'center', marginTop: 10 },
  feedBannerButton: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#F2BE4A',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#1B1612',
    borderBottomWidth: 6,
    borderBottomColor: '#B07E1E',
    elevation: 6,
    zIndex: 20,
  },
  feedBannerText: {
    color: '#1B1612',
    fontFamily: 'Silkscreen_700Bold',
    fontSize: 20,
    letterSpacing: 2,
  },
});