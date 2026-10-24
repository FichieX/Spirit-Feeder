import { StyleSheet, Text, View } from 'react-native';

const INK = '#1B1612';

// Chunky pixel speech bubble with a little tail at the bottom-left.
export default function SpeechBubble({ text }: { text: string }) {
  return (
    <View accessibilityLiveRegion="polite">
      <View style={styles.bubble}>
        <Text style={styles.text}>{text}</Text>
      </View>
      <View style={styles.tailOuter} />
      <View style={styles.tailInner} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 6,
    borderBottomColor: '#C9D3E8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 210,
  },
  text: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: INK,
    textAlign: 'center',
  },
  tailOuter: {
    position: 'absolute',
    bottom: -9,
    left: 24,
    width: 14,
    height: 12,
    backgroundColor: INK,
  },
  tailInner: {
    position: 'absolute',
    bottom: -4,
    left: 27,
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF',
  },
});