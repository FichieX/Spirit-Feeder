import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Sprite from '../pets/Sprite';
import { PET_SCALE, animsFor, dressed } from '../../pets/forms';

// ---------- Art ----------
// Same size as the serpent arena: 128 x 112 pixel-art pixels, saved 8x.
const ARENA = require('../../../assets/images/sinai_arena.png');
const LIGHTNING = require('../../../assets/images/sinai_lightning.png');
const ARENA_W = 128;
const ARENA_H = 112;
const ENEMY_SPOT = { x: 96, y: 66 }; // where the enemy's feet stand (back platform)
const PET_SPOT = { x: 34, y: 106 }; // where your pet's feet stand (front platform)
const PET_SIZE = 0.68; // like the serpent battle
const ENEMY_SIZE = 0.52; // further away, so a bit smaller
export const SINAI_SKY = '#0A0F24';

const INK = '#1B1612';
const GOLD = '#D9A441';

type Fighter = {
  key: string; // donkey / lion / raven / camel
  name: string;
  level: number;
  hp: number;
  maxHp: number;
};

type Props = {
  pet: Fighter & { outfit: boolean; necklace: boolean };
  enemy: Fighter;
};

// Classic pixel HP bar: green, then yellow below half, red below a fifth
function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const frac = Math.max(0, Math.min(1, maxHp ? hp / maxHp : 0));
  const color = frac > 0.5 ? '#5DBB4C' : frac > 0.2 ? '#E8C53A' : '#D9483B';
  return (
    <View style={styles.hpRow}>
      <Text style={styles.hpTag}>HP</Text>
      <View style={styles.hpTrack}>
        <View style={[styles.hpFill, { width: `${frac * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// The battle on stormy Mount Sinai: your pet in front (bottom left), the other animal
// on the back platform (top right), facing each other like the serpent battle.
export default function SinaiArena({ pet, enemy }: Props) {
  const { width } = useWindowDimensions();
  const k = width / ARENA_W; // screen points per arena pixel
  const arenaH = ARENA_H * k;

  const petAnims = animsFor(pet.key, pet.level);
  const enemyAnims = animsFor(enemy.key, enemy.level);
  const petScale = k * PET_SIZE * ((petAnims.scale ?? PET_SCALE) / PET_SCALE);
  const enemyScale = k * ENEMY_SIZE * ((enemyAnims.scale ?? PET_SCALE) / PET_SCALE);

  // Lightning: a flash every few seconds
  const flash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const strike = () => {
      if (!alive) return;
      flash.setValue(0);
      Animated.sequence([
        Animated.timing(flash, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0.2, duration: 80, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0.9, duration: 50, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
      t = setTimeout(strike, 3500 + Math.random() * 4500);
    };
    t = setTimeout(strike, 1200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  return (
    <View style={{ width, height: arenaH, overflow: 'hidden' }}>
      <Image source={ARENA} style={{ position: 'absolute', width, height: arenaH }} />

      {/* Lightning bolt + sky flash */}
      <Animated.Image source={LIGHTNING} style={{ position: 'absolute', width, height: arenaH, opacity: flash }} />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#C9D6FF', opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }) }]}
      />

      {/* The other animal (back platform), turned to face your pet */}
      <View
        style={{
          position: 'absolute',
          left: ENEMY_SPOT.x * k - (enemyAnims.frameW * enemyScale) / 2,
          top: ENEMY_SPOT.y * k - enemyAnims.frameH * enemyScale,
          transform: [{ scaleX: -1 }],
        }}
      >
        <Sprite sheet={enemyAnims.idle.sheet} ms={enemyAnims.idle.ms} frameW={enemyAnims.frameW} frameH={enemyAnims.frameH} scale={enemyScale} />
      </View>

      {/* Your pet (front platform) */}
      <View
        style={{
          position: 'absolute',
          left: PET_SPOT.x * k - (petAnims.frameW * petScale) / 2,
          top: PET_SPOT.y * k - petAnims.frameH * petScale,
        }}
      >
        <Sprite
          sheet={dressed(petAnims.idle.sheet, pet.outfit, pet.necklace)}
          ms={petAnims.idle.ms}
          frameW={petAnims.frameW}
          frameH={petAnims.frameH}
          scale={petScale}
        />
      </View>

      {/* Enemy's box (top left) */}
      <View style={[styles.infoBox, { left: 8, top: 8 }]}>
        <View style={styles.nameRow}>
          <Text style={styles.infoName} numberOfLines={1}>
            {enemy.name.toUpperCase()}
          </Text>
          <Text style={styles.infoLevel}>Lv{enemy.level}</Text>
        </View>
        <HpBar hp={enemy.hp} maxHp={enemy.maxHp} />
      </View>

      {/* Your box (right, above the ground) */}
      <View style={[styles.infoBox, { right: 8, top: 74 * k }]}>
        <View style={styles.nameRow}>
          <Text style={styles.infoName} numberOfLines={1}>
            {pet.name.toUpperCase()}
          </Text>
          <Text style={styles.infoLevel}>Lv{pet.level}</Text>
        </View>
        <HpBar hp={pet.hp} maxHp={pet.maxHp} />
        <Text style={styles.hpNumbers}>{`${Math.max(0, Math.round(pet.hp))} / ${pet.maxHp}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  infoBox: {
    position: 'absolute',
    width: 150,
    backgroundColor: 'rgba(232,217,181,0.94)',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 4 },
  infoName: { flexShrink: 1, fontFamily: 'Silkscreen_700Bold', fontSize: 12, color: INK },
  infoLevel: { fontFamily: 'Silkscreen_700Bold', fontSize: 11, color: '#5A3E2B' },
  hpRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  hpTag: { fontFamily: 'Silkscreen_700Bold', fontSize: 9, color: GOLD, backgroundColor: INK, paddingHorizontal: 3 },
  hpTrack: { flex: 1, height: 8, backgroundColor: '#3A2A24', borderWidth: 2, borderColor: INK },
  hpFill: { height: '100%' },
  hpNumbers: { fontFamily: 'Silkscreen_700Bold', fontSize: 10, color: INK, textAlign: 'right', marginTop: 2 },
});

