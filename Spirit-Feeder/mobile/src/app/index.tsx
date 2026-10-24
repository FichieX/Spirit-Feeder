import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Keyboard,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFonts, Silkscreen_700Bold } from '@expo-google-fonts/silkscreen';
import {
  Montserrat_300Light,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import { useRouter } from 'expo-router';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';

const TOP = '#2B211B'; //
const BOTTOM = '#3D2B22'; //
const INK = '#1B1612'; //OUTLINE

type Mode = 'login' | 'toRegister' | 'register' | 'toLogin';

export default function AuthScreen() {
  const { height } = useWindowDimensions();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Silkscreen_700Bold,
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_700Bold,
  });

  const [mode, setMode] = useState<Mode>('login');
  const [sheetHeight, setSheetHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);

  const loginOpacity = useRef(new Animated.Value(1)).current;
  const registerOpacity = useRef(new Animated.Value(0)).current;
  const panel = useRef(new Animated.Value(0)).current; 
  const reduceMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      reduceMotion.current = value;
    });
  }, []);

  // smoothes stuff
  const panelHeight = height + 100;
  const panelY = panel.interpolate({
    inputRange: [0, 1],
    outputRange: [0, headerHeight - panelHeight],
  });

  const time = (ms: number) => (reduceMotion.current ? 0 : ms);

  const fade = (value: Animated.Value, toValue: number, ms: number) =>
    Animated.timing(value, {
      toValue,
      duration: time(ms),
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

  const slide = (toValue: number) =>
    Animated.timing(panel, {
      toValue,
      duration: time(550),
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });

  const goToRegister = () => {
    if (mode !== 'login') return;
    Keyboard.dismiss();
    setMode('toRegister');
    Animated.sequence([
      fade(loginOpacity, 0, 180),
      Animated.parallel([
        slide(1),
        Animated.sequence([Animated.delay(time(430)), fade(registerOpacity, 1, 320)]),
      ]),
    ]).start(() => setMode('register'));
  };

  const goToLogin = () => {
    if (mode !== 'register') return;
    Keyboard.dismiss();
    setMode('toLogin');
    Animated.sequence([fade(registerOpacity, 0, 180), slide(0)]).start(() => {
      setMode('login');
      fade(loginOpacity, 1, 260).start();
    });
  };

  const goToForgotPassword = () => {
    Keyboard.dismiss();
    // Forgot password: email -> 6-digit code -> new password (see forgot.tsx)
    router.push('/forgot');
  };

  // back button go from registration back to login
  useEffect(() => {
    if (mode !== 'register') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goToLogin();
      return true;
    });
    return () => sub.remove();
  }, [mode]);

  if (!fontsLoaded) return <View style={[styles.screen, { backgroundColor: TOP }]} />;

  return (
    <View style={styles.screen}>
      <Animated.View
        style={[styles.panel, { height: panelHeight, transform: [{ translateY: panelY }] }]}
      />
      <View style={[styles.sheet, { height: sheetHeight }]} />

      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: loginOpacity }]}
        pointerEvents={mode === 'login' ? 'auto' : 'none'}
      >
        <LoginForm
          active={mode === 'login'}
          onCreateAccount={goToRegister}
          onForgotPassword={goToForgotPassword}
          onSheetLayout={setSheetHeight}
        />
      </Animated.View>

      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: registerOpacity }]}
        pointerEvents={mode === 'register' ? 'auto' : 'none'}
      >
        <RegisterForm onBack={goToLogin} onHeaderLayout={setHeaderHeight} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BOTTOM,
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: TOP,
    borderBottomWidth: 3,
    borderBottomColor: INK,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BOTTOM,
    borderTopWidth: 3,
    borderTopColor: INK,
  },
});