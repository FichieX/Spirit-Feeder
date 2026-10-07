import { Image, StyleSheet, Text, View } from 'react-native';

const INK = '#1B1612';
const SEGMENTS = 16;

// Segmented green bar: how close the pet is to its next level / stage.
export function ProgressBar({ level, value }: { level: number; value: number }) {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * SEGMENTS);
  return (
    <View accessible accessibilityLabel={`Progress, level ${level}, ${Math.round(value * 100)} percent`}>
      <Text style={styles.label}>{`progress – lv ${level}`}</Text>
      <View style={styles.progressTrack}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <View key={i} style={[styles.segment, i < filled ? styles.segOn : styles.segOff]} />
        ))}
      </View>
    </View>
  );
}

// Hunger bar with a pixel heart: full means well fed.
export function HungerBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  const fillColor = pct > 0.5 ? '#6FA34E' : pct > 0.2 ? '#D9A441' : '#E06A4F';
  return (
    <View accessible accessibilityLabel={`Hunger, ${Math.round(pct * 100)} percent full`}>
      <Text style={[styles.label, { marginLeft: 22 }]}>hunger</Text>
      <View style={styles.hungerRow}>
        <View style={styles.hungerTrack}>
          <View style={[styles.hungerFill, { width: `${pct * 100}%`, backgroundColor: fillColor }]} />
        </View>
        <Image source={require('../../../assets/images/icon_heart.png')} style={styles.heart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#F5ECD2',
    marginBottom: 3,
    textShadowColor: INK,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  progressTrack: {
    flexDirection: 'row',
    width: 170,
    height: 20,
    padding: 3,
    gap: 2,
    backgroundColor: INK,
  },
  segment: { flex: 1 },
  segOn: { backgroundColor: '#9BCB4C' },
  segOff: { backgroundColor: '#4F7A2A' },
  hungerRow: { justifyContent: 'center' },
  hungerTrack: {
    marginLeft: 14,
    width: 156,
    height: 16,
    borderWidth: 3,
    borderColor: INK,
    backgroundColor: '#A79BBF',
  },
  hungerFill: { height: '100%' },
  heart: { position: 'absolute', left: -4, top: -8, width: 32, height: 32 },
});