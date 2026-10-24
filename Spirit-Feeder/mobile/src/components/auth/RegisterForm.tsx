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
import DateTimePicker from '@react-native-community/datetimepicker';
import { register } from '../../api/auth';

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

const DEFAULT_BIRTHDAY = new Date(2008, 0, 1);

// 
function toApiDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// April 21, 2008 style, for showing in the field
function toDisplayDate(date: Date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// --- Email checking ---
// name@domain.com shape: letters/numbers before @, a real-looking domain, and an ending like .com
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

// Common typos, so we can say "Did you mean ...?"
const TYPO_DOMAINS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'iclod.com': 'icloud.com',
  'icloud.co': 'icloud.com',
};

// Throwaway inboxes we don't accept
const BLOCKED_DOMAINS = [
  'mailinator.com',
  'yopmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'sharklasers.com',
  'tempmail.com',
  'temp-mail.org',
  'trashmail.com',
  'getnada.com',
  'dispostable.com',
];

// Returns an error message, or '' if the email looks good
function emailProblem(raw: string) {
  const email = raw.trim().toLowerCase();
  if (!email) return 'Enter your email address.';
  if (!EMAIL_RE.test(email) || email.includes('..') || email.length > 254) {
    return 'Enter a valid email address, like name@gmail.com.';
  }
  const [name, domain] = email.split('@');
  if (TYPO_DOMAINS[domain]) return `Did you mean ${name}@${TYPO_DOMAINS[domain]}?`;
  if (BLOCKED_DOMAINS.includes(domain)) return "Temporary emails can't be used. Use your real email address.";
  return '';
}

type FieldProps = ComponentProps<typeof TextInput> & {
  icon: ComponentProps<typeof Ionicons>['name'];
  inputRef?: Ref<TextInput>;
  revealable?: boolean; // password box with an eye button
  invalid?: boolean; // red border when the value is wrong
};

function Field({ icon, inputRef, revealable, invalid, ...props }: FieldProps) {
  const [shown, setShown] = useState(false);
  return (
    <View style={[styles.inputRow, invalid && styles.inputRowError]}>
      <Ionicons name={icon} size={16} color={invalid ? COLORS.error : COLORS.icon} />
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholderTextColor={COLORS.placeholder}
        selectionColor={COLORS.strong}
        {...props}
        secureTextEntry={revealable ? !shown : props.secureTextEntry}
      />
      {revealable ? (
        <Pressable
          onPress={() => setShown((s) => !s)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={shown ? 'Hide password' : 'Show password'}
          style={({ pressed }) => [styles.eye, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name={shown ? 'eye-off' : 'eye'} size={20} color={COLORS.icon} />
        </Pressable>
      ) : null}
    </View>
  );
}

type Props = {
  onBack: () => void;
  onHeaderLayout: (height: number) => void;
};

export default function RegisterForm({ onBack, onHeaderLayout }: Props) {
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // delete old error message
  const update = (setter: (text: string) => void) => (text: string) => {
    setter(text);
    if (error) setError('');
  };

  const openPicker = () => {
    Keyboard.dismiss();
    if (error) setError('');
    setShowPicker(true);
  };

  const goBack = () => {
    Keyboard.dismiss();
    setError('');
    setShowPicker(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    onBack();
  };

  const handleSignUp = async () => {
    Keyboard.dismiss();
    setShowPicker(false);
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username.trim()))
      return setError('Use 3 to 20 letters, numbers, or underscores for your username.');
    const badEmail = emailProblem(email);
    if (badEmail) {
      setEmailError(badEmail);
      return setError(badEmail);
    }
    if (!birthday) return setError('Choose your birthday.');
    if (password.length < 8) return setError('Use at least 8 characters for your password.');
    if (password !== confirm) return setError("Passwords don't match. Retype them to continue.");
    if (!agreed) return setError('Agree to the Terms & Privacy to continue.');
    setError('');
    setLoading(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        birthday: toApiDate(birthday),
      });
      setUsername('');
      setEmail('');
      setEmailError('');
      setBirthday(null);
      setPassword('');
      setConfirm('');
      setAgreed(false);
      Alert.alert('Your pet is ready', 'Log in with your new account to meet them.', [
        { text: 'Log in', onPress: goBack },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
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
              placeholder="Username"
              value={username}
              onChangeText={update(setUsername)}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            <Field
              inputRef={emailRef}
              icon="mail-outline"
              placeholder="Email Address"
              value={email}
              invalid={!!emailError}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError('');
                if (emailError) setEmailError('');
              }}
              onEndEditing={() => {
                if (email.trim()) setEmailError(emailProblem(email));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={openPicker}
            />
            {emailError ? (
              <Text style={styles.fieldError} accessibilityLiveRegion="polite">
                {emailError}
              </Text>
            ) : null}

            <Pressable
              style={[styles.inputRow, showPicker && styles.inputRowActive]}
              onPress={openPicker}
              accessibilityRole="button"
              accessibilityLabel={birthday ? `Birthday, ${toDisplayDate(birthday)}` : 'Choose your birthday'}
            >
              <Ionicons name="calendar-outline" size={16} color={showPicker ? COLORS.strong : COLORS.icon} />
              <Text style={[styles.dateText, !birthday && styles.datePlaceholder]}>
                {birthday ? toDisplayDate(birthday) : 'Birthday'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.icon} />
            </Pressable>

            {showPicker && (
              <View style={Platform.OS === 'ios' ? styles.pickerBox : undefined}>
                <DateTimePicker
                  value={birthday ?? DEFAULT_BIRTHDAY}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  themeVariant="dark"
                  textColor={COLORS.inputText}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') setShowPicker(false);
                    if (event.type === 'set' && date) setBirthday(date);
                  }}
                />
                {Platform.OS === 'ios' && (
                  <Pressable
                    style={({ pressed }) => [styles.doneButton, pressed && styles.donePressed]}
                    onPress={() => {
                      if (!birthday) setBirthday(DEFAULT_BIRTHDAY);
                      setShowPicker(false);
                      passwordRef.current?.focus();
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.doneText}>Done</Text>
                  </Pressable>
                )}
              </View>
            )}

            <Field
              inputRef={passwordRef}
              icon="lock-closed"
              placeholder="Password"
              value={password}
              onChangeText={update(setPassword)}
              revealable
              autoCapitalize="none"
              autoCorrect={false}
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
              revealable
              autoCapitalize="none"
              autoCorrect={false}
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
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Sign Up'}</Text>
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
    paddingTop: 40,
  },
  form: {
    gap: 14,
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
  inputRowActive: {
    borderColor: COLORS.strong,
  },
  inputRowError: {
    borderColor: COLORS.error,
  },
  fieldError: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: COLORS.error,
    marginTop: -6,
    marginLeft: 4,
  },
  eye: {
    marginLeft: 8,
    padding: 2,
  },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: 10,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: COLORS.inputText,
  },
  dateText: {
    flex: 1,
    marginLeft: 10,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: COLORS.inputText,
  },
  datePlaceholder: {
    color: COLORS.placeholder,
  },
  pickerBox: {
    backgroundColor: COLORS.ink,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingBottom: 12,
    alignItems: 'center',
  },
  doneButton: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    height: 44,
    backgroundColor: COLORS.button,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderBottomWidth: 5,
    borderBottomColor: COLORS.buttonLedge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donePressed: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.ink,
    transform: [{ translateY: 3 }],
  },
  doneText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 15,
    color: COLORS.ink,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    marginTop: 32,
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
    marginTop: 40,
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