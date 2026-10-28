import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnimalMove } from '../../battle/animals';

type Move = AnimalMove & { pp: number; maxPp: number };

const INK = '#1B1612';
const GOLD = '#F5C542';

// Bright "dopamine" colors by what the move does (same groups as the ribbons)
export const moveColor = (m: { power: number }) =>
  m.power <= 0
    ? { main: '#B26BFF', dark: '#6E33C2', label: 'SUPPORT' } // violet
    : m.power >= 95
      ? { main: '#FF4F79', dark: '#B8234A', label: 'FINISHER' } // hot pink
      : m.power >= 85
        ? { main: '#3DA5FF', dark: '#1D64B8', label: 'STRONG' } // electric blue
        : { main: '#4FE08A', dark: '#1F9A52', label: 'STEADY' }; // mint

// Your 4 moves as stone tablets of Mount Sinai: arched top in the move's color,
// a gold frame, and PP shown as little pips. 2 x 2.
export default function MoveTablets({ moves, onPick }: { moves: Move[]; onPick: (m: Move) => void }) {
  return (
    <View style={styles.grid}>
      {moves.map((m) => {
        const empty = m.pp <= 0;
        const c = moveColor(m);
        return (
          <Pressable
            key={m.key}
            onPress={() => onPick(m)}
            accessibilityRole="button"
            accessibilityLabel={`${m.name}, ${m.verse_ref}. ${m.description}. ${m.pp} of ${m.maxPp} uses left`}
            style={({ pressed }) => [styles.tablet, { borderBottomColor: c.dark }, empty && styles.tabletEmpty, pressed && !empty && styles.pressed]}
          >
            {/* Arched colored top */}
            <View style={[styles.arch, { backgroundColor: c.main, borderColor: c.dark }]}>
              <Text style={styles.kind}>{c.label}</Text>
            </View>

            {/* Gold-framed stone face */}
            <View style={styles.face}>
              <View style={[styles.corner, { top: 3, left: 3 }]} />
              <View style={[styles.corner, { top: 3, right: 3 }]} />
              <View style={[styles.corner, { bottom: 3, left: 3 }]} />
              <View style={[styles.corner, { bottom: 3, right: 3 }]} />

              <Text style={styles.name} numberOfLines={2}>
                {m.name.toUpperCase()}
              </Text>
              <Text style={styles.ref} numberOfLines={1}>
                {m.verse_ref}
              </Text>

              <View style={styles.bottomRow}>
                <Text style={[styles.power, { color: c.main }]}>{m.power > 0 ? `PWR ${m.power}` : '✦'}</Text>
                <View style={styles.pips}>
                  {Array.from({ length: m.maxPp }, (_, i) => (
                    <View key={i} style={[styles.pip, i < m.pp ? { backgroundColor: GOLD } : styles.pipUsed]} />
                  ))}
                </View>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tablet: {
    width: '48.5%',
    backgroundColor: '#58525F', // stone
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 7,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  tabletEmpty: { opacity: 0.4 },
  pressed: { borderBottomWidth: 3, transform: [{ translateY: 4 }] },
  arch: {
    height: 22,
    borderBottomWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kind: { fontFamily: 'Silkscreen_700Bold', fontSize: 10, color: '#FFFFFF', letterSpacing: 1 },
  face: {
    margin: 6,
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: '#433E4A',
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 92,
  },
  corner: { position: 'absolute', width: 4, height: 4, backgroundColor: GOLD },
  name: { fontFamily: 'Silkscreen_700Bold', fontSize: 12, lineHeight: 14, color: '#FFFFFF', textAlign: 'center' },
  ref: { fontFamily: 'Montserrat_700Bold', fontSize: 11, color: '#FFD23D', marginTop: 5 },
  bottomRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 6,
  },
  power: { fontFamily: 'Silkscreen_700Bold', fontSize: 11 },
  pips: { flexDirection: 'row', gap: 3 },
  pip: { width: 7, height: 7, borderWidth: 1, borderColor: INK },
  pipUsed: { backgroundColor: '#2A2630' },
});
