import { Pressable, StyleSheet, Text, View } from 'react-native';

const INK = '#1B1612';
const GOLD = '#D9A441';
const PARCHMENT = '#E8D9B5';
const DIM = '#8C7765';

type Props = {
  visible: boolean;
  petName: string;
  petNameLocked: boolean; // already changed once
  username: string;
  usernameLocked: boolean | null; // null = couldn't check with the server
  onChangePetName: () => void;
  onChangeUsername: () => void;
  onClose: () => void;
};

// Tap the name: pick what to rename. Each one can be changed once, then it's permanent.
// (A plain layer, not an iOS Modal, so the rename pop-up can open right after it.)
export default function NamesMenu({ visible, petName, petNameLocked, username, usernameLocked, onChangePetName, onChangeUsername, onClose }: Props) {
  if (!visible) return null;

  const Row = ({ label, value, locked, note, onPress }: { label: string; value: string; locked: boolean; note: string; onPress: () => void }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={1}>{value}</Text>
        <Text style={[styles.note, locked && { color: DIM }]}>{note}</Text>
      </View>
      <Pressable
        onPress={onPress}
        disabled={locked}
        accessibilityRole="button"
        accessibilityLabel={`Change ${label.toLowerCase()}`}
        style={({ pressed }) => [styles.btn, locked && styles.btnOff, pressed && styles.pressed]}
      >
        <Text style={[styles.btnText, locked && { color: DIM }]}>{locked ? 'LOCKED' : 'CHANGE'}</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.fill} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.panel} accessibilityViewIsModal>
        <Text style={styles.title}>NAMES</Text>
        <Row
          label="PET NAME"
          value={petName}
          locked={petNameLocked}
          note={petNameLocked ? 'Permanent (already changed once)' : 'You can change it once'}
          onPress={onChangePetName}
        />
        <Row
          label="USERNAME"
          value={username}
          locked={usernameLocked !== false}
          note={
            usernameLocked === null
              ? "Can't check right now (no connection to the server)"
              : usernameLocked
                ? 'Permanent'
                : 'You can change it once. Friends find you by it.'
          }
          onPress={onChangeUsername}
        />
        <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Text style={styles.closeText}>CLOSE</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 95,
    elevation: 95,
    backgroundColor: 'rgba(27,22,18,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  panel: { width: 310, backgroundColor: '#3D2B22', borderWidth: 3, borderColor: INK, padding: 18, gap: 4 },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 20, color: GOLD, textAlign: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#4A3226' },
  label: { fontFamily: 'Silkscreen_700Bold', fontSize: 11, color: DIM },
  value: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: PARCHMENT, marginTop: 2 },
  note: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: GOLD, marginTop: 2 },
  btn: {
    paddingHorizontal: 10,
    height: 36,
    justifyContent: 'center',
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: INK,
    borderBottomWidth: 4,
    borderBottomColor: '#8A6420',
  },
  btnOff: { backgroundColor: '#2B211B', borderBottomColor: '#5A3E2B' },
  btnText: { fontFamily: 'Silkscreen_700Bold', fontSize: 12, color: INK },
  close: {
    marginTop: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B211B',
    borderWidth: 2,
    borderColor: INK,
    borderBottomWidth: 4,
    borderBottomColor: '#5A3E2B',
  },
  closeText: { fontFamily: 'Silkscreen_700Bold', fontSize: 14, color: PARCHMENT },
  pressed: { transform: [{ translateY: 2 }], opacity: 0.85 },
});
