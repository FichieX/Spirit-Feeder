import BibleButton from './BibleButton';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { login } from '../../api/auth';

// Soul Feeder dark academia palette type shi
const COLORS = {
  background: '#2B211B', // walnut
  sheet: '#3D2B22', // mahogany
  ink: '#1B1612', // outlines and input fill
  inputBorder: '#5A3E2B', // oak
  placeholder: '#9C6B43', // saddle
  inputText: '#E8D9B5', // parchment
  title: '#D9A441', // candle gold
  text: '#C9B48A', // vellum
  button: '#D9A441', // candle gold
  buttonLedge: '#8A6420', // dark gold
  secondary: '#2B211B', // walnut
  secondaryText: '#E8D9B5', // parchment
  error: '#E06A4F', // ember
};

type Props = {
  active: boolean;
  onCreateAccount: () => void;
  onForgotPassword: () => void;
  onSheetLayout: (height: number) => void;
};

export default function LoginForm({ active, onCreateAccount, onForgotPassword, onSheetLayout }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  // animation on title gng tis sooo PEAK
  const soulRise = useRef(new Animated.Value(0)).current;
  const feederRise = useRef(new Animated.Value(0)).current;
  const bibleRise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    soulRise.setValue(0);
    feederRise.setValue(0);
    bibleRise.setValue(0);
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) {
        soulRise.setValue(1);
        feederRise.setValue(1);
        bibleRise.setValue(1);
        return;
      }
      const rise = (value: Animated.Value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 1000,
          delay: 150,
          easing: Easing.out(Easing.back(1.6)),
          useNativeDriver: true,
        });
      Animated.stagger(220, [rise(soulRise), rise(feederRise), rise(bibleRise)]).start();
    });
  }, [active]);

  const riseStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({ inputRange: [0, 0.5], outputRange: [0, 1], extrapolate: 'clamp' as const }),
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) },
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
    ],
  });

  const lift = useRef(new Animated.Value(0)).current;
  const sheetHeight = useRef(0);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const move = (toValue: number, duration: number) =>
      Animated.timing(lift, {
        toValue,
        duration: duration || 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();

    const showSub = Keyboard.addListener(showEvent, (e) => {
      if (!activeRef.current) return;
      const overlap = e.endCoordinates.height - sheetHeight.current + 20;
      move(-Math.max(0, overlap), e.duration);
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => move(0, e.duration));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password) {
      setError('Enter your email or username and your password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user: any = await login(email.trim(), password);
      router.replace({
        pathname: '/home',
        params: { username: user.username, userId: String(user.id ?? user.user_id) },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={styles.screen} onPress={Keyboard.dismiss} accessible={false}>
      <Animated.View style={{ height, transform: [{ translateY: lift }] }}>
        <View style={[styles.top, { paddingTop: insets.top }]}>
          <Pressable
            style={[styles.menu, { top: insets.top + 27.5 }]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Menu"
          >
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </Pressable>

          <View accessible accessibilityRole="header" accessibilityLabel="Spirit Feeder">
            <Animated.Text style={[styles.title, riseStyle(soulRise)]}>SPIRIT</Animated.Text>
            <Animated.Text style={[styles.title, riseStyle(feederRise)]}>FEEDER</Animated.Text>
          </View>

          <Animated.View style={[styles.bible, riseStyle(bibleRise)]}>
            <BibleButton />
          </Animated.View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputRow}>
            <Ionicons name="person" size={16} color={COLORS.placeholder} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError('');
              }}
              placeholder="Email or Username"
              placeholderTextColor={COLORS.placeholder}
              selectionColor={COLORS.title}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              accessibilityLabel="Email or username"
            />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="lock-closed" size={16} color={COLORS.placeholder} />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError('');
              }}
              placeholder="Password"
              placeholderTextColor={COLORS.placeholder}
              selectionColor={COLORS.title}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              accessibilityLabel="Password"
            />
          </View>
        </View>

        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}
          onLayout={(e) => {
            sheetHeight.current = e.nativeEvent.layout.height;
            onSheetLayout(e.nativeEvent.layout.height);
          }}
        >
          <Pressable
            style={({ pressed }) => [styles.forgotWrap, pressed && styles.forgotPressed]}
            onPress={onForgotPassword}
            hitSlop={10}
            accessibilityRole="button"
          >
            <Text style={styles.forgot}>Forgot Password?</Text>
          </Pressable>

          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.button, styles.primary, pressed && styles.primaryPressed]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, styles.loginText]}>{loading ? 'Opening...' : 'Login'}</Text>
          </Pressable>

          <Text style={styles.or}>or</Text>

          <Pressable
            style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.secondaryPressed]}
            onPress={onCreateAccount}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, styles.createText]}>Create an account</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  top: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    position: 'absolute',
    left: 38,
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    backgroundColor: COLORS.text,
  },
  title: {
    fontFamily: 'Silkscreen_700Bold',
    fontSize: 34,
    lineHeight: 54,
    letterSpacing: 1,
    color: COLORS.title,
    textAlign: 'center',
  },
  bible: {
    marginTop: 20,
    alignItems: 'center',
  },
  form: {
    paddingHorizontal: 52,
    gap: 16,
    marginBottom: 26,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: COLORS.ink,
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
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
  sheet: {
    backgroundColor: COLORS.sheet,
    borderTopWidth: 3,
    borderTopColor: COLORS.ink,
    paddingTop: 20,
    paddingHorizontal: 52,
  },
  forgotWrap: {
    alignSelf: 'center',
    marginBottom: 18,
  },
  forgotPressed: {
    opacity: 0.5,
  },
  forgot: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: COLORS.text,
  },
  error: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: COLORS.button,
    borderBottomWidth: 6,
    borderBottomColor: COLORS.buttonLedge,
  },
  primaryPressed: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.ink,
    transform: [{ translateY: 4 }],
  },
  secondary: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.inputBorder,
  },
  secondaryPressed: {
    backgroundColor: COLORS.inputBorder,
  },
  buttonText: {
    fontSize: 17,
  },
  loginText: {
    fontFamily: 'Montserrat_500Medium',
    color: COLORS.ink,
  },
  createText: {
    fontFamily: 'Montserrat_500Medium',
    color: COLORS.secondaryText,
  },
  or: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: COLORS.text,
    textAlign: 'center',
    marginVertical: 14,
  },
});