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
import { useFonts, Silkscreen_700Bold } from '@expo-google-fonts/silkscreen';
import { Montserrat_400Regular, Montserrat_500Medium } from '@expo-google-fonts/montserrat';

const COLORS = {
  yellow: '#F6BC3F',
  cream: '#FDE8CF',
  inputBorder: '#E5472B',
  placeholder: '#EE7A3B',
  inputText: '#C2461F',
  dark: '#3B3A33',
  white: '#FFFFFF',
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [fontsLoaded] = useFonts({ Silkscreen_700Bold, Montserrat_400Regular, Montserrat_500Medium });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInput>(null);

  // soul feeder animation
  const soulRise = useRef(new Animated.Value(0)).current;
  const feederRise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!fontsLoaded) return;
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) {
        soulRise.setValue(1);
        feederRise.setValue(1);
        return;
      }
      const rise = (value: Animated.Value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 1000,
          delay: 250,
          easing: Easing.out(Easing.back(1.6)),
          useNativeDriver: true,
        });
      Animated.stagger(220, [rise(soulRise), rise(feederRise)]).start();
    });
  }, [fontsLoaded]);

  const riseStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({ inputRange: [0, 0.5], outputRange: [0, 1], extrapolate: 'clamp' as const }),
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) },
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
    ],
  });

  // i thibnk it was the keyboard
  const lift = useRef(new Animated.Value(0)).current;
  const sheetHeight = useRef(0);

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
      const overlap = e.endCoordinates.height - sheetHeight.current + 20;
      move(-Math.max(0, overlap), e.duration);
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => move(0, e.duration));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleLogin = () => {
    Keyboard.dismiss();
    // send email + password to the FastAPI backend
    console.log('Login pressed for', email);
  };

  const handleCreateAccount = () => {
    //  navigate to the sign-up screen
    console.log('Create account pressed');
  };

  if (!fontsLoaded) return <View style={styles.screen} />;

  return (
    <Pressable style={styles.screen} onPress={Keyboard.dismiss} accessible={false}>
      <Animated.View style={{ height, transform: [{ translateY: lift }] }}>
        <View style={[styles.top, { paddingTop: insets.top }]}>
          <Pressable
            style={[styles.menu, { top: insets.top + 14 }]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Menu"
          >
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </Pressable>

          <View accessible accessibilityRole="header" accessibilityLabel="Soul Feeder">
            <Animated.Text style={[styles.title, riseStyle(soulRise)]}>SOUL</Animated.Text>
            <Animated.Text style={[styles.title, riseStyle(feederRise)]}>FEEDER</Animated.Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputRow}>
            <Ionicons name="person" size={16} color={COLORS.placeholder} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email or Phone"
              placeholderTextColor={COLORS.placeholder}
              selectionColor={COLORS.inputBorder}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              accessibilityLabel="Email or phone"
            />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="lock-closed" size={16} color={COLORS.placeholder} />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={COLORS.placeholder}
              selectionColor={COLORS.inputBorder}
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
          }}
        >
          <Pressable style={styles.forgotWrap} hitSlop={10} accessibilityRole="button">
            <Text style={styles.forgot}>Forgot Password?</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={handleLogin}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, styles.loginText]}>Login</Text>
          </Pressable>

          <Text style={styles.or}>or</Text>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={handleCreateAccount}
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
    backgroundColor: COLORS.yellow,
  },
  top: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    position: 'absolute',
    left: 36,
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.white,
  },
  title: {
    fontFamily: 'Silkscreen_700Bold',
    fontSize: 34,
    lineHeight: 54,
    letterSpacing: 1,
    color: COLORS.white,
    textAlign: 'center',
  },
  form: {
    paddingHorizontal: 52,
    gap: 16,
    marginBottom: 26,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
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
  sheet: {
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
    paddingTop: 20,
    paddingHorizontal: 52,
  },
  forgotWrap: {
    alignSelf: 'center',
    marginBottom: 18,
  },
  forgot: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: COLORS.dark,
  },
  button: {
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.yellow,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 14px 14px -8px rgba(60, 50, 30, 0.35)',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 17,
  },
  loginText: {
    fontFamily: 'Montserrat_400Regular',
    color: COLORS.white,
  },
  createText: {
    fontFamily: 'Montserrat_500Medium',
    color: COLORS.dark,
  },
  or: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: COLORS.dark,
    textAlign: 'center',
    marginVertical: 14,
  },
});