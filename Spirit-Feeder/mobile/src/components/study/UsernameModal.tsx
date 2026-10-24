import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { USERNAME_RULE } from '../../api/account';

const INK = '#1B1612';
const GOLD = '#D9A441';

type Props = {
  visible: boolean;
  current: string;
  onSubmit: (newName: string) => Promise<void>; // throws with a message if the server says no
  onClose: () => void;
};

// Pop-up to change the username. Asks "are you sure?" first, because it can only be changed once.
export default function UsernameModal({ visible, current, onSubmit, onClose }: Props) {
  const [name, setName] = useState(current);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (visible) {
      setName(current);
      setError('');
      setBusy(false);
    }
  }, [visible]);

  const clean = name.trim();
  const ok = USERNAME_RULE.test(clean) && clean !== current;

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      await onSubmit(clean);
    } catch (err: any) {
      setError(err?.message || "Couldn't change your username.");
      setBusy(false);
    }
  };

  const save = () => {
    if (!USERNAME_RULE.test(clean)) {
      setError('Use 3 to 20 letters, numbers, or underscores.');
      return;
    }
    if (clean === current) {
      setError("That's already your username.");
      return;
    }
    Alert.alert('Change username?', `Your username will be "${clean}" from now on. You can't change it again after this.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Change it', onPress: send },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={styles.fill} onPress={() => !busy && onClose()} accessibilityLabel="Close" />
        <View style={styles.panel}>
          <Text style={styles.title}>CHANGE USERNAME</Text>
          <Text style={styles.warning}>You can only change your username once. After this it's permanent.</Text>
          <TextInput
            value={name}
            onChangeText={(t: string) => {
              setName(t);
              setError('');
            }}
            placeholder="new_username"
            placeholderTextColor="#9C6B43"
            maxLength={20}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={save}
            selectionColor={GOLD}
            style={styles.input}
            accessibilityLabel="New username"
            editable={!busy}
          />
          <Text style={styles.hint}>3-20 letters, numbers or _ · {`${clean.length}/20`}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            onPress={save}
            disabled={!ok || busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, (!ok || busy) && styles.buttonOff, pressed && styles.buttonPressed]}
          >
            {busy ? <ActivityIndicator color={INK} /> : <Text style={styles.buttonText}>SAVE</Text>}
          </Pressable>
          <Pressable onPress={onClose} disabled={busy} accessibilityRole="button" style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(27,22,18,0.7)', alignItems: 'center', justifyContent: 'center' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  panel: { width: 300, backgroundColor: '#3D2B22', borderWidth: 3, borderColor: INK, padding: 20, alignItems: 'stretch' },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 18, color: GOLD, textAlign: 'center', marginBottom: 10 },
  warning: { fontFamily: 'Montserrat_500Medium', fontSize: 13, lineHeight: 18, color: '#E8D9B5', textAlign: 'center', marginBottom: 12 },
  input: {
    height: 50,
    backgroundColor: INK,
    borderWidth: 2,
    borderColor: GOLD,
    paddingHorizontal: 14,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 18,
    color: '#E8D9B5',
  },
  hint: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#8C7765', marginTop: 6 },
  error: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#E06A4F', marginTop: 8 },
  button: {
    marginTop: 14,
    height: 50,
    backgroundColor: '#F2BE4A',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 7,
    borderBottomColor: '#B07E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOff: { opacity: 0.5 },
  buttonPressed: { borderBottomWidth: 3, transform: [{ translateY: 4 }] },
  buttonText: { fontFamily: 'Silkscreen_700Bold', fontSize: 18, color: INK },
  cancel: { alignItems: 'center', paddingTop: 12 },
  cancelText: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#C9B48A', textDecorationLine: 'underline' },
});
