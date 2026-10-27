import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

export type BattleMode = 'quiz' | 'verse';

const INK = '#1B1612';
const GOLD = '#D9A441';
const PARCHMENT = '#E8D9B5';

// The two modes, drawn as old book covers
const BOOKS: Record<
  BattleMode,
  { title: string; sub: string; icon: number; cover: string; spine: string; back: string[] }
> = {
  quiz: {
    title: 'QUIZ\nBATTLE',
    sub: 'Questions',
    icon: require('../../../assets/images/icon_scroll.png'),
    cover: '#6B2A22', // red leather
    spine: '#4A1C17',
    back: ['Same question for both players.', 'Fastest right answer attacks.', '3 hearts each.'],
  },
  verse: {
    title: 'VERSE\nBATTLE',
    sub: 'Verses as moves',
    icon: require('../../../assets/images/bible_cover.png'),
    cover: '#1F2E5A', // stormy Sinai blue
    spine: '#141E3D',
    back: ['Pick 4 verse moves.', 'Tap the word tiles in order to attack.', 'Knowing the verse wins!'],
  },
};

type Props = {
  mode: BattleMode;
  flipped: BattleMode | null; // which book shows its back (the rules)
  onTap: (mode: BattleMode) => void;
  points: Record<BattleMode, string>; // shown in gold at the bottom of each cover
};

// QUIZ BATTLE and VERSE BATTLE as two books side by side.
// Tap a book to choose it and flip it over to read what it is; tap again to flip back.
export default function ModeBooks({ mode, flipped, onTap, points }: Props) {
  return (
    <View style={styles.row}>
      {(['quiz', 'verse'] as BattleMode[]).map((m) => (
        <Book key={m} mode={m} chosen={mode === m} showBack={flipped === m} onTap={() => onTap(m)} points={points[m]} />
      ))}
    </View>
  );
}

function Book({ mode, chosen, showBack, onTap, points }: { mode: BattleMode; chosen: boolean; showBack: boolean; onTap: () => void; points: string }) {
  const b = BOOKS[mode];
  const turn = useRef(new Animated.Value(showBack ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(turn, { toValue: showBack ? 1 : 0, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
  }, [showBack]);

  const front = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const back = turn.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const name = b.title.replace('\n', ' ');

  return (
    <Pressable
      onPress={onTap}
      style={({ pressed }) => [styles.book, chosen && styles.bookChosen, pressed && { transform: [{ translateY: 2 }] }]}
      accessibilityRole="button"
      accessibilityState={{ selected: chosen }}
      accessibilityLabel={`${name}. ${b.back.join(' ')}`}
    >
      {/* Front cover */}
      <Animated.View style={[styles.face, { backgroundColor: b.cover, transform: [{ perspective: 800 }, { rotateY: front }] }]}>
        <View style={[styles.spine, { backgroundColor: b.spine }]} />
        <View style={styles.frame}>
          <Image source={b.icon} style={mode === 'verse' ? styles.bibleIcon : styles.icon} resizeMode="contain" />
          <Text style={styles.title}>{b.title}</Text>
          <Text style={styles.sub}>{b.sub}</Text>
          <Text style={styles.points}>{points}</Text>
        </View>
      </Animated.View>

      {/* Back: what this mode is */}
      <Animated.View style={[styles.face, styles.backFace, { transform: [{ perspective: 800 }, { rotateY: back }] }]}>
        <Text style={styles.backTitle}>{name}</Text>
        {b.back.map((line) => (
          <Text key={line} style={styles.backLine}>{`• ${line}`}</Text>
        ))}
        <Text style={styles.backHint}>Tap to close</Text>
      </Animated.View>

      {chosen ? (
        <View style={styles.chosenTag}>
          <Text style={styles.chosenText}>CHOSEN</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  book: { flex: 1, height: 196, borderWidth: 3, borderColor: INK, opacity: 0.7 },
  bookChosen: { borderColor: GOLD, opacity: 1 },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
    flexDirection: 'row',
  },
  spine: { width: 10, borderRightWidth: 2, borderRightColor: INK },
  frame: {
    flex: 1,
    margin: 8,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  icon: { width: 44, height: 44 },
  bibleIcon: { width: 34, height: 50 },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 17, lineHeight: 20, color: GOLD, textAlign: 'center', marginTop: 8 },
  sub: { fontFamily: 'Montserrat_500Medium', fontSize: 11, color: PARCHMENT, marginTop: 4, textAlign: 'center' },
  points: { fontFamily: 'Silkscreen_700Bold', fontSize: 12, color: GOLD, marginTop: 10 },
  backFace: {
    backgroundColor: PARCHMENT,
    flexDirection: 'column',
    padding: 12,
    justifyContent: 'center',
    gap: 6,
  },
  backTitle: { fontFamily: 'Silkscreen_700Bold', fontSize: 14, color: '#7A2626', textAlign: 'center', marginBottom: 2 },
  backLine: { fontFamily: 'Montserrat_500Medium', fontSize: 12, lineHeight: 16, color: '#3A281C' },
  backHint: { fontFamily: 'Montserrat_400Regular', fontSize: 10, color: '#8C7765', textAlign: 'center', marginTop: 4 },
  chosenTag: {
    position: 'absolute',
    top: -11,
    alignSelf: 'center',
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: INK,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  chosenText: { fontFamily: 'Silkscreen_700Bold', fontSize: 10, color: INK },
});
