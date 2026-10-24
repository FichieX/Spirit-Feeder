import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { answerBattleInvite, pingFriends, MODE_INFO, type BattleInvite } from '../api/friends';
import { sessionParams, setRequestCount, useSession } from '../session';

const INK = '#1B1612';
const GOLD = '#D9A441';
const PARCHMENT = '#E8D9B5';
const DIM = '#8C7765';
const EMBER = '#E06A4F';
const PING_MS = 4000;

// Lives on top of every screen. While you're logged in it tells the server you're online
// every few seconds, and pops up when a friend invites you to a live battle.
// (Not during battles: the battle screen shows rematch invites itself.)
export default function InviteWatcher() {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [invites, setInvites] = useState<(BattleInvite & { until: number })[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const userId = session?.userId ?? 0;
  const hatched = !!session?.hatched;

  useEffect(() => {
    if (!userId) {
      setInvites([]);
      return;
    }
    let stopped = false;
    const tick = async () => {
      try {
        const r = await pingFriends(userId, pathRef.current, hatched);
        if (stopped) return;
        const at = Date.now();
        setNow(at);
        setInvites(r.invites.map((i) => ({ ...i, until: at + i.seconds * 1000 })));
        setRequestCount(r.requests);
      } catch {
        // Server without friends yet, or no connection: try again next time
      }
    };
    tick();
    const t = setInterval(tick, PING_MS);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [userId, hatched]);

  const inBattle = pathname === '/pvp' || pathname === '/battle';
  const invite = invites.find((i) => !dismissed.includes(i.inviteId) && i.until > now);
  const showing = !!session && !inBattle && pathname !== '/' && !!invite;

  // Countdown on the card
  useEffect(() => {
    if (!showing) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [showing]);

  if (!showing || !invite || !session) return null;

  const close = () => {
    setDismissed((d) => [...d, invite.inviteId]);
    setError('');
  };

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      await answerBattleInvite(session.userId, invite.inviteId, true);
      close();
      router.replace({
        pathname: '/pvp',
        params: {
          ...sessionParams(session),
          inviteId: invite.inviteId,
          mode: invite.mode,
          friendName: invite.fromName,
          friendId: String(invite.fromId),
          role: 'guest',
        },
      });
    } catch (err: any) {
      setError(err?.message || "Couldn't join the battle.");
    } finally {
      setBusy(false);
    }
  };

  const decline = () => {
    answerBattleInvite(session.userId, invite.inviteId, false).catch(() => {});
    close();
  };

  const secs = Math.max(0, Math.ceil((invite.until - now) / 1000));
  const mode = MODE_INFO[invite.mode];

  return (
    <View style={styles.backdrop}>
      <View style={styles.card} accessibilityViewIsModal accessibilityLiveRegion="polite">
        <Image source={require('../../assets/images/icon_coin.png')} style={styles.icon} />
        <Text style={styles.title}>BATTLE INVITE!</Text>
        <Text style={styles.text}>
          <Text style={styles.name}>{invite.fromName}</Text> wants to battle you.
        </Text>
        <View style={[styles.mode, invite.mode === 'ranked' && styles.modeRanked]}>
          <Text style={styles.modeName}>{mode.name}</Text>
          <Text style={styles.modeInfo}>{mode.info}</Text>
        </View>
        <Text style={styles.timer}>{`${secs}s to answer`}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          onPress={error ? close : accept}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.accept, pressed && styles.pressed, busy && { opacity: 0.6 }]}
        >
          {busy ? <ActivityIndicator color={INK} /> : <Text style={styles.acceptText}>{error ? 'OK' : 'ACCEPT'}</Text>}
        </Pressable>
        {!error ? (
          <Pressable onPress={decline} disabled={busy} accessibilityRole="button" style={({ pressed }) => [styles.decline, pressed && styles.pressed]}>
            <Text style={styles.declineText}>NO THANKS</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    elevation: 200,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 28,
  },
  card: { backgroundColor: '#3A2219', borderWidth: 4, borderColor: GOLD, padding: 20, alignItems: 'center', gap: 10 },
  icon: { width: 56, height: 56 },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 24, color: GOLD },
  text: { fontFamily: 'Montserrat_500Medium', fontSize: 16, color: PARCHMENT, textAlign: 'center' },
  name: { fontFamily: 'Montserrat_700Bold', color: GOLD },
  mode: { alignSelf: 'stretch', backgroundColor: INK, borderLeftWidth: 4, borderLeftColor: '#7FA36B', padding: 10 },
  modeRanked: { borderLeftColor: GOLD },
  modeName: { fontFamily: 'Silkscreen_700Bold', fontSize: 15, color: PARCHMENT },
  modeInfo: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: DIM, marginTop: 2 },
  timer: { fontFamily: 'Silkscreen_700Bold', fontSize: 13, color: DIM },
  error: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: EMBER, textAlign: 'center' },
  accept: {
    alignSelf: 'stretch',
    height: 54,
    backgroundColor: '#F2BE4A',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 7,
    borderBottomColor: '#B07E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { fontFamily: 'Silkscreen_700Bold', fontSize: 18, color: INK, letterSpacing: 1 },
  decline: {
    alignSelf: 'stretch',
    height: 44,
    backgroundColor: '#3D2B22',
    borderWidth: 2,
    borderColor: INK,
    borderBottomWidth: 4,
    borderBottomColor: '#5A3E2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: { fontFamily: 'Silkscreen_700Bold', fontSize: 14, color: PARCHMENT },
  pressed: { transform: [{ translateY: 2 }], opacity: 0.85 },
});
