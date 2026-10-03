import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Yellow behind every screen, so there's never a white flash between them guuys
        contentStyle: { backgroundColor: '#F6BC3F' },
      }}
    >
      <Stack.Screen
        name="register"
        options={{
          // Cross-fade: so the yellow top and cream bottom of both screens blend together
          animation: 'fade',
          animationDuration: 600,
        }}
      />
    </Stack>
  );
}