import { useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnimalMove } from '../../battle/animals';

type Move = AnimalMove & { pp: number; maxPp: number };

type Props = {
  moves: Move[]; // every move this pet can bring
  selected: Move[]; // the ones on the lectern (max 4)
  onToggle: (move: Move) => void; // put on / take off the lectern
  onStart: () => void;
};

const INK = '#1B1612';
const GOLD = '#D9A441';
const PARCHMENT = '#E8D9B5';
const DIM = '#8C7765';
const SLOTS = 4;

// Ribbon color by what the move does
const ribbonColor = (m: Move) =>
  m.power <= 0 ? { body: '#5B3F8C', dark: '#3D2A61' } // support (shield, rest...)
  : m.power >= 95 ? { body: '#9C2B26', dark: '#6B1C18' } // finisher
  : m.power >= 85 ? { body: '#2E4A8C', dark: '#1E3263' } // strong
  : { body: '#3F7A4A', dark: '#2A5532' }; // steady

// Step 1 of a verse battle: the moves hang out of a Bible as bookmark ribbons.
// Drag a ribbon down onto the lectern (or just tap it). Tap a ribbon on the lectern to take it off.
export default function MovePicker({ moves, selected, onToggle, onStart }: Props) {
  const lectern = useRef<View>(null);
  const zone = useRef({ top: 0, bottom: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const full = selected.length >= SLOTS;
  const ready = selected.length === SLOTS || (moves.length < SLOTS && selected.length === moves.length);

  const measureLectern = () =>
    lectern.current?.measureInWindow((_x, y, _w, h) => {
      zone.current = { top: y - 30, bottom: y + h + 30 }; // a little forgiving
    });

  const add = (m: Move) => {
    if (selected.some((s) => s.key === m.key)) return;
    if (full) {
      setHint('The lectern is full. Tap a ribbon on it to take it off.');
      return;
    }
    setHint('');
    onToggle(m);
  };

  return (
    <View style={styles.wrap}>
      {/* The Bible with its ribbons */}
      <View style={styles.bibleHead}>
        <Image source={require('../../../assets/images/bible_cover.png')} style={styles.bible} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.head}>CHOOSE 4 VERSE RIBBONS</Text>
          <Text style={styles.sub}>Drag a ribbon onto the lectern, or tap it. Tap it again to take it off.</Text>
        </View>
      </View>

      <View style={[styles.ribbons, dragging && { zIndex: 10, elevation: 10 }]}>
        {moves.map((m) => (
          <Ribbon
            key={m.key}
            move={m}
            used={selected.some((s) => s.key === m.key)}
            lifted={dragging === m.key}
            onTap={() => (selected.some((s) => s.key === m.key) ? onToggle(m) : add(m))}
            onDragStart={() => {
              measureLectern();
              setDragging(m.key);
            }}
            onDragEnd={(y) => {
              setDragging(null);
              if (y >= zone.current.top && y <= zone.current.bottom) add(m);
            }}
          />
        ))}
      </View>

      {/* The lectern */}
      <View ref={lectern} onLayout={measureLectern} style={[styles.lectern, dragging && !full && styles.lecternGlow]}>
        <View style={styles.lecternTop}>
          {Array.from({ length: SLOTS }, (_, i) => {
            const m = selected[i];
            if (!m) {
              return (
                <View key={i} style={styles.slotEmpty}>
                  <Text style={styles.slotEmptyText}>{dragging ? 'DROP' : i + 1}</Text>
                </View>
              );
            }
            const c = ribbonColor(m);
            return (
              <Pressable
                key={m.key}
                onPress={() => {
                  setHint('');
                  onToggle(m);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${m.name}, on the lectern. Tap to take it off`}
                style={({ pressed }) => [styles.slot, { backgroundColor: c.body, borderColor: c.dark }, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.slotName} numberOfLines={2}>
                  {m.name}
                </Text>
                <Text style={styles.slotPower}>{m.power > 0 ? `PWR ${m.power}` : 'SUPPORT'}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.lecternStand} />
      </View>

      <Text style={[styles.hint, hint && { color: '#E06A4F' }]}>{hint || `${selected.length} / ${Math.min(SLOTS, moves.length)} on the lectern`}</Text>

      <Pressable
        disabled={!ready}
        onPress={onStart}
        accessibilityRole="button"
        style={({ pressed }) => [styles.start, !ready && styles.startOff, pressed && ready && styles.startPressed]}
      >
        <Text style={[styles.startText, !ready && { color: DIM }]}>START BATTLE</Text>
      </Pressable>
    </View>
  );
}

function Ribbon({
  move,
  used,
  lifted,
  onTap,
  onDragStart,
  onDragEnd,
}: {
  move: Move;
  used: boolean;
  lifted: boolean;
  onTap: () => void;
  onDragStart: () => void;
  onDragEnd: (pageY: number) => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const c = ribbonColor(move);
  // Keep the latest callbacks in refs, so the drag handler isn't rebuilt in the middle of a drag
  const cb = useRef({ onDragStart, onDragEnd });
  cb.current = { onDragStart, onDragEnd };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Taps go to the Pressable; a real drag (more than a few points) takes over
        onMoveShouldSetPanResponderCapture: (_e, g) => !used && Math.abs(g.dx) + Math.abs(g.dy) > 8,
        onPanResponderGrant: () => cb.current.onDragStart(),
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_e, g) => {
          cb.current.onDragEnd(g.moveY);
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 7 }).start();
        },
        onPanResponderTerminate: () => {
          cb.current.onDragEnd(-1);
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        },
      }),
    [used],
  );

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[styles.ribbonWrap, lifted && styles.lifted, { transform: pan.getTranslateTransform() }]}
    >
      <Pressable
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel={`${move.name}, ${move.verse_ref}, ${move.power > 0 ? `power ${move.power}` : 'support move'}${used ? ', on the lectern. Tap to take it off' : ''}`}
        style={[styles.ribbon, { backgroundColor: c.body }, used && styles.ribbonUsed]}
      >
        <View style={[styles.thread, { backgroundColor: c.dark }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.ribbonName} numberOfLines={1}>
            {move.name}
          </Text>
          <Text style={styles.ribbonRef} numberOfLines={1}>
            {move.verse_ref}
          </Text>
        </View>
        <Text style={styles.ribbonPower}>{move.power > 0 ? move.power : '✦'}</Text>
        {/* V-cut ribbon tail */}
        <View style={styles.tail}>
          <View style={[styles.tailTop, { borderLeftColor: c.body }]} />
          <View style={[styles.tailBottom, { borderLeftColor: c.body }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 8 },
  bibleHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bible: { width: 36, height: 52 },
  head: { fontFamily: 'Silkscreen_700Bold', fontSize: 15, color: GOLD },
  sub: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: DIM, marginTop: 2 },
  ribbons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 2 },
  ribbonWrap: { width: '48.5%' },
  lifted: { zIndex: 50, elevation: 50, opacity: 0.92 },
  ribbon: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 4,
    marginRight: 14, // room for the tail
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: INK,
    borderLeftWidth: 2,
    gap: 6,
  },
  ribbonUsed: { opacity: 0.3 },
  thread: { width: 3, alignSelf: 'stretch', marginVertical: 4 },
  ribbonName: { fontFamily: 'Montserrat_700Bold', fontSize: 12, color: PARCHMENT },
  ribbonRef: { fontFamily: 'Montserrat_500Medium', fontSize: 10, color: 'rgba(232,217,181,0.75)', marginTop: 1 },
  ribbonPower: { fontFamily: 'Silkscreen_700Bold', fontSize: 12, color: GOLD },
  tail: { position: 'absolute', right: -14, top: -2, bottom: -2, width: 14 },
  tailTop: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderBottomWidth: 23,
    borderBottomColor: 'transparent',
  },
  tailBottom: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderTopWidth: 23,
    borderTopColor: 'transparent',
  },
  lectern: { alignItems: 'center', marginTop: 6 },
  lecternGlow: { shadowColor: GOLD, shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  lecternTop: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 6,
    padding: 8,
    backgroundColor: '#6B4428',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 8,
    borderBottomColor: '#4A2E1B',
  },
  lecternStand: { width: 36, height: 34, backgroundColor: '#5A3A22', borderWidth: 3, borderTopWidth: 0, borderColor: INK },
  slot: { flex: 1, height: 64, borderWidth: 2, padding: 4, justifyContent: 'space-between' },
  slotName: { fontFamily: 'Montserrat_700Bold', fontSize: 10, lineHeight: 12, color: PARCHMENT },
  slotPower: { fontFamily: 'Silkscreen_700Bold', fontSize: 9, color: GOLD },
  slotEmpty: {
    flex: 1,
    height: 64,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#A07A52',
    backgroundColor: 'rgba(232,217,181,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmptyText: { fontFamily: 'Silkscreen_700Bold', fontSize: 12, color: '#C9A77A' },
  hint: { fontFamily: 'Montserrat_500Medium', fontSize: 12, color: DIM, textAlign: 'center' },
  start: {
    height: 54,
    backgroundColor: '#2E4A8C',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 7,
    borderBottomColor: '#141E3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startOff: { backgroundColor: '#3D2B22', borderBottomColor: '#2A1E17' },
  startPressed: { borderBottomWidth: 3, transform: [{ translateY: 4 }] },
  startText: { fontFamily: 'Silkscreen_700Bold', fontSize: 18, color: '#F2E6C8', letterSpacing: 1 },
});
