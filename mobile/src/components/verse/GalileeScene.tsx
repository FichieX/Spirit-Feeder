import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View, useWindowDimensions } from 'react-native';

// The Sea of Galilee at sunrise, as a living scene in layers (back to front):
//   sky + glowing sun -> drifting clouds -> sea with moving waves and sun sparkles ->
//   boats (rocking, with reflections and a wake) and seagulls -> waves lapping the shore -> swaying olive trees.
// Positions are pixel-art pixels of the 72 x 156 base picture (saved 8x), scaled to the screen width.
const ART_W = 72;
const ART_H = 156;
const SEA = 102; // where the water starts
const SHORE = 144; // where the sand starts
const SUN = { x: 60, y: 16 };

const IMG = {
  base: require('../../../assets/images/galilee_base.png'),
  glow: require('../../../assets/images/galilee_sun_glow.png'), // 26 x 26
  cloudA: require('../../../assets/images/galilee_cloud_a.png'), // 26 x 10
  cloudB: require('../../../assets/images/galilee_cloud_b.png'), // 18 x 8
  cloudC: require('../../../assets/images/galilee_cloud_c.png'), // 14 x 7
  wavesA: require('../../../assets/images/galilee_waves_a.png'), // 72 x 42, tiles sideways
  wavesB: require('../../../assets/images/galilee_waves_b.png'), // 72 x 42, tiles sideways
  foam: require('../../../assets/images/galilee_foam.png'), // 72 x 3
  sail: require('../../../assets/images/galilee_boat_sail.png'), // 16 x 16
  fish: require('../../../assets/images/galilee_boat_fish.png'), // 14 x 9
  wake: require('../../../assets/images/galilee_wake.png'), // 10 x 3
  gull: require('../../../assets/images/galilee_gull.png'), // 14 x 4 (two 7 x 4 frames)
  sparkle: require('../../../assets/images/galilee_sparkle.png'), // 3 x 3
  treeL: require('../../../assets/images/galilee_tree_left.png'), // 20 x 24
  treeR: require('../../../assets/images/galilee_tree_right.png'), // 22 x 28
};

const ease = Easing.inOut(Easing.sin);

// 0 -> 1 forever at a steady pace, starting part-way so the screen isn't empty at first
function useCross(seconds: number, startAt = 0) {
  const v = useRef(new Animated.Value(startAt)).current;
  useEffect(() => {
    let alive = true;
    const run = (from: number) => {
      v.setValue(from);
      Animated.timing(v, { toValue: 1, duration: seconds * 1000 * (1 - from), easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
        if (alive && finished) run(0);
      });
    };
    run(startAt);
    return () => {
      alive = false;
      v.stopAnimation();
    };
  }, []);
  return v;
}

// 0 -> 1 -> 0 forever, smooth like breathing (bobbing, rocking, swaying, glowing)
function useWave(ms: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ms, easing: ease, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: ms, easing: ease, useNativeDriver: true }),
      ]),
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, []);
  return v;
}

const range = (v: Animated.Value, a: number | string, b: number | string) =>
  v.interpolate({ inputRange: [0, 1], outputRange: [a, b] as any });

function Sparkle({ x, y, k, delay, every }: { x: number; y: number; k: number; delay: number; every: number }) {
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0, duration: 520, useNativeDriver: true }),
        Animated.delay(every),
      ]),
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, []);
  return <Animated.Image source={IMG.sparkle} style={{ position: 'absolute', left: x * k, top: y * k, width: 3 * k, height: 3 * k, opacity: o }} />;
}

// A seagull: crosses, rises and dips, flaps a few times then glides
function Gull({ k, y, seconds, startAt, rtl, dip }: { k: number; y: number; seconds: number; startAt: number; rtl?: boolean; dip: number }) {
  const t = useCross(seconds, startAt);
  const bob = useWave(1700 + dip * 150);
  const flap = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const beat = (n: number) =>
      Array.from({ length: n }, () => [
        Animated.timing(flap, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.delay(170),
        Animated.timing(flap, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(170),
      ]).flat();
    const loop = Animated.loop(Animated.sequence([...beat(4), Animated.delay(1400 + dip * 200)]));
    loop.start();
    return () => loop.stop();
  }, []);
  const from = rtl ? (ART_W + 4) * k : -10 * k;
  const to = rtl ? -10 * k : (ART_W + 4) * k;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: y * k,
        width: 7 * k,
        height: 4 * k,
        overflow: 'hidden',
        transform: [{ translateX: range(t, from, to) }, { translateY: range(bob, 0, -dip * k) }, { scaleX: rtl ? -1 : 1 }],
      }}
    >
      <Animated.Image source={IMG.gull} style={{ width: 14 * k, height: 4 * k, transform: [{ translateX: range(flap, 0, -7 * k) }] }} />
    </Animated.View>
  );
}

// A boat with its reflection; rocks and bobs on the water
function Boat({
  k,
  src,
  w,
  h,
  rock,
  wake,
  reflect = 0.6,
}: {
  k: number;
  src: number;
  w: number;
  h: number;
  rock: { ms: number; deg: number };
  wake?: boolean;
  reflect?: number; // reflection height compared to the boat
}) {
  const r = useWave(rock.ms);
  const b = useWave(rock.ms * 0.8, 300);
  const shimmer = useWave(600);
  return (
    <View style={{ width: w * k, height: h * 2 * k }}>
      {/* reflection: upside down, faint, wobbling */}
      <Animated.Image
        source={src}
        style={{
          position: 'absolute',
          top: h * k,
          width: w * k,
          height: h * k * reflect,
          opacity: range(shimmer, 0.18, 0.3),
          transform: [{ scaleY: -1 }, { translateX: range(shimmer, -0.5 * k, 0.5 * k) }],
        }}
      />
      {wake ? (
        <Animated.Image
          source={IMG.wake}
          style={{ position: 'absolute', left: -9 * k, top: (h - 2.5) * k, width: 10 * k, height: 3 * k, opacity: range(shimmer, 0.5, 0.95) }}
        />
      ) : null}
      <Animated.Image
        source={src}
        style={{
          width: w * k,
          height: h * k,
          transformOrigin: '50% 100%',
          transform: [{ translateY: range(b, 0, 0.8 * k) }, { rotate: range(r, `${-rock.deg}deg`, `${rock.deg}deg`) }],
        }}
      />
    </View>
  );
}

export default function GalileeScene() {
  const { width } = useWindowDimensions();
  const k = width / ART_W;

  const glow = useWave(2600);
  const cloudA = useCross(150, 0.1);
  const cloudB = useCross(110, 0.55);
  const cloudC = useCross(80, 0.8);
  const wavesA = useCross(20);
  const wavesB = useCross(13);
  const sail = useCross(60, 0.15); // the sailboat crosses the lake
  const drift = useWave(9000); // the fishing boat drifts a little while fishing
  const foam = useWave(2200);
  const swayL = useWave(2600);
  const swayR = useWave(3100, 700);

  // Wave strips: two copies side by side slide one picture-width, then repeat (seamless)
  const strip = (src: number, v: Animated.Value, dir: 1 | -1, opacity: Animated.AnimatedInterpolation<number> | number) => (
    <Animated.View
      style={{
        position: 'absolute',
        top: SEA * k,
        left: dir === 1 ? -ART_W * k : 0,
        flexDirection: 'row',
        opacity,
        transform: [{ translateX: range(v, 0, dir * ART_W * k) }],
      }}
    >
      <Image source={src} style={{ width: ART_W * k, height: (SHORE - SEA) * k }} />
      <Image source={src} style={{ width: ART_W * k, height: (SHORE - SEA) * k }} />
    </Animated.View>
  );

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#B8957A', overflow: 'hidden' }]}>
      <Image source={IMG.base} style={{ position: 'absolute', top: 0, left: 0, width, height: ART_H * k }} />

      {/* Sun glow, breathing */}
      <Animated.Image
        source={IMG.glow}
        style={{
          position: 'absolute',
          left: (SUN.x - 13) * k,
          top: (SUN.y - 13) * k,
          width: 26 * k,
          height: 26 * k,
          opacity: range(glow, 0.45, 0.95),
          transform: [{ scale: range(glow, 0.96, 1.08) }],
        }}
      />

      {/* Clouds drift slowly (higher = slower) */}
      <Animated.Image source={IMG.cloudA} style={{ position: 'absolute', top: 1 * k, width: 26 * k, height: 10 * k, transform: [{ translateX: range(cloudA, -26 * k, (ART_W + 2) * k) }] }} />
      <Animated.Image source={IMG.cloudB} style={{ position: 'absolute', top: 7 * k, width: 18 * k, height: 8 * k, transform: [{ translateX: range(cloudB, (ART_W + 2) * k, -18 * k) }] }} />
      <Animated.Image source={IMG.cloudC} style={{ position: 'absolute', top: 13 * k, width: 14 * k, height: 7 * k, transform: [{ translateX: range(cloudC, -14 * k, (ART_W + 2) * k) }] }} />

      {/* Seagulls high in the sky */}
      <Gull k={k} y={5} seconds={24} startAt={0.25} dip={2} />
      <Gull k={k} y={9} seconds={29} startAt={0.05} dip={3} />

      {/* Water: two layers of ripples moving opposite ways */}
      {strip(IMG.wavesA, wavesA, 1, 1)}
      {strip(IMG.wavesB, wavesB, -1, range(foam, 0.55, 1))}

      {/* Sunlight glittering on the water under the sun */}
      {[
        [59, 106, 0, 1700],
        [61, 112, 400, 2100],
        [57, 119, 900, 1500],
        [62, 125, 200, 1900],
        [58, 131, 1200, 1600],
        [60, 137, 700, 2300],
        [55, 128, 1500, 2600],
        [64, 118, 1100, 2000],
      ].map(([x, y, delay, every]) => (
        <Sparkle key={`${x}-${y}`} x={x} y={y} k={k} delay={delay} every={every} />
      ))}

      {/* Sailboat crossing the lake, with its wake */}
      <Animated.View style={{ position: 'absolute', top: 116 * k, transform: [{ translateX: range(sail, -20 * k, (ART_W + 12) * k) }] }}>
        <Boat k={k} src={IMG.sail} w={16} h={16} rock={{ ms: 1800, deg: 2.5 }} wake />
      </Animated.View>

      {/* Fishing boat: closer to us (lower on screen), so it's drawn in front of the sailboat */}
      <Animated.View style={{ position: 'absolute', top: 133 * k, left: 34 * k, transform: [{ translateX: range(drift, -6 * k, 6 * k) }] }}>
        <Boat k={k} src={IMG.fish} w={14} h={9} rock={{ ms: 1400, deg: 3 }} reflect={0.35} />
      </Animated.View>

      {/* A seagull low over the water */}
      <Gull k={k} y={121} seconds={19} startAt={0.6} rtl dip={2} />

      {/* Little waves lapping the shore */}
      <Animated.Image
        source={IMG.foam}
        style={{ position: 'absolute', top: (SHORE - 2) * k, width, height: 3 * k, opacity: range(foam, 0.35, 1), transform: [{ translateY: range(foam, -0.6 * k, 0.6 * k) }] }}
      />

      {/* Olive trees in front: the boats pass behind them */}
      <Animated.Image
        source={IMG.treeL}
        style={{
          position: 'absolute',
          left: -2 * k,
          top: (ART_H - 24) * k,
          width: 20 * k,
          height: 24 * k,
          transformOrigin: '50% 100%',
          transform: [{ rotate: range(swayL, '-1.5deg', '1.5deg') }],
        }}
      />
      <Animated.Image
        source={IMG.treeR}
        style={{
          position: 'absolute',
          left: (ART_W - 22) * k, // fully on screen, so no cut-off straight edge
          top: (ART_H - 28) * k,
          width: 22 * k,
          height: 28 * k,
          transformOrigin: '50% 100%',
          transform: [{ rotate: range(swayR, '1.2deg', '-1.2deg') }],
        }}
      />
    </View>
  );
}
