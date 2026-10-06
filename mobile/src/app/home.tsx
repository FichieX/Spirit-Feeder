import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
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
import PetSprite from '../components/pets/PetSprite';
import PixelArrow from '../components/pets/PixelArrow';
import { PETS } from '../pets/catalog';
import { selectPet } from '../api/auth';

const COLORS = {
  background: '#2B211B', // walnut
  glowOuter: '#34281F',
  glowInner: '#3D2B22', // mahogany
  ink: '#1B1612',
  gold: '#D9A441',
  goldLedge: '#8A6420',
  text: '#C9B48A', // vellum
  muted: '#7A6A58',
  parchment: '#E8D9B5',
  error: '#E06A4F', // ember
};

const PET_SCALE = 3.5;
const SPARKS = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);

export default function Home() {
  const { username, userId } = useLocalSearchParams<{ username?: string; userId?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const goToStudy = useRef(false);
  const { width } = useWindowDimensions();

  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'idle' | 'happy'>('idle');
  const [chosen, setChosen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pet = PETS[index];
  const single = PETS.length <= 1;

  // Pet slides in when you switch with the arrows
  const swap = useRef(new Animated.Value(1)).current;
  // Bounce + gold sparks when picked
  const bounce = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduceMotion.current = v));
  }, []);

  const go = (dir: 1 | -1) => {
    if (busy || single) return;
    setError('');
    setChosen(false);
    setMode('idle');
    setIndex((i) => (i + dir + PETS.length) % PETS.length);
    swap.setValue(0);
    Animated.timing(swap, {
      toValue: 1,
      duration: reduceMotion.current ? 0 : 260,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
  };

  const celebrate = () => {
    if (reduceMotion.current) return;
    bounce.setValue(0);
    burst.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(bounce, { toValue: 0, friction: 3, tension: 120, useNativeDriver: true }),
      ]),
      Animated.timing(burst, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  const pick = async () => {
    if (busy || chosen) return;
    setError('');
    setBusy(true);
    setMode('happy');
    celebrate();
    goToStudy.current = true;

    try {
      const id = Number(userId);
      const animalId = pet.animalId ?? (index + 1);

      if (id) {
        await selectPet(id, animalId);
      } else {
        console.warn('No valid userId provided to pet selection screen.');
      }
      setChosen(true);
    } catch (e: any) {
      console.error('Pet selection save error:', e);
      setError(e.message || 'Could not choose this pet. Try again.');
      goToStudy.current = false;
    } finally {
      setBusy(false);
    }
  };

  const hillsH = (width * 208) / 768;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* hills sit behind everything else */}
      <Image
        source={require('../../assets/images/hills.png')}
        style={[styles.hills, { width, height: hillsH }]}
        accessibilityIgnoresInvertColors
      />
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {`WELCOME,\n${(username ?? 'FRIEND').toUpperCase()}!`}
        </Text>
        <Text style={styles.subtitle}>
          {chosen ? `${pet.name} is happy to be yours!` : 'choose pet to raise'}
        </Text>
      </View>

      <View style={styles.stageRow}>
        <PixelArrow direction="left" onPress={() => go(-1)} disabled={single || busy} label="Previous pet" />

        <View style={styles.stage}>
          <View style={styles.glowOuter} />
          <View style={styles.glowInner} />
          <View style={styles.shadow} />

          {SPARKS.map((angle, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={[
                styles.spark,
                {
                  opacity: burst.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0] }),
                  transform: [
                    { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * 110] }) },
                    { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * 110] }) },
                  ],
                },
              ]}
            />
          ))}

          <Animated.View
            style={{
              opacity: swap,
              transform: [
                { scale: swap.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                { translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) },
              ],
            }}
            accessible
            accessibilityLabel={`${pet.name}. ${pet.blurb}`}
          >
            <PetSprite
              pet={pet}
              mode={mode}
              scale={PET_SCALE}
              onHappyDone={() => {
                setMode('idle');
                if (goToStudy.current) {
                  router.replace({
                    pathname: '/study',
                    params: { username, userId, animalId: pet.animalId },
                  });
                }
              }}
            />
          </Animated.View>
        </View>

        <PixelArrow direction="right" onPress={() => go(1)} disabled={single || busy} label="Next pet" />
      </View>

      <Text style={styles.petName}>{pet.name.toUpperCase()}</Text>
      <Text style={styles.blurb}>{pet.blurb}</Text>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={pick}
        disabled={busy || chosen}
        accessibilityRole="button"
        accessibilityLabel={chosen ? `${pet.name} chosen` : `Pick ${pet.name}`}
        style={({ pressed }) => [styles.pick, (pressed || chosen) && styles.pickPressed]}
      >
        <Text style={styles.pickText}>{chosen ? 'CHOSEN!' : busy ? '...' : 'PICK'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 48,
  },
  title: {
    fontFamily: 'Silkscreen_700Bold',
    fontSize: 30,
    lineHeight: 44,
    color: COLORS.gold,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
    color: COLORS.muted,
    marginTop: 14,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingHorizontal: 28,
    marginTop: 24,
  },
  stage: {
    width: 240,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOuter: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: COLORS.glowOuter,
  },
  glowInner: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.glowInner,
  },
  shadow: {
    position: 'absolute',
    bottom: 22,
    width: 130,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.ink,
  },
  spark: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: COLORS.gold,
  },
  petName: {
    fontFamily: 'Silkscreen_700Bold',
    fontSize: 18,
    color: COLORS.parchment,
    marginTop: 6,
    letterSpacing: 2,
  },
  blurb: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 48,
  },
  error: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 40,
  },
  pick: {
    marginTop: 22,
    width: 170,
    height: 52,
    backgroundColor: COLORS.gold,
    borderWidth: 3,
    borderColor: COLORS.ink,
    borderBottomWidth: 8,
    borderBottomColor: COLORS.goldLedge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickPressed: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.ink,
    transform: [{ translateY: 5 }],
  },
  pickText: {
    fontFamily: 'Silkscreen_700Bold',
    fontSize: 22,
    color: COLORS.ink,
    letterSpacing: 1,
  },
  hills: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
});