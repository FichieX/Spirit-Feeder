import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { colors } from '../theme/colors';
import InviteWatcher from '../components/InviteWatcher';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.walnut }}>
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
      {/* Friend battle invites pop up on top of any screen */}
      <InviteWatcher />
    </View>
  );
}
