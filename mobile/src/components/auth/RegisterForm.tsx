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
import { Image } from 'expo-image';

// Soul Feeder dark academia palette type shi
const COLORS = {
  background: '#2B211B', // walnut
  header: '#3D2B22', // mahogany
  ink: '#1B1612', // outlines and input fill
  border: '#5A3E2B', // oak
  placeholder: '#9C6B43', // saddle
  icon: '#9C6B43', // saddle
  inputText: '#E8D9B5', // parchment
  label: '#C9B48A', // vellum
  strong: '#D9A441', // candle gold
  error: '#E06A4F', // ember
  title: '#D9A441', // candle gold
  titleLight: '#C9B48A', // vellum
  button: '#D9A441', // candle gold
  buttonLedge: '#8A6420', // dark gold
  close: '#E8D9B5', // parchment
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
        selectionColor={COLORS.strong}
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
              <Ionicons name="close-outline" size={34} color={COLORS.close} />
            </Pressable>
          </View>

          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.titleLight}>Let’s</Text>
              <Text style={styles.titleBold} accessibilityRole="header">
                {'Create\nYour\nAccount'}
              </Text>
            </View>
            <Image
              source={require('../../../assets/images/jesus_walking.gif')}
              style={styles.jesus}
              contentFit="contain"
              accessibilityLabel="Jesus walking with a staff"
            />
          </View>
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
              {agreed && <Ionicons name="checkmark" size={12} color={COLORS.ink} />}
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
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: COLORS.header,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.ink,
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
    backgroundColor: COLORS.label,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleCol: {
    flex: 1,
  },
  jesus: {
    width: 120,
    height: 140,
  },
  titleLight: {
    fontFamily: 'Montserrat_300Light',
    fontSize: 44,
    lineHeight: 48,
    color: COLORS.titleLight,
    marginTop: 8,
  },
  titleBold: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 44,
    lineHeight: 46,
    color: COLORS.title,
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
    height: 56,
    backgroundColor: COLORS.ink,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingLeft: 18,
    paddingRight: 16,
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
    borderWidth: 2,
    borderColor: COLORS.label,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: COLORS.strong,
    borderColor: COLORS.strong,
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
    color: COLORS.error,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 14,
  },
  button: {
    height: 56,
    backgroundColor: COLORS.button,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderBottomWidth: 6,
    borderBottomColor: COLORS.buttonLedge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.ink,
    transform: [{ translateY: 4 }],
  },
  buttonText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 17,
    color: COLORS.ink,
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
    color: COLORS.strong,
  },
});