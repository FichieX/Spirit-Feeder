import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchLeaderboard, fetchMyRank, seasonName, type Leaderboard, type RankInfo } from '../api/ranked';

const INK = '#1B1612';
const BG = '#2B211B';
const CARD = '#3A2219';
const GOLD = '#D9A441';
const PARCHMENT = '#E8D9B5';
const DIM = '#8C7765';
const MEDALS = ['#E8C35A', '#C9CED6', '#C98A55']; // gold, silver, bronze

// Ranked lobby: your points, the monthly leaderboard and the FIND OPPONENT button.
export default function Ranked() {
  const params = useLocalSearchParams<{ username?: string; userId?: string; animalId?: string; petName?: string; level?: string }>();
  const userId = Number(params.userId) || 0;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [me, setMe] = useState<RankInfo | null>(null);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [mine, top] = await Promise.all([fetchMyRank(userId), fetchLeaderboard()]);
      setMe(mine);
      setBoard(top);
    } catch (err: any) {
      setError(err?.message || "Can't load the leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const back = () =>
    router.replace({ pathname: '/study', params: { username: params.username ?? '', userId: params.userId ?? '', animalId: params.animalId ?? '' } });

  const findOpponent = () =>
    router.replace({
      pathname: '/pvp',
      params: {
        username: params.username ?? '',
        userId: params.userId ?? '',
        animalId: params.animalId ?? '',
        petName: params.petName ?? '',
        level: params.level ?? '',
      },
    });

  const season = board?.season ?? me?.season ?? '';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to the study">
          <Text style={styles.back}>‹ STUDY</Text>
        </Pressable>
        <Pressable onPress={load} hitSlop={12} accessibilityRole="button" accessibilityLabel="Refresh">
          <Text style={styles.refresh}>↻</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 110 }}>
        <Text style={styles.title}>RANKED BATTLES</Text>
        <Text style={styles.sub}>
          {season ? `${seasonName(season)} season · resets every month` : 'Live Bible battles against other players'}
        </Text>

        {/* Your card */}
        <View style={styles.meCard}>
          <Image source={require('../../assets/images/icon_coin.png')} style={styles.meIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.meName}>{(params.petName || params.username || 'You').toString().toUpperCase()}</Text>
            <Text style={styles.mePoints}>{me ? `${me.points} points` : loading ? '...' : '— points'}</Text>
            <Text style={styles.meStats}>
              {me
                ? me.rank
                  ? `Rank #${me.rank} of ${me.players}  ·  ${me.wins}W ${me.losses}L`
                  : 'Not ranked yet: win or lose one battle to join the leaderboard'
                : ' '}
            </Text>
          </View>
        </View>

        <View style={styles.howBox}>
          <Text style={styles.how}>• Same question for both of you, at the same time.</Text>
          <Text style={styles.how}>• Faster right answer attacks. Wrong answers hurt. 3 hearts each.</Text>
          <Text style={styles.how}>• Win to take points from your opponent. Beat stronger players for more.</Text>
          <Text style={styles.how}>• Freeze Time freezes your opponent for 3 seconds!</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !board ? <ActivityIndicator color={GOLD} style={{ marginTop: 20 }} /> : null}

        {/* Leaderboard */}
        {board ? (
          <>
            <Text style={styles.section}>LEADERBOARD</Text>
            {board.players.length === 0 ? (
              <Text style={styles.empty}>No battles yet this month. Be the first!</Text>
            ) : (
              board.players.map((p) => {
                const mine = p.userId === userId;
                return (
                  <View key={p.userId} style={[styles.row, mine && styles.rowMine]}>
                    <Text style={[styles.rank, p.rank <= 3 && { color: MEDALS[p.rank - 1] }]}>{p.rank}</Text>
                    <Text style={[styles.player, mine && { color: GOLD }]} numberOfLines={1}>
                      {p.username}
                      {mine ? ' (you)' : ''}
                    </Text>
                    <Text style={styles.wl}>{`${p.wins}W ${p.losses}L`}</Text>
                    <Text style={styles.points}>{p.points}</Text>
                  </View>
                );
              })
            )}

            {board.pastWinners.length ? (
              <>
                <Text style={styles.section}>PAST CHAMPIONS</Text>
                {board.pastWinners.map((s) => (
                  <View key={s.season} style={styles.pastBox}>
                    <Text style={styles.pastSeason}>{seasonName(s.season)}</Text>
                    {s.top.map((p) => (
                      <Text key={p.userId} style={styles.pastRow}>
                        <Text style={{ color: MEDALS[p.rank - 1] }}>{`${p.rank}. `}</Text>
                        {`${p.username} · ${p.points}`}
                      </Text>
                    ))}
                  </View>
                ))}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {/* Find opponent */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable
          onPress={findOpponent}
          disabled={!userId}
          accessibilityRole="button"
          style={({ pressed }) => [styles.findBtn, pressed && styles.findPressed, !userId && { opacity: 0.5 }]}
        >
          <Text style={styles.findText}>FIND OPPONENT</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  topBar: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  back: { fontFamily: 'Silkscreen_700Bold', fontSize: 16, color: PARCHMENT },
  refresh: { fontSize: 22, color: GOLD },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 26, color: GOLD, textAlign: 'center', marginTop: 6 },
  sub: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: DIM, textAlign: 'center', marginTop: 4, marginBottom: 14 },
  meCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: CARD, borderWidth: 3, borderColor: GOLD, padding: 14 },
  meIcon: { width: 56, height: 56 },
  meName: { fontFamily: 'Silkscreen_700Bold', fontSize: 15, color: PARCHMENT },
  mePoints: { fontFamily: 'Silkscreen_700Bold', fontSize: 22, color: GOLD, marginTop: 2 },
  meStats: { fontFamily: 'Montserrat_500Medium', fontSize: 12, color: DIM, marginTop: 2 },
  howBox: { marginTop: 12, padding: 12, backgroundColor: '#241A15', borderLeftWidth: 3, borderLeftColor: GOLD, gap: 4 },
  how: { fontFamily: 'Montserrat_400Regular', fontSize: 13, lineHeight: 18, color: PARCHMENT },
  error: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#E06A4F', textAlign: 'center', marginTop: 14 },
  section: { fontFamily: 'Silkscreen_700Bold', fontSize: 15, color: PARCHMENT, marginTop: 22, marginBottom: 8 },
  empty: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: DIM },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#3D2B22' },
  rowMine: { backgroundColor: '#3A2A12' },
  rank: { width: 28, fontFamily: 'Silkscreen_700Bold', fontSize: 15, color: DIM, textAlign: 'center' },
  player: { flex: 1, fontFamily: 'Montserrat_700Bold', fontSize: 14, color: PARCHMENT },
  wl: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: DIM },
  points: { width: 56, textAlign: 'right', fontFamily: 'Silkscreen_700Bold', fontSize: 15, color: GOLD },
  pastBox: { backgroundColor: '#241A15', padding: 10, marginBottom: 8 },
  pastSeason: { fontFamily: 'Silkscreen_700Bold', fontSize: 12, color: DIM, marginBottom: 4 },
  pastRow: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: PARCHMENT },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: BG, borderTopWidth: 3, borderTopColor: INK },
  findBtn: {
    height: 58,
    backgroundColor: '#F2BE4A',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 8,
    borderBottomColor: '#B07E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  findPressed: { borderBottomWidth: 3, transform: [{ translateY: 5 }] },
  findText: { fontFamily: 'Silkscreen_700Bold', fontSize: 20, color: INK, letterSpacing: 1 },
});
