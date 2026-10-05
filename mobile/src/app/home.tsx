import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function Home() {
  const { username } = useLocalSearchParams<{ username?: string }>();
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>WELCOME</Text>
      <Text style={styles.name}>{username}</Text>
      <Text style={styles.sub}>Your pet is waiting in the study.</Text>
      <Pressable style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#2B211B', alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 34, color: '#D9A441' },
  name: { fontFamily: 'Montserrat_700Bold', fontSize: 22, color: '#E8D9B5', marginTop: 8 },
  sub: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#C9B48A', marginTop: 12, marginBottom: 32 },
  button: { borderWidth: 2, borderColor: '#5A3E2B', paddingVertical: 12, paddingHorizontal: 32 },
  buttonText: { fontFamily: 'Montserrat_500Medium', fontSize: 16, color: '#E8D9B5' },
});
