import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const INK = '#1B1612';

// Usernames that get the TEST button in the study (lowercase).
// Register an account with one of these names to use the tools.
export const TEST_USERS = ['tester', 'test', 'admin'];

export const isTester = (username?: string) => !!username && TEST_USERS.includes(username.trim().toLowerCase());

export type TestAction = { label: string; onPress: () => void; danger?: boolean };
export type TestGroup = { title: string; actions: TestAction[] };

type Props = {
  visible: boolean;
  groups: TestGroup[];
  info: string; // one-line status, e.g. "Hunger 70% · Lv 1 · bread 3"
  onClose: () => void;
};

// Panel full of buttons for testing the pet (only shown to test accounts).
// Sits at the BOTTOM of the screen (away from the clock and battery), and
// tapping any button does the action and closes the panel.
// No open/close animation, so it never blocks the food basket from opening.
export default function TestPanel({ visible, groups, info, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
    <View style={styles.overlay}>
      {/* tap the dark area above the panel to close */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close test tools" />

      <View
        style={[styles.panel, { paddingBottom: insets.bottom + 12, maxHeight: height * 0.7 }]}
        accessibilityViewIsModal
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            TEST TOOLS
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.closeText}>CLOSE</Text>
          </Pressable>
        </View>
        <Text style={styles.info}>{info}</Text>

        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
          {groups.map((g) => (
            <View key={g.title} style={styles.group}>
              <Text style={styles.groupTitle}>{g.title.toUpperCase()}</Text>
              <View style={styles.row}>
                {g.actions.map((a) => (
                  <Pressable
                    key={a.label}
                    onPress={() => {
                      onClose();
                      a.onPress();
                    }}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.btn, a.danger && styles.btnDanger, pressed && styles.btnPressed]}
                  >
                    <Text style={[styles.btnText, a.danger && styles.btnTextDanger]}>{a.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27,22,18,0.55)',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2B211B',
    borderTopWidth: 4,
    borderTopColor: '#7FA36B',
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: INK,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 20, color: '#9CC48A' },
  closeBtn: {
    paddingHorizontal: 12,
    height: 34,
    justifyContent: 'center',
    backgroundColor: '#3D2B22',
    borderWidth: 2,
    borderColor: INK,
    borderBottomWidth: 4,
    borderBottomColor: '#5A3E2B',
  },
  closeText: { fontFamily: 'Silkscreen_700Bold', fontSize: 14, color: '#E8D9B5' },
  info: { fontFamily: 'Montserrat_500Medium', fontSize: 12, color: '#E8D9B5', marginTop: 6, marginBottom: 10 },
  group: { marginBottom: 12 },
  groupTitle: { fontFamily: 'Silkscreen_700Bold', fontSize: 12, color: '#C9B48A', marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    paddingHorizontal: 12,
    height: 38,
    justifyContent: 'center',
    backgroundColor: '#3D2B22',
    borderWidth: 2,
    borderColor: INK,
    borderBottomWidth: 5,
    borderBottomColor: '#5A3E2B',
  },
  btnDanger: { backgroundColor: '#5A2A22', borderBottomColor: '#3A1A14' },
  btnPressed: { borderBottomWidth: 2, transform: [{ translateY: 3 }] },
  btnText: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: '#E8D9B5' },
  btnTextDanger: { color: '#FFB4A2' },
});