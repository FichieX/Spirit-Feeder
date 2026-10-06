import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
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
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sprite from '../components/pets/Sprite';
import SpeechBubble from '../components/study/SpeechBubble';
import NameModal from '../components/study/NameModal';
import { HungerBar, ProgressBar } from '../components/study/StatBars';

const INK = '#1B1612';

// Pretend numbers until the backend sends real ones.
const PRETEND = { level: 1, progress: 0.15, hunger: 0.7 };

// Egg + baby sprites (all share one frame size so nothing jumps between them)
const FRAME_W = 48;
const FRAME_H = 45;
const PET_SCALE = 5;
const ANIM = {
  eggIdle: { sheet: require('../../assets/images/egg_idle.png'), ms: [520, 160, 160, 160, 300] },
  eggHatch: { sheet: require('../../assets/images/egg_hatch.png'), ms: [110, 110, 110, 110, 160, 160, 140] },
  babyHappy: {
    sheet: require('../../assets/images/baby_happy.png'),
    ms: [90, 70, 70, 90, 70, 70, 90, 110, 170, 280],
  },
  babyIdle: { sheet: require('../../assets/images/baby_idle.png'), ms: [1000] },
};

type Stage = 'egg' | 'hatching' | 'babyHappy' | 'baby';

// Room art tiles (pixel art drawn at 8x; shown at 4 points per art pixel)
const WALL_W = 256;
const WALL_H = 192;
const FLOOR_RATIO = 512 / 224;

export default function Study() {
  const { username } = useLocalSearchParams<{ username?: string; userId?: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [stage, setStage] = useState<Stage>('egg');
  const [petName, setPetName] = useState('');
  const [naming, setNaming] = useState(false);

  // Gentle breathing bob for the baby when it's just standing around
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

  const anim =
    stage === 'egg'
      ? ANIM.eggIdle
      : stage === 'hatching'
        ? ANIM.eggHatch
        : stage === 'babyHappy'
          ? ANIM.babyHappy
          : ANIM.babyIdle;

  const floorH = Math.round(height * 0.23);
  const floorTileW = Math.round(floorH * FLOOR_RATIO);
  const petW = FRAME_W * PET_SCALE;
  const petH = FRAME_H * PET_SCALE;
  const petBottom = floorH - 70; // feet stand a little way into the floor

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
        <ProgressBar level={PRETEND.level} value={stage === 'egg' || stage === 'hatching' ? 0 : PRETEND.progress} />
        <View style={{ height: 8 }} />
        <HungerBar value={stage === 'egg' || stage === 'hatching' ? 1 : PRETEND.hunger} />
      </View>

      {/* Top-right: tutorial + battle */}
      <View style={[styles.menu, { top: insets.top + 12 }]}>
        <MenuIcon
          label="tutorial"
          source={require('../../assets/images/icon_scroll.png')}
          onPress={() => Alert.alert('Tutorial', 'The tutorial is coming soon!')}
        />
        <MenuIcon
          label="battle"
          source={require('../../assets/images/icon_coin.png')}
          onPress={() =>
            Alert.alert(
              'Battle locked',
              `Battles unlock when ${petName || 'your pet'} grows up. Keep feeding with Scripture!`,
            )
          }
        />
      </View>

      {/* "Tap to hatch" bubble, only while it's still an egg */}
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
        accessibilityLabel={stage === 'egg' ? 'Egg. Tap to hatch' : `${petName || 'Your baby donkey'}. Tap to play`}
        style={{ position: 'absolute', bottom: petBottom, left: (width - petW) / 2 }}
      >
        <Animated.View
          style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }}
        >
          <Sprite
            key={stage}
            sheet={anim.sheet}
            ms={anim.ms}
            frameW={FRAME_W}
            frameH={FRAME_H}
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

      {username ? (
        <Text style={[styles.owner, { bottom: insets.bottom + 8 }]} accessibilityLabel={`Signed in as ${username}`}>
          {username}'s study
        </Text>
      ) : null}
    </View>
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
  bubbleWrap: { position: 'absolute', right: 12, alignItems: 'flex-start' },
  owner: {
    position: 'absolute',
    alignSelf: 'center',
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#5A3E2B',
  },
});