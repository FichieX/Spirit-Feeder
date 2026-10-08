import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sprite, { PreloadSheets } from '../components/pets/Sprite';
import { PET_BY_ANIMAL, PET_SCALE, animsFor, withNecklace, type Anim } from '../pets/forms';
import { POWERS, loadPowers, savePowers, type PowerBag, type PowerKey } from '../battle/powerups';
import { VICTORY_VERSES, COMFORT_VERSES, pickVerse, type Verse } from '../battle/verses';
import { loadDecor } from '../decor/items';
import { battleSocketUrl } from '../api/ranked';

// ---------- Colors ----------
const INK = '#1B1612';
const SKY = '#181422';
const MAHOGANY = '#3A2219';
const MAHOGANY_DARK = '#24150F';
const GOLD = '#D9A441';
const PARCHMENT = '#E8D9B5';
const DIM = '#8C7765';
const EMBER = '#E06A4F';
const GREEN = '#7FA36B';
const FROST = '#7FB7D9';

// ---------- Arena (same desert as the serpent battle) ----------
const ARENA = require('../../assets/images/battle_arena.png');
const ARENA_W = 128;
const ARENA_H = 112;
const OPP_SPOT = { x: 96, y: 70 }; // opponent stands on the far platform
const PET_SPOT = { x: 34, y: 105 }; // you stand on the near one
const PET_SIZE = 0.68;
const OPP_SIZE = 0.52; // further away, so a bit smaller
const HEART = require('../../assets/images/icon_heart.png');

const POWER_NAMES: Record<PowerKey, string> = { freeze: 'Freeze Time', shield: 'Immunity', fifty: 'Eliminate' };
const PVP_INFO: Record<PowerKey, string> = {
  freeze: 'Freeze your opponent for 3 seconds',
  shield: 'Block the next heart you lose',
  fifty: 'Remove one wrong answer',
};

type Phase = 'connecting' | 'searching' | 'vs' | 'question' | 'result' | 'end' | 'error';
type Side = { userId: number; username: string; petName: string; animalId: number; level: number; points: number };
type Question = { n: number; q: string; ref: string; choices: string[]; seconds: number };
type Info = { choice: number | null; seconds: number | null; right: boolean; hit: boolean; blocked: boolean };
type Result = { n: number; correct: string; correctIndex: number; ref: string; you: Info; opp: Info; attacker: 'you' | 'opp' | null; hearts: { you: number; opp: number } };
type End = { result: 'win' | 'lose' | 'draw'; reason: 'hearts' | 'left' | 'questions'; change: number; points: number };
type PetMove = 'idle' | 'tap' | 'die';

function Hearts({ count, total }: { count: number; total: number }) {
  return (
    <View style={styles.hearts}>
      {Array.from({ length: total }, (_, i) => (
        <Image key={i} source={HEART} style={[styles.heart, i >= count && styles.heartLost]} />
      ))}
    </View>
  );
}

// Live ranked battle against another player (like Kahoot, but with hearts)
export default function Pvp() {
  const params = useLocalSearchParams<{ username?: string; userId?: string; animalId?: string; petName?: string; level?: string }>();
  const userId = Number(params.userId) || 0;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const k = width / ARENA_W;
  const arenaH = ARENA_H * k;

  // ---------- State ----------
  const [phase, setPhase] = useState<Phase>('connecting');
  const [error, setError] = useState('');
  const [me, setMe] = useState<Side | null>(null);
  const [opp, setOpp] = useState<Side | null>(null);
  const [total, setTotal] = useState(3);
  const [hearts, setHearts] = useState({ you: 3, opp: 3 });
  const [question, setQuestion] = useState<Question | null>(null);
  const [myChoice, setMyChoice] = useState<number | null>(null);
  const [oppAnswered, setOppAnswered] = useState(false);
  const [hidden, setHidden] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [end, setEnd] = useState<End | null>(null);
  const [verse, setVerse] = useState<Verse | null>(null);
  const [log, setLog] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [frozenLeft, setFrozenLeft] = useState(0);
  const [shieldOn, setShieldOn] = useState(false);
  const [oppShield, setOppShield] = useState(false);
  const [used, setUsed] = useState<PowerKey[]>([]);
  const [bag, setBag] = useState<PowerBag>({ freeze: 0, shield: 0, fifty: 0 });
  const [necklaceOn, setNecklaceOn] = useState(false);
  const [searchSecs, setSearchSecs] = useState(0);
  const [petMove, setPetMove] = useState<PetMove>('idle');
  const [oppMove, setOppMove] = useState<PetMove>('idle');

  const ws = useRef<WebSocket | null>(null);
  const qStart = useRef(0);
  const frozenUntil = useRef(0);
  const bagRef = useRef(bag);
  useEffect(() => {
    bagRef.current = bag;
  }, [bag]);
  const meRef = useRef<Side | null>(null);
  const oppRef = useRef<Side | null>(null);
  const leaving = useRef(false);

  // ---------- Motion ----------
  const shake = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const petX = useRef(new Animated.Value(0)).current;
  const oppX = useRef(new Animated.Value(0)).current;
  const petBlink = useRef(new Animated.Value(1)).current;
  const oppBlink = useRef(new Animated.Value(1)).current;
  const banner = useRef(new Animated.Value(0)).current;
  const [bannerText, setBannerText] = useState('');

  const shakeScreen = (power = 10) => {
    shake.setValue(0);
    Animated.sequence(
      [power, -power, power * 0.6, -power * 0.6, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 50, useNativeDriver: true })),
    ).start();
  };
  const blink = (v: Animated.Value) =>
    Animated.sequence([0, 1, 0, 1, 0, 1].map((x) => Animated.timing(v, { toValue: x, duration: 70, useNativeDriver: true }))).start();
  const lunge = (v: Animated.Value, dx: number, dy = 0) =>
    Animated.sequence([
      Animated.timing(v, { toValue: dx, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]).start();
  const showBanner = (text: string) => {
    setBannerText(text);
    banner.setValue(0);
    Animated.sequence([
      Animated.timing(banner, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(banner, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };
  const redFlash = () => {
    flash.setValue(0.4);
    Animated.timing(flash, { toValue: 0, duration: 450, useNativeDriver: true }).start();
  };

  // ---------- Load power-ups and the necklace ----------
  useEffect(() => {
    loadPowers(params.username).then(setBag);
    loadDecor(params.username).then((d) => setNecklaceOn(d.used.includes('necklace')));
  }, [params.username]);

  // ---------- Connect ----------
  const send = (msg: object) => {
    try {
      ws.current?.send(JSON.stringify(msg));
    } catch {}
  };

  const queue = () => {
    setPhase('searching');
    setSearchSecs(0);
    setMe(null);
    setOpp(null);
    setEnd(null);
    setResult(null);
    setQuestion(null);
    setLog('');
    setPetMove('idle');
    setOppMove('idle');
    setShieldOn(false);
    setOppShield(false);
    send({ type: 'queue', petName: params.petName || '' });
  };

  useEffect(() => {
    if (!userId) {
      setError('Log in first to play ranked battles.');
      setPhase('error');
      return;
    }
    const sock = new WebSocket(battleSocketUrl(userId));
    ws.current = sock;
    sock.onopen = () => queue();
    sock.onerror = () => {
      if (leaving.current) return;
      setError("Can't reach the battle server. Make sure the server is running and you're on the same Wi-Fi.");
      setPhase('error');
    };
    sock.onclose = () => {
      if (leaving.current) return;
      setPhase((p) => (p === 'end' || p === 'error' ? p : 'error'));
      setError((e) => e || 'Lost connection to the battle server.');
    };
    sock.onmessage = (e) => {
      let msg: any;
      try {
        msg = JSON.parse(String(e.data));
      } catch {
        return;
      }
      onMessage(msg);
    };
    return () => {
      leaving.current = true;
      sock.close();
    };
  }, [userId]);

  // ---------- Messages from the server ----------
  const onMessage = (msg: any) => {
    switch (msg.type) {
      case 'error':
        setError(msg.message || 'Something went wrong.');
        setPhase('error');
        break;
      case 'searching':
        setPhase('searching');
        break;
      case 'cancelled':
        break;
      case 'match':
        meRef.current = msg.you;
        oppRef.current = msg.opp;
        setMe(msg.you);
        setOpp(msg.opp);
        setTotal(msg.hearts);
        setHearts({ you: msg.hearts, opp: msg.hearts });
        setPhase('vs');
        shakeScreen(8);
        break;
      case 'question':
        qStart.current = Date.now();
        frozenUntil.current = 0;
        setFrozenLeft(0);
        setQuestion(msg);
        setMyChoice(null);
        setOppAnswered(false);
        setHidden(null);
        setUsed([]);
        setResult(null);
        setLog('');
        setTimeLeft(msg.seconds * 1000);
        setPhase('question');
        break;
      case 'opp_answered':
        setOppAnswered(true);
        break;
      case 'frozen':
        frozenUntil.current = Date.now() + msg.seconds * 1000;
        setFrozenLeft(msg.seconds * 1000);
        showBanner('FROZEN!');
        break;
      case 'eliminate':
        setHidden(msg.remove);
        break;
      case 'power_ok': {
        const key = msg.power as PowerKey;
        const next = { ...bagRef.current, [key]: Math.max(0, bagRef.current[key] - 1) };
        setBag(next);
        savePowers(params.username, next);
        if (key === 'shield') setShieldOn(true);
        if (key === 'freeze') setLog(`${oppRef.current?.petName ?? 'Opponent'} is frozen for 3 seconds!`);
        break;
      }
      case 'opp_power':
        if (msg.power === 'shield') setOppShield(true);
        setLog(`${oppRef.current?.petName ?? 'Opponent'} used ${POWER_NAMES[msg.power as PowerKey] ?? 'a power-up'}!`);
        break;
      case 'result':
        onResult(msg as Result);
        break;
      case 'sudden_death':
        setHearts(msg.hearts);
        showBanner('SUDDEN DEATH!');
        break;
      case 'end':
        onEnd(msg as End);
        break;
    }
  };

  const onResult = (r: Result) => {
    setResult(r);
    setPhase('result');
    const mine = meRef.current?.petName ?? 'You';
    const theirs = oppRef.current?.petName ?? 'Opponent';
    let text: string;
    if (r.attacker === 'you') {
      text = r.opp.right ? `You were faster! ${mine} attacks!` : `Right! ${mine} attacks!`;
      setPetMove('tap');
      lunge(petX, 30 * k);
      setTimeout(() => {
        if (r.opp.hit) blink(oppBlink);
        shakeScreen(5);
      }, 260);
    } else if (r.attacker === 'opp') {
      text = r.you.right ? `${theirs} was faster!` : r.you.choice === null ? `Too slow! It was "${r.correct}"` : `Wrong! It was "${r.correct}"`;
      setOppMove('tap');
      lunge(oppX, -24 * k, 0);
      setTimeout(() => {
        if (r.you.hit) {
          blink(petBlink);
          redFlash();
        }
        shakeScreen(10);
      }, 260);
    } else {
      text = `Both wrong! It was "${r.correct}" (${r.ref})`;
      setTimeout(() => {
        if (r.you.hit) blink(petBlink);
        if (r.opp.hit) blink(oppBlink);
        shakeScreen(8);
      }, 150);
    }
    if (r.you.blocked) {
      text += ' Your Immunity blocked the hit!';
      setShieldOn(false);
    }
    if (r.opp.blocked) {
      text += ` ${theirs}'s Immunity blocked it!`;
      setOppShield(false);
    }
    setLog(text);
    setTimeout(() => setHearts(r.hearts), 300);
  };

  const onEnd = (e: End) => {
    setEnd(e);
    setVerse(pickVerse(e.result === 'lose' ? COMFORT_VERSES : VICTORY_VERSES));
    if (e.reason === 'hearts') {
      if (e.result === 'win') setOppMove('die');
      if (e.result === 'lose') setPetMove('die');
    }
    setTimeout(() => setPhase('end'), e.reason === 'hearts' ? 2200 : 300);
  };

  // ---------- Timer + freeze countdown ----------
  useEffect(() => {
    if (phase !== 'question' || !question) return;
    const t = setInterval(() => {
      const now = Date.now();
      setTimeLeft(Math.max(0, question.seconds * 1000 - (now - qStart.current)));
      setFrozenLeft(Math.max(0, frozenUntil.current - now));
    }, 100);
    return () => clearInterval(t);
  }, [phase, question]);

  // Searching: count seconds
  useEffect(() => {
    if (phase !== 'searching') return;
    const t = setInterval(() => setSearchSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // ---------- Actions ----------
  const frozen = frozenLeft > 0;
  const canAnswer = phase === 'question' && myChoice === null && timeLeft > 0 && !frozen;

  const answer = (i: number) => {
    if (!canAnswer || !question || i === hidden) return;
    setMyChoice(i);
    send({ type: 'answer', n: question.n, choice: i });
  };

  const firePower = (key: PowerKey) => {
    if (phase !== 'question' || myChoice !== null || used.includes(key) || bag[key] <= 0) return;
    setUsed((u) => [...u, key]);
    send({ type: 'power', power: key });
  };

  const goLeaderboard = () => {
    leaving.current = true;
    ws.current?.close();
    router.replace({
      pathname: '/ranked',
      params: { username: params.username ?? '', userId: params.userId ?? '', animalId: params.animalId ?? '', petName: params.petName ?? '', level: params.level ?? '' },
    });
  };

  const cancelSearch = () => {
    send({ type: 'cancel' });
    goLeaderboard();
  };

  const leaveBattle = () => {
    Alert.alert('Leave the battle?', 'Leaving counts as a loss, and your opponent takes your points.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: goLeaderboard },
    ]);
  };

  // ---------- Sprites ----------
  const myKey = PET_BY_ANIMAL[Number(params.animalId) || me?.animalId || 1] ?? 'donkey';
  const myAnims = animsFor(myKey, me?.level ?? (Number(params.level) || 1));
  const oppKey = PET_BY_ANIMAL[opp?.animalId ?? 1] ?? 'donkey';
  const oppAnims = animsFor(oppKey, opp?.level ?? 1);

  const pick = (a: typeof myAnims, move: PetMove): { anim: Anim; w: number; h: number } => {
    if (move === 'die' && a.die) return { anim: a.die.anim, w: a.die.frameW, h: a.die.frameH };
    return { anim: move === 'tap' ? a.tap : a.idle, w: a.frameW, h: a.frameH };
  };
  const mine = pick(myAnims, petMove);
  const theirs = pick(oppAnims, oppMove);
  const myScale = k * PET_SIZE * ((myAnims.scale ?? PET_SCALE) / PET_SCALE);
  const oppScale = k * OPP_SIZE * ((oppAnims.scale ?? PET_SCALE) / PET_SCALE);

  const inBattle = phase === 'vs' || phase === 'question' || phase === 'result';
  const timerColor = frozen ? FROST : timeLeft <= 5000 ? EMBER : GOLD;

  return (
    <View style={styles.screen}>
      <PreloadSheets
        sheets={[myAnims.idle.sheet, myAnims.tap.sheet, ...(myAnims.die ? [myAnims.die.anim.sheet] : [])]
          .map((s) => withNecklace(s, necklaceOn))
          .concat([oppAnims.idle.sheet, oppAnims.tap.sheet, ...(oppAnims.die ? [oppAnims.die.anim.sheet] : [])])}
      />
      <Animated.View style={{ flex: 1, transform: [{ translateX: shake }] }}>
        {/* ---------- Arena ---------- */}
        <View style={{ height: insets.top, backgroundColor: SKY }} />
        <View style={{ width, height: arenaH }}>
          <Image source={ARENA} style={{ position: 'absolute', width, height: arenaH }} />

          {/* Opponent (far platform) */}
          {opp ? (
            <Animated.View
              style={{
                position: 'absolute',
                left: OPP_SPOT.x * k - (theirs.w * oppScale) / 2,
                top: OPP_SPOT.y * k - theirs.h * oppScale,
                opacity: oppBlink,
                transform: [{ translateX: oppX }],
              }}
            >
              <Sprite
                key={`opp-${oppKey}-${oppMove}`}
                sheet={theirs.anim.sheet}
                ms={theirs.anim.ms}
                frameW={theirs.w}
                frameH={theirs.h}
                scale={oppScale}
                loop={oppMove === 'idle'}
                onDone={() => oppMove === 'tap' && setOppMove('idle')}
              />
            </Animated.View>
          ) : null}

          {/* You (near platform) */}
          <Animated.View
            style={{
              position: 'absolute',
              left: PET_SPOT.x * k - (mine.w * myScale) / 2,
              top: PET_SPOT.y * k - mine.h * myScale,
              opacity: petBlink,
              transform: [{ translateX: petX }],
            }}
          >
            <Sprite
              key={`me-${myKey}-${petMove}`}
              sheet={withNecklace(mine.anim.sheet, necklaceOn)}
              ms={mine.anim.ms}
              frameW={mine.w}
              frameH={mine.h}
              scale={myScale}
              loop={petMove === 'idle'}
              onDone={() => petMove === 'tap' && setPetMove('idle')}
            />
          </Animated.View>

          {/* Opponent box (top left) */}
          {opp ? (
            <View style={[styles.infoBox, { left: 8, top: 8 }]}>
              <Text style={styles.infoName} numberOfLines={1}>
                {opp.petName.toUpperCase()}
              </Text>
              <Text style={styles.infoLevel} numberOfLines={1}>{`${opp.username} · Lv ${opp.level} · ${opp.points} pts`}</Text>
              <Hearts count={hearts.opp} total={total} />
              {oppShield ? <Image source={POWERS[1].icon} style={styles.shieldBadge} /> : null}
              {oppAnswered && phase === 'question' ? <Text style={styles.locked}>LOCKED IN</Text> : null}
            </View>
          ) : null}

          {/* Your box (right) */}
          {me ? (
            <View style={[styles.infoBox, { right: 8, top: 74 * k }]}>
              <Text style={styles.infoName} numberOfLines={1}>
                {me.petName.toUpperCase()}
              </Text>
              <Text style={styles.infoLevel} numberOfLines={1}>{`Lv ${me.level} · ${me.points} pts`}</Text>
              <Hearts count={hearts.you} total={total} />
              {shieldOn ? <Image source={POWERS[1].icon} style={styles.shieldBadge} /> : null}
            </View>
          ) : null}

          {/* VS banner */}
          {phase === 'vs' && me && opp ? (
            <View pointerEvents="none" style={[styles.centerRow, { top: arenaH * 0.3 }]}>
              <View style={styles.vs}>
                <Text style={styles.vsName} numberOfLines={1}>{me.petName}</Text>
                <Text style={styles.vsText}>VS</Text>
                <Text style={styles.vsName} numberOfLines={1}>{opp.petName}</Text>
              </View>
            </View>
          ) : null}

          {/* Banner: FROZEN! / SUDDEN DEATH! */}
          <View pointerEvents="none" style={[styles.centerRow, { top: arenaH * 0.38 }]}>
            <Animated.View
              style={[styles.banner, { opacity: banner, transform: [{ scale: banner.interpolate({ inputRange: [0, 1], outputRange: [1.4, 1] }) }] }]}
            >
              <Text style={[styles.bannerText, bannerText === 'FROZEN!' && { color: FROST }]}>{bannerText}</Text>
            </Animated.View>
          </View>

          {/* Leave */}
          {inBattle ? (
            <Pressable onPress={leaveBattle} hitSlop={10} style={styles.leave} accessibilityRole="button" accessibilityLabel="Leave the battle">
              <Text style={styles.leaveText}>LEAVE</Text>
            </Pressable>
          ) : null}
        </View>

        {/* ---------- Bottom panel ---------- */}
        <View style={[styles.panel, { paddingBottom: insets.bottom + 12 }]}>
          {phase === 'connecting' || phase === 'searching' ? (
            <View style={styles.center}>
              <Text style={styles.searchTitle}>{phase === 'connecting' ? 'CONNECTING...' : 'SEARCHING FOR AN OPPONENT'}</Text>
              <Text style={styles.searchSub}>
                {phase === 'searching' ? `${'.'.repeat((searchSecs % 3) + 1)}  ${searchSecs}s` : ' '}
              </Text>
              <Text style={styles.searchHint}>Another player needs to tap FIND OPPONENT too.</Text>
              <Pressable onPress={cancelSearch} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                <Text style={styles.secondaryText}>CANCEL</Text>
              </Pressable>
            </View>
          ) : null}

          {phase === 'error' ? (
            <View style={styles.center}>
              <Text style={[styles.searchTitle, { color: EMBER }]}>CAN'T BATTLE</Text>
              <Text style={styles.searchHint}>{error}</Text>
              <Pressable onPress={goLeaderboard} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                <Text style={styles.secondaryText}>BACK</Text>
              </Pressable>
            </View>
          ) : null}

          {phase === 'vs' ? (
            <View style={styles.center}>
              <Text style={styles.searchTitle}>OPPONENT FOUND!</Text>
              <Text style={styles.searchHint}>Get ready...</Text>
            </View>
          ) : null}

          {(phase === 'question' || phase === 'result') && question ? (
            <>
              <View style={styles.panelTop}>
                <Text style={styles.qNumber}>{`QUESTION ${question.n}`}</Text>
                <Text style={[styles.seconds, { color: timerColor }]}>
                  {frozen ? `FROZEN ${Math.ceil(frozenLeft / 1000)}s` : `${Math.ceil(timeLeft / 1000)}s`}
                </Text>
              </View>
              <View style={styles.timerTrack}>
                <View style={[styles.timerFill, { width: `${(timeLeft / (question.seconds * 1000)) * 100}%`, backgroundColor: timerColor }]} />
              </View>
              <Text style={styles.question}>{question.q}</Text>
              {log ? <Text style={styles.log}>{log}</Text> : null}
              {!log && myChoice !== null && phase === 'question' ? (
                <Text style={styles.log}>{oppAnswered ? 'Both locked in...' : 'Locked in! Waiting for your opponent...'}</Text>
              ) : null}

              <View>
                {question.choices.map((c, i) => {
                  const gone = i === hidden;
                  const showRight = phase === 'result' && result?.correctIndex === i;
                  const myWrong = phase === 'result' && myChoice === i && result?.correctIndex !== i;
                  const chosen = phase === 'question' && myChoice === i;
                  const oppPick = phase === 'result' && result?.opp.choice === i;
                  return (
                    <Pressable
                      key={`${question.n}-${i}`}
                      disabled={!canAnswer || gone}
                      onPress={() => answer(i)}
                      style={({ pressed }) => [
                        styles.answer,
                        pressed && styles.pressed,
                        gone && styles.answerGone,
                        chosen && styles.answerChosen,
                        showRight && { backgroundColor: GREEN, borderColor: '#4E6B40' },
                        myWrong && { backgroundColor: EMBER, borderColor: '#8E3A28' },
                      ]}
                    >
                      <Text style={[styles.answerText, gone && { color: DIM }]}>{gone ? '—' : c}</Text>
                      {oppPick ? <Text style={styles.oppTag}>{(opp?.petName ?? 'OPP').toUpperCase()}</Text> : null}
                    </Pressable>
                  );
                })}
                {frozen ? (
                  <View style={styles.ice} pointerEvents="none">
                    <Text style={styles.iceText}>{`FROZEN ${Math.ceil(frozenLeft / 1000)}`}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.powerRow}>
                {POWERS.map((p) => {
                  const isUsed = used.includes(p.key);
                  const empty = bag[p.key] <= 0;
                  const off = phase !== 'question' || myChoice !== null || isUsed || empty;
                  return (
                    <Pressable
                      key={p.key}
                      onPress={() => firePower(p.key)}
                      disabled={off}
                      accessibilityLabel={`${p.name}: ${PVP_INFO[p.key]}. You have ${bag[p.key]}`}
                      style={({ pressed }) => [styles.power, isUsed && styles.powerActive, pressed && styles.pressed]}
                    >
                      <Image source={p.icon} style={[styles.powerIcon, empty && !isUsed && { opacity: 0.3 }]} />
                      <Text style={[styles.powerName, empty && !isUsed && { color: DIM }]}>{p.name}</Text>
                      <Text style={styles.powerCount}>{`x${bag[p.key]}`}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>
      </Animated.View>

      {/* Red flash when you get hit */}
      <Animated.View pointerEvents="none" style={[styles.fill, { backgroundColor: EMBER, opacity: flash }]} />

      {/* ---------- End of battle ---------- */}
      {phase === 'end' && end ? (
        <View style={styles.endBackdrop}>
          <View style={styles.endCard}>
            <Text style={[styles.endTitle, { color: end.result === 'win' ? GOLD : end.result === 'lose' ? EMBER : PARCHMENT }]}>
              {end.result === 'win' ? 'VICTORY!' : end.result === 'lose' ? 'DEFEATED' : 'DRAW'}
            </Text>
            {end.reason === 'left' ? (
              <Text style={styles.endSub}>{end.result === 'win' ? 'Your opponent left the battle.' : 'You left the battle.'}</Text>
            ) : null}
            <View style={styles.pointsRow}>
              <Text style={[styles.pointsChange, { color: end.change > 0 ? GREEN : end.change < 0 ? EMBER : PARCHMENT }]}>
                {end.change > 0 ? `+${end.change}` : `${end.change}`} points
              </Text>
              <Text style={styles.pointsNow}>{`Now ${end.points} points`}</Text>
            </View>
            {verse ? (
              <View style={styles.verseBox}>
                <Text style={styles.verseText}>{`“${verse.text}”`}</Text>
                <Text style={styles.verseRef}>{`— ${verse.ref}`}</Text>
              </View>
            ) : null}
            <Pressable onPress={queue} style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>PLAY AGAIN</Text>
            </Pressable>
            <Pressable onPress={goLeaderboard} style={({ pressed }) => [styles.secondaryBtn, { alignSelf: 'stretch' }, pressed && styles.pressed]}>
              <Text style={styles.secondaryText}>LEADERBOARD</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: MAHOGANY_DARK },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  infoBox: {
    position: 'absolute',
    minWidth: 140,
    maxWidth: 190,
    backgroundColor: 'rgba(27,22,18,0.88)',
    borderWidth: 3,
    borderColor: GOLD,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoName: { fontFamily: 'Silkscreen_700Bold', fontSize: 13, color: PARCHMENT },
  infoLevel: { fontFamily: 'Montserrat_500Medium', fontSize: 11, color: GOLD, marginTop: 1 },
  hearts: { flexDirection: 'row', gap: 4, marginTop: 4 },
  heart: { width: 20, height: 20 },
  heartLost: { opacity: 0.2 },
  shieldBadge: { position: 'absolute', right: -12, top: -12, width: 28, height: 28 },
  locked: { fontFamily: 'Silkscreen_700Bold', fontSize: 10, color: GREEN, marginTop: 3 },
  centerRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  vs: { alignItems: 'center', backgroundColor: INK, borderWidth: 3, borderColor: GOLD, paddingHorizontal: 18, paddingVertical: 10 },
  vsName: { fontFamily: 'Silkscreen_700Bold', fontSize: 16, color: PARCHMENT, maxWidth: 220 },
  vsText: { fontFamily: 'Silkscreen_700Bold', fontSize: 26, color: EMBER, marginVertical: 2 },
  banner: { backgroundColor: INK, borderWidth: 3, borderColor: EMBER, paddingHorizontal: 16, paddingVertical: 10 },
  bannerText: { fontFamily: 'Silkscreen_700Bold', fontSize: 20, color: EMBER, letterSpacing: 1 },
  leave: { position: 'absolute', right: 8, top: 8, backgroundColor: 'rgba(27,22,18,0.8)', borderWidth: 2, borderColor: '#5A3A2A', paddingHorizontal: 8, paddingVertical: 4 },
  leaveText: { fontFamily: 'Silkscreen_700Bold', fontSize: 11, color: DIM },
  panel: { flex: 1, backgroundColor: MAHOGANY, borderTopWidth: 4, borderTopColor: GOLD, paddingHorizontal: 16, paddingTop: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 20 },
  searchTitle: { fontFamily: 'Silkscreen_700Bold', fontSize: 18, color: GOLD, textAlign: 'center' },
  searchSub: { fontFamily: 'Silkscreen_700Bold', fontSize: 16, color: PARCHMENT },
  searchHint: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: DIM, textAlign: 'center', paddingHorizontal: 10 },
  panelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qNumber: { fontFamily: 'Silkscreen_700Bold', fontSize: 14, color: GOLD },
  seconds: { fontFamily: 'Silkscreen_700Bold', fontSize: 14 },
  timerTrack: { height: 8, backgroundColor: INK, marginTop: 6, borderWidth: 1, borderColor: '#5A3A2A' },
  timerFill: { height: '100%' },
  question: { fontFamily: 'Montserrat_700Bold', fontSize: 17, lineHeight: 23, color: PARCHMENT, marginTop: 12, marginBottom: 6 },
  log: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: GOLD, marginBottom: 6 },
  answer: { backgroundColor: GOLD, borderWidth: 3, borderColor: '#8A6420', paddingVertical: 10, paddingHorizontal: 12, marginTop: 8, flexDirection: 'row', justifyContent: 'center' },
  answerChosen: { backgroundColor: '#F2D27A', borderColor: INK },
  answerGone: { backgroundColor: MAHOGANY_DARK, borderColor: '#4A2E22' },
  answerText: { fontFamily: 'Montserrat_700Bold', fontSize: 15, color: INK, textAlign: 'center' },
  oppTag: { position: 'absolute', right: 6, top: 4, fontFamily: 'Silkscreen_700Bold', fontSize: 9, color: INK, backgroundColor: PARCHMENT, paddingHorizontal: 4 },
  pressed: { transform: [{ translateY: 2 }], opacity: 0.85 },
  ice: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(127,183,217,0.55)',
    borderWidth: 3,
    borderColor: FROST,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iceText: { fontFamily: 'Silkscreen_700Bold', fontSize: 22, color: INK },
  powerRow: { flexDirection: 'row', gap: 8, marginTop: 'auto', paddingTop: 12 },
  power: { flex: 1, alignItems: 'center', backgroundColor: MAHOGANY_DARK, borderWidth: 2, borderColor: '#5A3A2A', paddingVertical: 6 },
  powerActive: { borderColor: FROST, backgroundColor: '#1E2A33' },
  powerIcon: { width: 32, height: 32 },
  powerName: { fontFamily: 'Silkscreen_700Bold', fontSize: 9, color: PARCHMENT, marginTop: 2 },
  powerCount: { fontFamily: 'Silkscreen_700Bold', fontSize: 11, color: GOLD },
  endBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  endCard: { backgroundColor: MAHOGANY, borderWidth: 4, borderColor: GOLD, padding: 20, gap: 10 },
  endTitle: { fontFamily: 'Silkscreen_700Bold', fontSize: 28, textAlign: 'center' },
  endSub: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: PARCHMENT, textAlign: 'center' },
  pointsRow: { alignItems: 'center', backgroundColor: INK, paddingVertical: 10 },
  pointsChange: { fontFamily: 'Silkscreen_700Bold', fontSize: 22 },
  pointsNow: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: DIM, marginTop: 2 },
  verseBox: { borderLeftWidth: 3, borderLeftColor: GOLD, paddingLeft: 12 },
  verseText: { fontFamily: 'Montserrat_400Regular', fontStyle: 'italic', fontSize: 14, lineHeight: 21, color: PARCHMENT },
  verseRef: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: GOLD, marginTop: 4 },
  primaryBtn: { backgroundColor: GOLD, borderWidth: 3, borderColor: '#8A6420', paddingVertical: 12, alignItems: 'center' },
  primaryText: { fontFamily: 'Silkscreen_700Bold', fontSize: 18, color: INK, letterSpacing: 1 },
  secondaryBtn: { backgroundColor: '#3D2B22', borderWidth: 2, borderColor: INK, borderBottomWidth: 4, borderBottomColor: '#5A3E2B', paddingVertical: 10, paddingHorizontal: 22, alignItems: 'center' },
  secondaryText: { fontFamily: 'Silkscreen_700Bold', fontSize: 14, color: PARCHMENT },
});
