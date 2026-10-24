import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { checkResetCode, requestResetCode, resetPassword } from '../api/password';

// Same palette as the login screen
const COLORS = {
  background: '#2B211B',
  sheet: '#3D2B22',
  ink: '#1B1612',
  inputBorder: '#5A3E2B',
  placeholder: '#9C6B43',
  inputText: '#E8D9B5',
  title: '#D9A441',
  text: '#C9B48A',
  button: '#D9A441',
  buttonLedge: '#8A6420',
  error: '#E06A4F',
  good: '#9CC48A',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_SECONDS = 60;

type Step = 'email' | 'code' | 'password' | 'done';

// Forgot password: email -> 6-digit code -> new password -> done
export default function ForgotPassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0); // seconds until "send again" works
  const confirmRef = useRef<TextInput>(null);

  // Countdown for "send the code again"
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const goLogin = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const run = async (job: () => Promise<void>) => {
    Keyboard.dismiss();
    setError('');
    setBusy(true);
    try {
      await job();
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      const clean = email.trim();
      if (!EMAIL_RE.test(clean)) throw new Error('Enter the email you signed up with.');
      await requestResetCode(clean);
      setCode('');
      setWait(RESEND_SECONDS);
      setStep('code');
    });

  const checkCode = () =>
    run(async () => {
      if (!/^\d{6}$/.test(code)) throw new Error('The code has 6 numbers.');
      await checkResetCode(email.trim(), code);
      setStep('password');
    });

  const savePassword = () =>
    run(async () => {
      if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
      if (password !== confirm) throw new Error("Passwords don't match. Retype them to continue.");
      await resetPassword(email.trim(), code, password);
      setPassword('');
      setConfirm('');
      setStep('done');
    });

  const Eye = () => (
    <Pressable
      onPress={() => setShow((s) => !s)}
      hitSlop={10}
      style={styles.eye}
      accessibilityRole="button"
      accessibilityLabel={show ? 'Hide password' : 'Show password'}
    >
      <Ionicons name={show ? 'eye-off' : 'eye'} size={22} color={COLORS.text} />
    </Pressable>
  );

  const Button = ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, (busy || disabled) && { opacity: 0.6 }]}
    >
      {busy ? <ActivityIndicator color={COLORS.ink} /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={goLogin} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to login">
          <Text style={styles.back}>‹ BACK</Text>
        </Pressable>

        <Text style={styles.title}>FORGOT PASSWORD</Text>
        <View style={styles.steps}>
          {(['email', 'code', 'password'] as Step[]).map((s, i) => {
            const order = ['email', 'code', 'password', 'done'];
            const doneStep = order.indexOf(step) > i;
            const current = step === s;
            return <View key={s} style={[styles.dot, (current || doneStep) && styles.dotOn]} />;
          })}
        </View>

        <View style={styles.sheet}>
          {step === 'email' ? (
            <>
              <Text style={styles.text}>Type the email you signed up with. We'll send you a 6-digit code.</Text>
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError('');
                }}
                placeholder="Email"
                placeholderTextColor={COLORS.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={sendCode}
                style={styles.input}
                accessibilityLabel="Email"
              />
              <Button label="SEND CODE" onPress={sendCode} />
            </>
          ) : null}

          {step === 'code' ? (
            <>
              <Text style={styles.text}>
                If <Text style={styles.strong}>{email.trim()}</Text> has an account, a code is on its way. Check your inbox and spam folder.
              </Text>
              <TextInput
                value={code}
                onChangeText={(t) => {
                  setCode(t.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                placeholder="000000"
                placeholderTextColor={COLORS.placeholder}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={checkCode}
                style={[styles.input, styles.codeInput]}
                accessibilityLabel="6-digit code"
              />
              <Button label="CHECK CODE" onPress={checkCode} disabled={code.length !== 6} />
              <View style={styles.row}>
                <Pressable onPress={sendCode} disabled={busy || wait > 0} hitSlop={8}>
                  <Text style={[styles.link, (busy || wait > 0) && { opacity: 0.5 }]}>
                    {wait > 0 ? `Send again in ${wait}s` : 'Send the code again'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setStep('email');
                    setError('');
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.link}>Change email</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 'password' ? (
            <>
              <Text style={styles.text}>Code accepted! Choose a new password (at least 8 characters).</Text>
              <View>
                <TextInput
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError('');
                  }}
                  placeholder="New password"
                  placeholderTextColor={COLORS.placeholder}
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  style={[styles.input, { paddingRight: 48 }]}
                  accessibilityLabel="New password"
                />
                <Eye />
              </View>
              <View>
                <TextInput
                  ref={confirmRef}
                  value={confirm}
                  onChangeText={(t) => {
                    setConfirm(t);
                    setError('');
                  }}
                  placeholder="Retype new password"
                  placeholderTextColor={COLORS.placeholder}
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={savePassword}
                  style={[styles.input, { paddingRight: 48 }]}
                  accessibilityLabel="Retype new password"
                />
                <Eye />
              </View>
              <Button label="SAVE PASSWORD" onPress={savePassword} />
            </>
          ) : null}

          {step === 'done' ? (
            <>
              <Text style={[styles.title, { color: COLORS.good, fontSize: 22 }]}>PASSWORD CHANGED!</Text>
              <Text style={[styles.text, { textAlign: 'center' }]}>You can log in with your new password now.</Text>
              <Button label="BACK TO LOGIN" onPress={goLogin} />
            </>
          ) : null}

          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 22 },
  back: { fontFamily: 'Silkscreen_700Bold', fontSize: 16, color: COLORS.inputText, marginBottom: 18 },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 26, color: COLORS.title, textAlign: 'center' },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 10, marginBottom: 18 },
  dot: { width: 28, height: 8, backgroundColor: COLORS.inputBorder },
  dotOn: { backgroundColor: COLORS.title },
  sheet: { backgroundColor: COLORS.sheet, borderWidth: 3, borderColor: COLORS.ink, padding: 18, gap: 14 },
  text: { fontFamily: 'Montserrat_400Regular', fontSize: 15, lineHeight: 22, color: COLORS.text },
  strong: { fontFamily: 'Montserrat_700Bold', color: COLORS.inputText },
  input: {
    height: 54,
    backgroundColor: COLORS.ink,
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 14,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 17,
    color: COLORS.inputText,
  },
  codeInput: { fontFamily: 'Silkscreen_700Bold', fontSize: 28, letterSpacing: 10, textAlign: 'center' },
  eye: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  button: {
    height: 56,
    backgroundColor: COLORS.button,
    borderWidth: 3,
    borderColor: COLORS.ink,
    borderBottomWidth: 7,
    borderBottomColor: COLORS.buttonLedge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { borderBottomWidth: 3, transform: [{ translateY: 4 }] },
  buttonText: { fontFamily: 'Silkscreen_700Bold', fontSize: 18, color: COLORS.ink, letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: COLORS.title, textDecorationLine: 'underline' },
  error: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: COLORS.error, textAlign: 'center' },
});
