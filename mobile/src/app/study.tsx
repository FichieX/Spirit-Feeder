import { useEffect, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sprite from '../components/pets/Sprite';
import SpeechBubble from '../components/study/SpeechBubble';
import NameModal from '../components/study/NameModal';
import { HungerBar, ProgressBar } from '../components/study/StatBars';
import { fetchPetStatus, fetchNextReading, feedPet } from '../api/auth';
import { PETS } from '../pets/catalog';

const INK = '#1B1612';

// Egg animation config (shared between Donkey and Lion)
const EGG_ANIM = {
  eggIdle: { sheet: require('../../assets/images/egg_idle.png'), ms: [520, 160, 160, 160, 300], frameW: 48, frameH: 45 },
  eggHatch: { sheet: require('../../assets/images/egg_hatch.png'), ms: [110, 110, 110, 110, 160, 160, 140], frameW: 48, frameH: 45 },
};

type Stage = 'egg' | 'hatching' | 'babyHappy' | 'baby';

// Room art tile dimensions
const WALL_W = 256;
const WALL_H = 192;
const FLOOR_RATIO = 512 / 224;

export default function Study() {
  const { username, userId } = useLocalSearchParams<{ username?: string; userId?: string }>();
  const numericUserId = Number(userId) || 1;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Room & Animation States
  const [stage, setStage] = useState<Stage>('egg');
  const [petName, setPetName] = useState('');
  const [naming, setNaming] = useState(false);
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
  useEffect(() => {
    if (stage !== 'baby') return;
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [stage]);

  const tapPet = () => {
    if (stage === 'egg') setStage('hatching');
    else if (stage === 'baby') setStage('babyHappy');
  };

  // Match selected animal from catalog definition
  const selectedPetDef = PETS.find((p) => p.animalId === animalId) || PETS[0];

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
          <SpeechBubble text="Tap to hatch" />
        </View>
      ) : null}

      {/* The pet */}
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
            scale={PET_SCALE}
            loop={stage === 'egg' || stage === 'baby'}
            onDone={() => {
              if (stage === 'hatching') setStage('babyHappy');
              else if (stage === 'babyHappy') {
                setStage('baby');
                if (!petName) setNaming(true);
              }
            }}
          />
        </Animated.View>
      </Pressable>

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