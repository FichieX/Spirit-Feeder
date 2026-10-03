import { useRef, useState, type ComponentProps, type Ref } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  yellow: '#F6BC3F',
  cream: '#FDE8CF',
  border: '#E5472B',
  placeholder: '#E6765A',
  icon: '#EC9A80',
  inputText: '#C2461F',
  label: '#D2553B',
  strong: '#C8402A',
  dark: '#2E2D29',
  white: '#FFFFFF',
};

type FieldProps = ComponentProps<typeof TextInput> & {
  icon: ComponentProps<typeof Ionicons>['name'];
  inputRef?: Ref<TextInput>;
};


function Field({ icon, inputRef, ...props }: FieldProps) {
  return (
    <View style={styles.inputRow}>
      <Ionicons name={icon} size={16} color={COLORS.icon} />
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholderTextColor={COLORS.placeholder}
        selectionColor={COLORS.border}
        {...props}
      />
    </View>
  );
}

type Props = {
  onBack: () => void;
  onHeaderLayout: (height: number) => void;
};

export default function RegisterForm({ onBack, onHeaderLayout }: Props) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // delete old error message
  const update = (setter: (text: string) => void) => (text: string) => {
    setter(text);
    if (error) setError('');
  };

  const goBack = () => {
    Keyboard.dismiss();
    setError('');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    onBack();
  };

  const handleSignUp = () => {
    Keyboard.dismiss();
    if (!name.trim()) return setError('Enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Use at least 8 characters for your password.');
    if (password !== confirm) return setError("Passwords don't match. Retype them to continue.");
    if (!agreed) return setError('Agree to the Terms & Privacy to continue.');
    setError('');
    // so this gonnna send name, email and password to the FastAPI backend
    Alert.alert('Looks good', 'This will create the account once the backend is connected.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.header, { paddingTop: insets.top + 14 }]}
          onLayout={(e) => onHeaderLayout(e.nativeEvent.layout.height)}
        >
          <View style={styles.headerBar}>
            <Pressable style={styles.menu} hitSlop={12} accessibilityRole="button" accessibilityLabel="Menu">
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </Pressable>
            <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close-outline" size={34} color={COLORS.white} />
            </Pressable>
          </View>

          <Text style={styles.titleLight}>Let’s</Text>
          <Text style={styles.titleBold} accessibilityRole="header">
            {'Create\nYour\nAccount'}
          </Text>
        </View>

        <View style={styles.body}>
          <View style={styles.form}>
            <Field
              icon="person"
              placeholder="Full Name"
              value={name}
              onChangeText={update(setName)}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            <Field
              inputRef={emailRef}
              icon="mail-outline"
              placeholder="Email Address"
              value={email}
              onChangeText={update(setEmail)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"

              
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Field
              inputRef={passwordRef}
              icon="lock-closed"
              placeholder="Password"
              value={password}
              onChangeText={update(setPassword)}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <Field
              inputRef={confirmRef}
              icon="lock-closed"
              placeholder="Retype Password"
              value={confirm}
              onChangeText={update(setConfirm)}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />
          </View>

          <Pressable
            style={styles.agreeRow}
            onPress={() => {
              setAgreed((a) => !a);
              if (error) setError('');
            }}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
              {agreed && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
            </View>
            <Text style={styles.agreeText}>
              I agree to the <Text style={styles.agreeLink}>Terms & Privacy</Text>
            </Text>
          </Pressable>

          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={handleSignUp}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Sign Up</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Have an account? </Text>
            <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button">
              <Text style={styles.footerLink}>Sign In</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: COLORS.yellow,
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
    paddingHorizontal: 34,
    paddingBottom: 36,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 34,
  },
  menu: {
    flexDirection: 'row',
    gap: 5,
    paddingLeft: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.white,
  },
  titleLight: {
    fontFamily: 'Montserrat_300Light',
    fontSize: 44,
    lineHeight: 48,
    color: COLORS.white,
    marginTop: 8,
  },
  titleBold: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 44,
    lineHeight: 46,
    color: COLORS.white,
  },
  body: {
    paddingHorizontal: 52,
    paddingTop: 54,
  },
  form: {
    gap: 17,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingLeft: 36,
    paddingRight: 20,
  },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: 10,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: COLORS.inputText,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    marginTop: 52,
    marginBottom: 22,
    marginLeft: 6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: COLORS.border,
    borderColor: COLORS.border,
  },
  agreeText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11.5,
    color: COLORS.label,
  },
  agreeLink: {
    fontFamily: 'Montserrat_700Bold',
    color: COLORS.strong,
  },
  error: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12.5,
    color: COLORS.strong,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 14,
  },
  button: {
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.yellow,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 17,
    color: COLORS.white,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 48,
    marginLeft: 4,
  },
  footerText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: COLORS.label,
  },
  footerLink: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: COLORS.dark,
  },
});