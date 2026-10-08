import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sprite from '../components/pets/Sprite';
import { PET_BY_ANIMAL, animsFor } from '../pets/forms';
import {
  answerFriendRequest,
  fetchFriends,
  inviteToBattle,
  removeFriend,
  sendFriendRequest,
  MODE_INFO,
  type BattleMode,
  type Friend,
  type FriendList,
} from '../api/friends';

const INK = '#1B1612';
const BG = '#2B211B';
const CARD = '#3A2219';
const GOLD = '#D9A441';
const PARCHMENT = '#E8D9B5';
const DIM = '#8C7765';
const EMBER = '#E06A4F';
const GREEN = '#7FA36B';
const REFRESH_MS = 5000;

const STATUS: Record<Friend['status'], { text: string; color: string }> = {
  online: { text: 'Online', color: GREEN },
  battle: { text: 'In a battle', color: GOLD },
  serpent: { text: 'Fighting a serpent', color: GOLD },
  offline: { text: 'Offline', color: DIM },
};

// Little moving pet next to each name
function PetIcon({ animalId, level }: { animalId: number; level: number }) {
  const a = animsFor(PET_BY_ANIMAL[animalId] ?? 'donkey', level);
  const size = 46;
  return (
    <View style={styles.petBox}>
      <Sprite sheet={a.idle.sheet} ms={a.idle.ms} frameW={a.frameW} frameH={a.frameH} scale={size / a.frameH} />
    </View>
  );
}

// Friends: add by username, accept requests, see who's online, battle them live.
export default function Friends() {
  const params = useLocalSearchParams<{ username?: string; userId?: string; animalId?: string; petName?: string; level?: string }>();
  const userId = Number(params.userId) || 0;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [list, setList] = useState<FriendList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<{ text: string; good: boolean } | null>(null);
  const [picking, setPicking] = useState<Friend | null>(null); // friend you're about to battle
  const [inviting, setInviting] = useState(false);
  const [pickError, setPickError] = useState('');

  const load = useCallback(
    async (quiet = false) => {
      if (!userId) return;
      if (!quiet) setLoading(true);
      try {
        setList(await fetchFriends(userId));
        setError('');
      } catch (err: any) {
        if (!quiet) setError(err?.message || "Can't load your friends.");
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  // Load now, then keep the online dots fresh
  useEffect(() => {
    load();
    const t = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const base = {
    username: params.username ?? '',
    userId: params.userId ?? '',
    animalId: params.animalId ?? '',
    petName: params.petName ?? '',
    level: params.level ?? '',
  };
  const back = () => router.replace({ pathname: '/ranked', params: base });

  const add = async () => {
    const clean = name.trim();
    if (!clean) {
      setNote({ text: "Type your friend's username.", good: false });
      return;
    }
    Keyboard.dismiss();
    setAdding(true);
    setNote(null);
    try {
      const r = await sendFriendRequest(userId, clean);
      setNote({ text: r.message, good: true });
      setName('');
      load(true);
    } catch (err: any) {
      setNote({ text: err?.message || "Couldn't send the request.", good: false });
    } finally {
      setAdding(false);
    }
  };

  const answer = async (requestId: number, accept: boolean) => {
    try {
      const r = await answerFriendRequest(userId, requestId, accept);
      setNote({ text: r.message, good: true });
    } catch (err: any) {
      setNote({ text: err?.message || 'Something went wrong.', good: false });
    }
    load(true);
  };

  const confirmRemove = (f: Friend, pending = false) =>
    Alert.alert(
      pending ? 'Cancel request?' : `Remove ${f.username}?`,
      pending ? `Your friend request to ${f.username} will be taken back.` : 'You can add them again later.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: pending ? 'Cancel request' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(userId, f.userId);
            } catch {}
            load(true);
          },
        },
      ],
    );

  const startBattle = async (mode: BattleMode) => {
    if (!picking) return;
    setInviting(true);
    setPickError('');
    try {
      const r = await inviteToBattle(userId, picking.userId, mode);
      router.replace({
        pathname: '/pvp',
        params: {
          ...base,
          inviteId: r.inviteId,
          mode: r.mode,
          friendName: picking.username,
          friendId: String(picking.userId),
          role: r.accepted ? 'guest' : 'host',
        },
      });
    } catch (err: any) {
      setPickError(err?.message || "Couldn't invite them.");
      setInviting(false);
    }
  };

  const friends = list?.friends ?? [];
  const incoming = list?.incoming ?? [];
  const outgoing = list?.outgoing ?? [];
  const online = friends.filter((f) => f.status !== 'offline').length;

  return (
    <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top + 8 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to battles">
          <Text style={styles.back}>‹ BATTLES</Text>
        </Pressable>
        <Pressable onPress={() => load()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Refresh">
          <Text style={styles.refresh}>↻</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>FRIENDS</Text>
        <Text style={styles.sub}>{list ? `${friends.length} friends · ${online} online` : 'Add friends and battle them live'}</Text>

        {/* Add a friend */}
        <View style={styles.addRow}>
          <TextInput
            value={name}
            onChangeText={(t: string) => {
              setName(t);
              setNote(null);
            }}
            placeholder="Friend's username"
            placeholderTextColor="#9C6B43"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={add}
            style={styles.input}
            accessibilityLabel="Friend's username"
          />
          <Pressable
            onPress={add}
            disabled={adding}
            accessibilityRole="button"
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed, adding && { opacity: 0.6 }]}
          >
            {adding ? <ActivityIndicator color={INK} /> : <Text style={styles.addText}>ADD</Text>}
          </Pressable>
        </View>
        {note ? <Text style={[styles.note, { color: note.good ? GREEN : EMBER }]}>{note.text}</Text> : null}

        {error ? <Text style={[styles.note, { color: EMBER }]}>{error}</Text> : null}
        {loading && !list ? <ActivityIndicator color={GOLD} style={{ marginTop: 20 }} /> : null}

        {/* Requests to me */}
        {incoming.length ? (
          <>
            <Text style={styles.section}>{`REQUESTS (${incoming.length})`}</Text>
            {incoming.map((r) => (
              <View key={r.requestId} style={[styles.row, styles.requestRow]}>
                <PetIcon animalId={r.animalId} level={r.level} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{r.username}</Text>
                  <Text style={styles.meta}>{`Lv ${r.level} · wants to be friends`}</Text>
                </View>
                <Pressable onPress={() => answer(r.requestId, true)} accessibilityRole="button" style={({ pressed }) => [styles.smallBtn, pressed && styles.pressed]}>
                  <Text style={styles.smallText}>ACCEPT</Text>
                </Pressable>
                <Pressable
                  onPress={() => answer(r.requestId, false)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Decline ${r.username}`}
                  style={({ pressed }) => [styles.xBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.xText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}

        {/* My friends */}
        {list ? (
          <>
            <Text style={styles.section}>{`MY FRIENDS (${friends.length})`}</Text>
            {friends.length === 0 ? (
              <Text style={styles.empty}>No friends yet. Type a username above to send a friend request!</Text>
            ) : (
              friends.map((f) => {
                const st = STATUS[f.status];
                return (
                  <Pressable
                    key={f.userId}
                    onLongPress={() => confirmRemove(f)}
                    delayLongPress={500}
                    accessibilityHint="Hold to remove this friend"
                    style={styles.row}
                  >
                    <PetIcon animalId={f.animalId} level={f.level} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>{f.username}</Text>
                      <Text style={styles.meta}>
                        <Text style={{ color: st.color }}>{`● ${st.text}`}</Text>
                        {`  ·  Lv ${f.level}`}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setPickError('');
                        setPicking(f);
                      }}
                      disabled={!f.canBattle}
                      accessibilityRole="button"
                      accessibilityLabel={`Battle ${f.username}`}
                      style={({ pressed }) => [styles.smallBtn, !f.canBattle && styles.smallOff, pressed && styles.pressed]}
                    >
                      <Text style={[styles.smallText, !f.canBattle && { color: DIM }]}>BATTLE</Text>
                    </Pressable>
                  </Pressable>
                );
              })
            )}
            {friends.length ? <Text style={styles.hint}>Friends must be online to battle. Hold a friend to remove them.</Text> : null}
          </>
        ) : null}

        {/* Requests I sent */}
        {outgoing.length ? (
          <>
            <Text style={styles.section}>{`SENT (${outgoing.length})`}</Text>
            {outgoing.map((r) => (
              <View key={r.requestId} style={styles.row}>
                <PetIcon animalId={r.animalId} level={r.level} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{r.username}</Text>
                  <Text style={styles.meta}>Waiting for them to accept</Text>
                </View>
                <Pressable onPress={() => confirmRemove(r, true)} accessibilityRole="button" style={({ pressed }) => [styles.smallBtn, styles.smallOff, pressed && styles.pressed]}>
                  <Text style={[styles.smallText, { color: PARCHMENT }]}>CANCEL</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>

      {/* Fun or ranked? */}
      {picking ? (
        <View style={styles.overlay}>
          <Pressable style={styles.fill} onPress={() => !inviting && setPicking(null)} accessibilityLabel="Close" />
          <View style={styles.sheet} accessibilityViewIsModal>
            <Text style={styles.sheetTitle}>{`BATTLE ${picking.username.toUpperCase()}`}</Text>
            <Text style={styles.sheetSub}>They get a pop-up and have 30 seconds to accept.</Text>
            {(['fun', 'ranked'] as BattleMode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => startBattle(m)}
                disabled={inviting}
                accessibilityRole="button"
                style={({ pressed }) => [styles.modeBtn, m === 'ranked' && styles.modeRanked, pressed && styles.pressed, inviting && { opacity: 0.6 }]}
              >
                <Text style={styles.modeName}>{MODE_INFO[m].name}</Text>
                <Text style={styles.modeInfo}>{MODE_INFO[m].info}</Text>
              </Pressable>
            ))}
            {inviting ? <ActivityIndicator color={GOLD} /> : null}
            {pickError ? <Text style={[styles.note, { color: EMBER, textAlign: 'center' }]}>{pickError}</Text> : null}
            <Pressable onPress={() => setPicking(null)} disabled={inviting} accessibilityRole="button" style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  topBar: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  back: { fontFamily: 'Silkscreen_700Bold', fontSize: 16, color: PARCHMENT },
  refresh: { fontSize: 22, color: GOLD },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 26, color: GOLD, textAlign: 'center', marginTop: 6 },
  sub: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: DIM, textAlign: 'center', marginTop: 4, marginBottom: 14 },
  addRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: INK,
    borderWidth: 2,
    borderColor: '#5A3E2B',
    paddingHorizontal: 12,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: PARCHMENT,
  },
  addBtn: {
    width: 76,
    height: 50,
    backgroundColor: '#F2BE4A',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 6,
    borderBottomColor: '#B07E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontFamily: 'Silkscreen_700Bold', fontSize: 16, color: INK },
  note: { fontFamily: 'Montserrat_500Medium', fontSize: 13, marginTop: 8 },
  section: { fontFamily: 'Silkscreen_700Bold', fontSize: 15, color: PARCHMENT, marginTop: 22, marginBottom: 6 },
  empty: { fontFamily: 'Montserrat_400Regular', fontSize: 13, lineHeight: 19, color: DIM },
  hint: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: DIM, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#3D2B22' },
  requestRow: { backgroundColor: CARD, borderWidth: 2, borderColor: GOLD, marginBottom: 6 },
  petBox: { width: 50, height: 50, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  name: { fontFamily: 'Montserrat_700Bold', fontSize: 15, color: PARCHMENT },
  meta: { fontFamily: 'Montserrat_500Medium', fontSize: 12, color: DIM, marginTop: 2 },
  smallBtn: {
    paddingHorizontal: 10,
    height: 36,
    justifyContent: 'center',
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: INK,
    borderBottomWidth: 4,
    borderBottomColor: '#8A6420',
  },
  smallOff: { backgroundColor: '#3D2B22', borderBottomColor: '#5A3E2B' },
  smallText: { fontFamily: 'Silkscreen_700Bold', fontSize: 12, color: INK },
  xBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3D2B22', borderWidth: 2, borderColor: INK },
  xText: { fontFamily: 'Montserrat_700Bold', fontSize: 15, color: PARCHMENT },
  pressed: { transform: [{ translateY: 2 }], opacity: 0.85 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, elevation: 50, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: { backgroundColor: CARD, borderWidth: 4, borderColor: GOLD, padding: 18, gap: 10 },
  sheetTitle: { fontFamily: 'Silkscreen_700Bold', fontSize: 20, color: GOLD, textAlign: 'center' },
  sheetSub: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: DIM, textAlign: 'center' },
  modeBtn: { backgroundColor: INK, borderWidth: 2, borderColor: '#5A3E2B', borderLeftWidth: 6, borderLeftColor: GREEN, padding: 12 },
  modeRanked: { borderLeftColor: GOLD },
  modeName: { fontFamily: 'Silkscreen_700Bold', fontSize: 17, color: PARCHMENT },
  modeInfo: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: DIM, marginTop: 3 },
  cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3D2B22', borderWidth: 2, borderColor: INK, borderBottomWidth: 4, borderBottomColor: '#5A3E2B' },
  cancelText: { fontFamily: 'Silkscreen_700Bold', fontSize: 14, color: PARCHMENT },
});
