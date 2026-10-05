import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme/colors';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          // Walnut behind every screen, so the fade blends dark into dark
          contentStyle: { backgroundColor: colors.walnut },
          animation: 'fade',
          animationDuration: 450,
        }}
      />
    </>
  );
}