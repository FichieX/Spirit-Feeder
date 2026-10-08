import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DECOR, type DecorItem, type DecorKey, type DecorState } from '../../decor/items';

const INK = '#1B1612';
const GOLD = '#D9A441';
const PARCHMENT = '#E8D9B5';
const DIM = '#8C7765';

type Props = {
  visible: boolean;
  state: DecorState;
  onToggle: (key: DecorKey) => void; // put on / take off, hang up / take down
  onClose: () => void;
  note?: string; // e.g. "The adult lion always wears his cross"
};

// Decorate menu: drop-down lists for Clothes and Room (with Frames inside Room).
// A plain layer on top of the study (not an iOS Modal), like the test tools.
export default function DecorMenu({ visible, state, onToggle, onClose, note }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState<Record<string, boolean>>({ clothes: false, room: false, frames: false });
  if (!visible) return null;

  const flip = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const clothes = DECOR.filter((d) => d.group === 'clothes');
  const room = DECOR.filter((d) => d.group === 'room' && !d.sub);
  const frames = DECOR.filter((d) => d.sub === 'frames');
  const ownedCount = (items: DecorItem[]) => items.filter((d) => state.owned.includes(d.key)).length;

  const Row = ({ item, indent = 0 }: { item: DecorItem; indent?: number }) => {
    const owned = state.owned.includes(item.key);
    const used = state.used.includes(item.key);
    const on = item.group === 'clothes' ? 'WEAR' : 'HANG';
    const off = item.group === 'clothes' ? 'TAKE OFF' : 'TAKE DOWN';
    return (
      <View style={[styles.row, { paddingLeft: 10 + indent }]}>
        <Image source={item.icon} style={[styles.icon, !owned && styles.locked]} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, !owned && { color: DIM }]}>{item.name}</Text>
          {!owned ? <Text style={styles.hint}>Win it in a serpent battle</Text> : null}
        </View>
        {owned ? (
          <Pressable
            onPress={() => onToggle(item.key)}
            accessibilityRole="button"
            accessibilityLabel={`${used ? off : on} ${item.name}`}
            style={({ pressed }) => [styles.btn, used && styles.btnOn, pressed && styles.btnPressed]}
          >
            <Text style={styles.btnText}>{used ? off : on}</Text>
          </Pressable>
        ) : (
          <Text style={styles.lockText}>LOCKED</Text>
        )}
      </View>
    );
  };

  const Header = ({ id, title, count, total, indent = 0 }: { id: string; title: string; count: number; total: number; indent?: number }) => (
    <Pressable
      onPress={() => flip(id)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open[id] }}
      style={({ pressed }) => [styles.header, { marginLeft: indent }, indent > 0 && styles.subHeader, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.arrow}>{open[id] ? '▾' : '▸'}</Text>
      <Text style={styles.headerText}>{title}</Text>
      <Text style={styles.headerCount}>{`${count}/${total}`}</Text>
    </Pressable>
  );

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.fill} onPress={onClose} accessibilityLabel="Close decorate menu" />
      <View style={[styles.panel, { paddingBottom: insets.bottom + 12, maxHeight: height * 0.75 }]} accessibilityViewIsModal>
        <View style={styles.top}>
          <Text style={styles.title}>DECORATE</Text>
          <Pressable onPress={onClose} hitSlop={16} accessibilityRole="button" style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}>
            <Text style={styles.closeText}>CLOSE</Text>
          </Pressable>
        </View>

        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
          <Header id="clothes" title="CLOTHES" count={ownedCount(clothes)} total={clothes.length} />
          {open.clothes ? (
            <>
              {clothes.map((d) => (
                <Row key={d.key} item={d} />
              ))}
              {note ? <Text style={styles.note}>{note}</Text> : null}
              <View style={[styles.row, { paddingLeft: 10 }]}>
                <Image source={require('../../../assets/images/item_clothes.png')} style={[styles.icon, styles.locked]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: DIM }]}>Clothes</Text>
                  <Text style={styles.hint}>Coming soon</Text>
                </View>
              </View>
            </>
          ) : null}

          <Header id="room" title="ROOM" count={ownedCount([...room, ...frames])} total={room.length + frames.length} />
          {open.room ? (
            <>
              {room.map((d) => (
                <Row key={d.key} item={d} />
              ))}
              <Header id="frames" title="FRAMES" count={ownedCount(frames)} total={frames.length} indent={14} />
              {open.frames ? frames.map((d) => <Row key={d.key} item={d} indent={18} />) : null}
            </>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90, elevation: 90, backgroundColor: 'rgba(27,22,18,0.55)' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2B211B',
    borderTopWidth: 4,
    borderTopColor: GOLD,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: INK,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 20, color: GOLD },
  close: {
    paddingHorizontal: 12,
    height: 34,
    justifyContent: 'center',
    backgroundColor: '#3D2B22',
    borderWidth: 2,
    borderColor: INK,
    borderBottomWidth: 4,
    borderBottomColor: '#5A3E2B',
  },
  closeText: { fontFamily: 'Silkscreen_700Bold', fontSize: 14, color: PARCHMENT },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 10,
    marginTop: 8,
    backgroundColor: '#3D2B22',
    borderWidth: 2,
    borderColor: INK,
    borderBottomWidth: 4,
    borderBottomColor: '#5A3E2B',
  },
  subHeader: { height: 38, marginTop: 6, backgroundColor: '#34251D' },
  arrow: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: GOLD, width: 20 },
  headerText: { flex: 1, fontFamily: 'Silkscreen_700Bold', fontSize: 15, color: PARCHMENT },
  headerCount: { fontFamily: 'Montserrat_500Medium', fontSize: 12, color: DIM },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingRight: 4, borderBottomWidth: 1, borderBottomColor: '#3D2B22' },
  icon: { width: 40, height: 40 },
  locked: { opacity: 0.3 },
  name: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: PARCHMENT },
  hint: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: DIM, marginTop: 2 },
  note: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: DIM, paddingLeft: 10, paddingTop: 4 },
  lockText: { fontFamily: 'Silkscreen_700Bold', fontSize: 11, color: DIM },
  btn: {
    paddingHorizontal: 10,
    height: 34,
    justifyContent: 'center',
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: INK,
    borderBottomWidth: 4,
    borderBottomColor: '#8A6420',
  },
  btnOn: { backgroundColor: '#C9B48A', borderBottomColor: '#8C7765' },
  btnPressed: { borderBottomWidth: 2, transform: [{ translateY: 2 }] },
  btnText: { fontFamily: 'Silkscreen_700Bold', fontSize: 11, color: INK },
});
