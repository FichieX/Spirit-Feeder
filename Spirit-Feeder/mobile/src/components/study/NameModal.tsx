import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const INK = '#1B1612';

type Props = {
  visible: boolean;
  initial: string;
  warning?: string; // shown above the box, e.g. "you can only change it once"
  onSave: (name: string) => void;
  onClose: () => void;
};

// Pop-up to name (or rename) the pet.
export default function NameModal({ visible, initial, warning, onSave, onClose }: Props) {
  const [name, setName] = useState(initial);
  useEffect(() => {
    if (visible) setName(initial);
  }, [visible]);

  const clean = name.trim();
  const save = () => {
    if (clean) onSave(clean);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.panel}>
          <Text style={styles.title}>{warning ? 'RENAME YOUR PET' : 'NAME YOUR PET'}</Text>
          {warning ? <Text style={styles.warning}>{warning}</Text> : null}
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Bramble"
            placeholderTextColor="#9C6B43"
            maxLength={12}
            autoFocus
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={save}
            selectionColor="#D9A441"
            style={styles.input}
            accessibilityLabel="Pet name"
          />
          <Text style={styles.count}>{`${clean.length}/12`}</Text>
          <Pressable
            onPress={save}
            disabled={!clean}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, !clean && styles.buttonOff, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>SAVE</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(27,22,18,0.7)', alignItems: 'center', justifyContent: 'center' },
  panel: {
    width: 290,
    backgroundColor: '#3D2B22',
    borderWidth: 3,
    borderColor: INK,
    padding: 20,
    alignItems: 'stretch',
  },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 20, color: '#D9A441', textAlign: 'center', marginBottom: 14 },
  input: {
    height: 50,
    backgroundColor: INK,
    borderWidth: 2,
    borderColor: '#D9A441',
    paddingHorizontal: 14,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 18,
    color: '#E8D9B5',
  },
  warning: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    lineHeight: 19,
    color: '#E8D9B5',
    backgroundColor: '#5A2A22',
    borderLeftWidth: 3,
    borderLeftColor: '#E06A4F',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  count: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#C9B48A', textAlign: 'right', marginTop: 4 },
  button: {
    marginTop: 12,
    height: 50,
    backgroundColor: '#D9A441',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 7,
    borderBottomColor: '#8A6420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOff: { opacity: 0.5 },
  buttonPressed: { borderBottomWidth: 3, borderBottomColor: INK, transform: [{ translateY: 4 }] },
  buttonText: { fontFamily: 'Silkscreen_700Bold', fontSize: 18, color: INK },
});