import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const INK = '#1B1612';

type Props = {
  visible: boolean;
  petName: string;
  onStay: () => void;
  onLeave: () => void;
};

// "Leave the study?" pop-up with Stay / Log out.
export default function ExitModal({ visible, petName, onStay, onLeave }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStay}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onStay} accessibilityLabel="Stay" />
        <View style={styles.panel} accessibilityViewIsModal>
          <Text style={styles.title}>LEAVING ALREADY?</Text>
          <Text style={styles.body}>
            {petName
              ? `${petName} will be waiting for you in the study.`
              : 'Your pet will be waiting for you in the study.'}
          </Text>
          <Text style={styles.verse}>“The Lord bless thee, and keep thee.”{'\n'}Numbers 6:24</Text>

          <Pressable
            onPress={onStay}
            accessibilityRole="button"
            style={({ pressed }) => [styles.stay, pressed && styles.pressed]}
          >
            <Text style={styles.stayText}>STAY</Text>
          </Pressable>
          <Pressable
            onPress={onLeave}
            accessibilityRole="button"
            style={({ pressed }) => [styles.leave, pressed && { backgroundColor: '#5A3E2B' }]}
          >
            <Text style={styles.leaveText}>LOG OUT</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(27,22,18,0.75)', alignItems: 'center', justifyContent: 'center' },
  panel: {
    width: 300,
    backgroundColor: '#3D2B22',
    borderWidth: 3,
    borderColor: INK,
    padding: 22,
  },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 20, color: '#D9A441', textAlign: 'center' },
  body: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 15,
    color: '#E8D9B5',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 21,
  },
  verse: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#C9B48A',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 17,
  },
  stay: {
    marginTop: 20,
    height: 50,
    backgroundColor: '#D9A441',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 7,
    borderBottomColor: '#8A6420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { borderBottomWidth: 3, borderBottomColor: INK, transform: [{ translateY: 4 }] },
  stayText: { fontFamily: 'Silkscreen_700Bold', fontSize: 18, color: INK },
  leave: {
    marginTop: 12,
    height: 46,
    backgroundColor: '#2B211B',
    borderWidth: 2,
    borderColor: '#5A3E2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveText: { fontFamily: 'Silkscreen_700Bold', fontSize: 16, color: '#E8D9B5' },
});