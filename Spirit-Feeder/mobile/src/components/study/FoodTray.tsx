import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const INK = '#1B1612';

export type FoodKind = 'bread' | 'water' | 'wine';
export type FoodCounts = Record<FoodKind, number>;

export const FOODS: { key: FoodKind; name: string; icon: number; how: string }[] = [
  { key: 'bread', name: 'Bread', icon: require('../../../assets/images/food_bread.png'), how: 'Read a verse' },
  { key: 'water', name: 'Water', icon: require('../../../assets/images/food_water.png'), how: 'Memorize' },
  { key: 'wine', name: 'Wine', icon: require('../../../assets/images/food_wine.png'), how: 'Every Sabbath' },
];

type Props = {
  visible: boolean;
  counts: FoodCounts;
  petName: string;
  full: boolean;
  onFeed: (kind: FoodKind) => void;
  onRead: () => void;
  onMemorize: () => void;
  onClose: () => void;
};

// Food basket that slides up from the bottom of the study.
export default function FoodTray({ visible, counts, petName, full, onFeed, onRead, onMemorize, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const who = petName || 'your pet';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close food basket" />

        <View style={[styles.panel, { paddingBottom: insets.bottom + 18 }]} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              FOOD BASKET
            </Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.close}>X</Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>{full ? `${who} is full!` : `Tap a food to feed ${who}`}</Text>

          <View style={styles.row}>
            {FOODS.map((f) => {
              const count = counts[f.key];
              const empty = count <= 0;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => onFeed(f.key)}
                  disabled={empty || full}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.name}, ${count} left`}
                  style={({ pressed }) => [styles.slot, (empty || full) && styles.slotOff, pressed && styles.slotPressed]}
                >
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{`x${count}`}</Text>
                  </View>
                  <Image source={f.icon} style={styles.icon} />
                  <Text style={styles.foodName}>{f.name.toUpperCase()}</Text>
                  <Text style={styles.how}>{f.how}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />
          <Text style={styles.earnTitle}>EARN MORE FOOD</Text>

          <View style={styles.earnRow}>
            <Pressable
              onPress={onRead}
              accessibilityRole="button"
              accessibilityLabel="Read a verse to earn bread"
              style={({ pressed }) => [styles.earn, pressed && styles.earnPressed]}
            >
              <Text style={styles.earnText}>READ</Text>
              <Text style={styles.earnSub}>+1 bread</Text>
            </Pressable>
            <Pressable
              onPress={onMemorize}
              accessibilityRole="button"
              accessibilityLabel="Memorize a verse to earn water and bread"
              style={({ pressed }) => [styles.earn, pressed && styles.earnPressed]}
            >
              <Text style={styles.earnText}>MEMORIZE</Text>
              <Text style={styles.earnSub}>+1 water +1 bread</Text>
            </Pressable>
          </View>

          <Text style={styles.sabbath}>A cup of wine is a gift every Sabbath.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(27,22,18,0.55)', justifyContent: 'flex-end' },
  panel: {
    backgroundColor: '#3D2B22',
    borderTopWidth: 4,
    borderTopColor: '#D9A441',
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: INK,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 20, color: '#D9A441' },
  close: { fontFamily: 'Silkscreen_700Bold', fontSize: 20, color: '#C9B48A', paddingHorizontal: 6 },
  hint: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#E8D9B5', marginTop: 6, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10 },
  slot: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#2B211B',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 7,
    borderBottomColor: '#5A3E2B',
    paddingTop: 14,
    paddingBottom: 10,
  },
  slotOff: { opacity: 0.45 },
  slotPressed: { borderBottomWidth: 3, transform: [{ translateY: 4 }] },
  badge: {
    position: 'absolute',
    top: -10,
    right: -6,
    backgroundColor: '#D9A441',
    borderWidth: 2,
    borderColor: INK,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: { fontFamily: 'Silkscreen_700Bold', fontSize: 13, color: INK },
  icon: { width: 64, height: 64 },
  foodName: { fontFamily: 'Silkscreen_700Bold', fontSize: 13, color: '#E8D9B5', marginTop: 6 },
  how: { fontFamily: 'Montserrat_400Regular', fontSize: 10, color: '#C9B48A', marginTop: 2, textAlign: 'center' },
  divider: { height: 3, backgroundColor: INK, marginTop: 18, marginBottom: 12 },
  earnTitle: { fontFamily: 'Silkscreen_700Bold', fontSize: 14, color: '#C9B48A', marginBottom: 10 },
  earnRow: { flexDirection: 'row', gap: 10 },
  earn: {
    flex: 1,
    height: 58,
    backgroundColor: '#D9A441',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 7,
    borderBottomColor: '#8A6420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnPressed: { borderBottomWidth: 3, borderBottomColor: INK, transform: [{ translateY: 4 }] },
  earnText: { fontFamily: 'Silkscreen_700Bold', fontSize: 16, color: INK },
  earnSub: { fontFamily: 'Montserrat_500Medium', fontSize: 10, color: INK },
  sabbath: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#C9B48A',
    textAlign: 'center',
    marginTop: 14,
  },
});