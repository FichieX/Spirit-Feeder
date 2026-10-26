import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ---------- Art (pixel art, 8 screen-pixels per art pixel in the files) ----------
const SPREAD = require('../../../assets/images/bible_spread.png'); // open book, 170 x 250 art px
const PAGE = require('../../../assets/images/bible_page.png'); // one right-hand page, 83 x 244 art px
const COVER = require('../../../assets/images/bible_cover.png'); // closed Bible, 92 x 136 art px
const ART_W = 170;
const ART_H = 250;
// Where the text goes on each page (art px)
const LEFT_COL = { x: 9, y: 10, w: 69, h: 228 };
const RIGHT_COL = { x: 92, y: 10, w: 69, h: 228 };
const PAGE_BOX = { x: 84, y: 3, w: 83, h: 244 }; // the page that flips

// ---------- Colors ----------
const BG = '#2B211B';
const INK = '#1B1612';
const TEXT = '#3A281C';
const TITLE = '#7A2626';
const REF = '#8C7765';
const GOLD = '#D9A441';

// All 66 books in Bible order. When the Bible opens, the pages flip from Genesis
// to whichever book today's passage is in.
const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah',
  'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum',
  'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
  'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
  '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John',
  '3 John', 'Jude', 'Revelation',
];
const GOSPELS = ['Matthew', 'Mark', 'Luke', 'John'];
const MAX_FLIPS = 8; // pages turned on the way to the book

// "psalm" -> "Psalms", "song of songs" -> "Song of Solomon", anything else matched by name
function normalizeBook(raw: string) {
  const b = raw.trim().replace(/\s+/g, ' ');
  const low = b.toLowerCase();
  if (low === 'psalm') return 'Psalms';
  if (low === 'song of songs') return 'Song of Solomon';
  return BIBLE_BOOKS.find((x) => x.toLowerCase() === low) ?? b;
}

// Which book the passage is from: the server sends it, otherwise read it from the
// reference ("Genesis 1:6-8" -> Genesis). The offline fallback passage is John.
function bookOf(serverBook: string | undefined, ref: string) {
  if (serverBook && serverBook.trim()) return normalizeBook(serverBook);
  const m = ref.match(/^((?:[1-3]\s)?[A-Za-z][A-Za-z ]*?)\s+\d+(?::|$)/);
  return m ? normalizeBook(m[1]) : 'John';
}

// Heading on the first page: THE GOSPEL OF JOHN, THE BOOK OF GENESIS, THE SONG OF SOLOMON...
function bookHeading(book: string) {
  if (GOSPELS.includes(book)) return `THE GOSPEL OF ${book.toUpperCase()}`;
  if (book === 'Song of Solomon') return 'THE SONG OF SOLOMON';
  return `THE BOOK OF ${book.toUpperCase()}`;
}

// Book names shown while the pages flip, from Genesis up to the passage's book
function flipBooks(book: string) {
  const end = BIBLE_BOOKS.indexOf(book);
  if (end < 0) return ['GENESIS', book.toUpperCase()]; // unknown book name: still lands on it
  const steps = Math.min(end, MAX_FLIPS);
  const out: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const name = BIBLE_BOOKS[steps ? Math.round((i * end) / steps) : 0].toUpperCase();
    if (out[out.length - 1] !== name) out.push(name);
  }
  return out;
}

const FONT_SIZE = 15;
const LINE_H = 23;
const HEADER_H = 106; // space for book name + title + reference on the first page (grows if a long book name wraps)

// Used when the server can't be reached (John 1:1-5, KJV)
const FALLBACK = {
  chapter: 1,
  title: 'The Word Became Flesh (John 1:1-5)',
  content:
    'In the beginning was the Word, and the Word was with God, and the Word was God. The same was in the beginning with God. All things were made by him; and without him was not any thing made that was made. In him was life; and the life was the light of men. And the light shineth in darkness; and the darkness comprehended it not.',
};

export type Reading = { book?: string; chapter?: number; title: string; content: string } | null;

type Props = {
  visible: boolean;
  reading: Reading;
  busy?: boolean;
  onDone: () => void;
  onClose: () => void;
};

type Phase = 'cover' | 'opening' | 'flipping' | 'reading';

// "The Deity of Jesus Christ (John 1:1-18)" -> name + reference
function splitTitle(title: string) {
  const m = title.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? { name: m[1], ref: m[2] } : { name: title, ref: '' };
}

// The Bible: closed cover -> opens -> pages flip to the passage's book -> read page by page -> DONE
export default function BibleReader({ visible, reading, busy, onDone, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const passage: NonNullable<Reading> = reading ?? FALLBACK;
  const { name, ref } = splitTitle(passage.title);
  const book = bookOf(passage.book, ref);
  const heading = bookHeading(book);
  const refText = ref || `${book} ${passage.chapter ?? 1}`;
  const flips = useMemo(() => flipBooks(book), [book]);

  // Book size: as big as fits between the close button and the buttons at the bottom
  const availH = height - insets.top - insets.bottom - 130;
  const bookW = Math.min(width - 12, (availH * ART_W) / ART_H);
  const k = bookW / ART_W; // screen points per art pixel
  const bookH = ART_H * k;
  const coverW = bookW * 0.62;
  const coverH = (coverW * 136) / 92;

  const [phase, setPhase] = useState<Phase>('cover');
  const [bookName, setBookName] = useState(flips[0]);
  const [spread, setSpread] = useState(0);
  const [lines, setLines] = useState<string[] | null>(null);
  const [headH, setHeadH] = useState<number | null>(null); // measured height of the first-page heading
  const ready = !!lines && headH !== null;

  const coverTurn = useRef(new Animated.Value(0)).current; // 0 closed -> 1 open
  const bookFade = useRef(new Animated.Value(0)).current;
  const pageTurn = useRef(new Animated.Value(0)).current; // 0 flat -> 1 turned over
  const flipping = useRef(false); // true while flipping to the book (tap to skip)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Start closed every time it opens
  useEffect(() => {
    if (!visible) return;
    flipping.current = false;
    clearTimers();
    setPhase('cover');
    setSpread(0);
    setBookName(flips[0]);
    setLines(null);
    setHeadH(null);
    coverTurn.setValue(0);
    bookFade.setValue(0);
    pageTurn.setValue(0);
    return clearTimers;
  }, [visible]);

  // ---- Pages: measure the passage in a hidden Text, then cut its lines into pages ----
  const colW = LEFT_COL.w * k;
  const colH = LEFT_COL.h * k;
  const headerBox = Math.max(HEADER_H, (headH ?? 0) + 6);
  const pages = useMemo(() => {
    if (!lines || headH === null) return [] as string[][];
    const perPage = Math.max(3, Math.floor(colH / LINE_H));
    const first = Math.max(2, Math.floor((colH - headerBox) / LINE_H));
    const out: string[][] = [lines.slice(0, first)];
    for (let i = first; i < lines.length; i += perPage) out.push(lines.slice(i, i + perPage));
    return out;
  }, [lines, headH, headerBox, colH]);
  const spreads = Math.max(1, Math.ceil(pages.length / 2));
  const lastSpread = spread >= spreads - 1;

  // ---- Animations ----
  const open = () => {
    if (phase !== 'cover') return;
    setPhase('opening');
    Animated.sequence([
      Animated.timing(coverTurn, { toValue: 1, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(bookFade, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start(() => flipToBook());
  };

  const turnPage = (onMiddle?: () => void, ms = 170) =>
    new Promise<void>((resolve) => {
      pageTurn.setValue(0);
      Animated.timing(pageTurn, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => {
        pageTurn.setValue(0);
        resolve();
      });
      if (onMiddle) timers.current.push(setTimeout(onMiddle, ms / 2));
    });

  const flipToBook = async () => {
    setPhase('flipping');
    flipping.current = true;
    for (let i = 1; i < flips.length; i++) {
      if (!flipping.current) return; // skipped
      await turnPage(() => setBookName(flips[i]), 150);
    }
    flipping.current = false;
    setPhase('reading');
  };

  const skip = () => {
    if (phase === 'cover') return open();
    if (phase !== 'reading') {
      flipping.current = false;
      clearTimers();
      coverTurn.stopAnimation();
      bookFade.stopAnimation();
      pageTurn.stopAnimation();
      pageTurn.setValue(0);
      coverTurn.setValue(1);
      bookFade.setValue(1);
      setBookName(flips[flips.length - 1]);
      setPhase('reading');
    }
  };

  const go = (dir: 1 | -1) => {
    if (phase !== 'reading') return;
    const next = spread + dir;
    if (next < 0 || next >= spreads) return;
    turnPage(() => setSpread(next), 260);
  };

  // ---- Drawing helpers ----
  const at = (b: { x: number; y: number; w: number; h: number }) => ({
    position: 'absolute' as const,
    left: b.x * k,
    top: b.y * k,
    width: b.w * k,
    height: b.h * k,
  });

  // Book name + passage name + reference at the top of the first page
  const Heading = () => (
    <>
      <Text style={styles.book} numberOfLines={2}>
        {heading}
      </Text>
      <Text style={styles.title} numberOfLines={3} adjustsFontSizeToFit>
        {name}
      </Text>
      <Text style={styles.ref} numberOfLines={1}>
        {refText}
      </Text>
    </>
  );

  const PageText = ({ index }: { index: number }) => {
    const ls = pages[index];
    const pageNo = index + 1;
    if (!ls) {
      // Empty right-hand page at the end: a small ornament
      return (
        <View style={styles.ornament}>
          <Text style={styles.ornamentCross}>✝</Text>
          <Text style={styles.ornamentText}>Press DONE to earn your bread</Text>
        </View>
      );
    }
    return (
      <View style={{ flex: 1 }}>
        {index === 0 ? (
          <View style={{ height: headerBox }}>
            <Heading />
          </View>
        ) : null}
        {ls.map((l, i) => (
          <Text key={i} style={styles.verse} numberOfLines={1}>
            {l.replace(/\s+$/, '')}
          </Text>
        ))}
        <Text style={styles.pageNo}>{pageNo}</Text>
      </View>
    );
  };

  const leftIndex = spread * 2;
  const rightIndex = spread * 2 + 1;
  const turning = pageTurn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-180deg'] });
  const coverRot = coverTurn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-95deg'] });

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        {/* Close */}
        <View style={styles.topBar}>
          <Text style={styles.topHint}>{phase === 'cover' ? 'Tap the Bible to open it' : phase === 'reading' ? '' : 'Tap to skip'}</Text>
          <Pressable onPress={onClose} hitSlop={14} accessibilityRole="button" accessibilityLabel="Close the Bible">
            <Text style={styles.close}>X</Text>
          </Pressable>
        </View>

        {/* Hidden measurer: lays the passage out at the page's width to find the line breaks */}
        {visible && !lines ? (
          <Text
            style={[styles.verse, { position: 'absolute', width: colW, opacity: 0, left: -9999 }]}
            onTextLayout={(e: any) => setLines(e.nativeEvent.lines.map((l: any) => l.text))}
          >
            {passage.content}
          </Text>
        ) : null}
        {/* Hidden measurer for the heading: a long book name can take two lines */}
        {visible && headH === null ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', width: colW, opacity: 0, left: -9999 }}
            onLayout={(e) => setHeadH(e.nativeEvent.layout.height)}
          >
            <Heading />
          </View>
        ) : null}

        <Pressable style={styles.stage} onPress={skip} disabled={phase === 'reading'} accessibilityLabel="Open the Bible">
          {/* The open book */}
          <Animated.View
            style={{ width: bookW, height: bookH, opacity: bookFade, transform: [{ scale: bookFade.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }}
            accessible={phase === 'reading'}
            accessibilityLabel={`${heading}. ${name}. ${refText}. ${passage.content}`}
          >
            <Image source={SPREAD} style={{ width: bookW, height: bookH }} />

            {/* Left page */}
            <Pressable style={at(LEFT_COL)} onPress={() => go(-1)} disabled={phase !== 'reading'}>
              {phase === 'reading' && ready ? (
                <PageText index={leftIndex} />
              ) : (
                <View style={{ paddingTop: 6 }}>
                  <Text style={styles.book}>{bookName}</Text>
                </View>
              )}
            </Pressable>

            {/* Right page */}
            <Pressable style={at(RIGHT_COL)} onPress={() => go(1)} disabled={phase !== 'reading'}>
              {phase === 'reading' && ready ? <PageText index={rightIndex} /> : null}
            </Pressable>

            {/* The page that turns (around the spine) */}
            <Animated.View
              pointerEvents="none"
              style={[
                at(PAGE_BOX),
                {
                  opacity: pageTurn.interpolate({ inputRange: [0, 0.02, 0.98, 1], outputRange: [0, 1, 1, 0] }),
                  transformOrigin: 'left center',
                  transform: [{ perspective: 1200 }, { rotateY: turning }],
                },
              ]}
            >
              <Image source={PAGE} style={{ width: PAGE_BOX.w * k, height: PAGE_BOX.h * k }} />
            </Animated.View>
          </Animated.View>

          {/* The closed cover, which swings open */}
          {phase === 'cover' || phase === 'opening' ? (
            <View pointerEvents="none" style={styles.coverWrap}>
              <Animated.View
                style={{
                  width: coverW,
                  height: coverH,
                  transformOrigin: 'left center',
                  transform: [{ perspective: 1200 }, { rotateY: coverRot }],
                }}
              >
                <Image source={COVER} style={{ width: coverW, height: coverH }} />
              </Animated.View>
            </View>
          ) : null}
        </Pressable>

        {/* Bottom: page arrows + DONE */}
        <View style={styles.bottom}>
          {phase === 'reading' ? (
            <>
              <Pressable onPress={() => go(-1)} disabled={spread === 0} hitSlop={10} style={styles.arrowBtn} accessibilityLabel="Previous page">
                <Text style={[styles.arrow, spread === 0 && styles.arrowOff]}>◀</Text>
              </Pressable>
              {lastSpread ? (
                <Pressable
                  onPress={onDone}
                  disabled={busy}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.done, pressed && styles.donePressed]}
                >
                  <Text style={styles.doneText}>DONE  +1 BREAD</Text>
                </Pressable>
              ) : (
                <Text style={styles.pageCount}>{`${spread + 1} / ${spreads}`}</Text>
              )}
              <Pressable onPress={() => go(1)} disabled={lastSpread} hitSlop={10} style={styles.arrowBtn} accessibilityLabel="Next page">
                <Text style={[styles.arrow, lastSpread && styles.arrowOff]}>▶</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  topBar: { height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  topHint: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#8C7765' },
  close: { fontFamily: 'Silkscreen_700Bold', fontSize: 22, color: '#C9B48A' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  book: { fontFamily: 'Silkscreen_700Bold', fontSize: 11, color: GOLD, letterSpacing: 1, textAlign: 'center' },
  title: { fontFamily: 'Silkscreen_700Bold', fontSize: 15, lineHeight: 20, color: TITLE, textAlign: 'center', marginTop: 8 },
  ref: { fontFamily: 'Montserrat_500Medium', fontSize: 12, color: REF, textAlign: 'center', marginTop: 6 },
  verse: { fontFamily: 'Montserrat_400Regular', fontSize: FONT_SIZE, lineHeight: LINE_H, color: TEXT },
  pageNo: { position: 'absolute', bottom: -2, alignSelf: 'center', fontFamily: 'Montserrat_500Medium', fontSize: 11, color: REF },
  ornament: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  ornamentCross: { fontSize: 34, color: GOLD },
  ornamentText: { fontFamily: 'Montserrat_500Medium', fontSize: 12, color: REF, textAlign: 'center' },
  bottom: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  arrowBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 24, color: GOLD },
  arrowOff: { opacity: 0.25 },
  pageCount: { fontFamily: 'Silkscreen_700Bold', fontSize: 14, color: '#C9B48A', minWidth: 120, textAlign: 'center' },
  done: {
    height: 50,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: '#F2BE4A',
    borderWidth: 3,
    borderColor: INK,
    borderBottomWidth: 7,
    borderBottomColor: '#B07E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donePressed: { borderBottomWidth: 3, transform: [{ translateY: 4 }] },
  doneText: { fontFamily: 'Silkscreen_700Bold', fontSize: 16, color: INK, letterSpacing: 1 },
});
