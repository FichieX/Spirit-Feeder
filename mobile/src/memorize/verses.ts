import AsyncStorage from '@react-native-async-storage/async-storage';

// Famous verses to memorize (KJV, public domain), sorted from short to long.
// They unlock one by one: finish one to get the next.
export type Verse = { ref: string; text: string };

const LIST: Verse[] = [
  { ref: '1 Thessalonians 5:17', text: 'Pray without ceasing.' },
  { ref: 'Psalm 56:3', text: 'What time I am afraid, I will trust in thee.' },
  { ref: 'Psalm 23:1', text: 'The LORD is my shepherd; I shall not want.' },
  { ref: 'Genesis 1:1', text: 'In the beginning God created the heaven and the earth.' },
  { ref: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.' },
  { ref: '1 John 4:8', text: 'He that loveth not knoweth not God; for God is love.' },
  { ref: 'John 8:32', text: 'And ye shall know the truth, and the truth shall make you free.' },
  { ref: '1 Peter 5:7', text: 'Casting all your care upon him; for he careth for you.' },
  { ref: 'Psalm 119:105', text: 'Thy word is a lamp unto my feet, and a light unto my path.' },
  { ref: 'Romans 3:23', text: 'For all have sinned, and come short of the glory of God;' },
  { ref: 'Proverbs 3:6', text: 'In all thy ways acknowledge him, and he shall direct thy paths.' },
  { ref: 'Psalm 119:11', text: 'Thy word have I hid in mine heart, that I might not sin against thee.' },
  { ref: 'Hebrews 11:1', text: 'Now faith is the substance of things hoped for, the evidence of things not seen.' },
  { ref: 'Proverbs 3:5', text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.' },
  { ref: 'John 1:1', text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
  { ref: 'Matthew 11:28', text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.' },
  { ref: 'Psalm 118:24', text: 'This is the day which the LORD hath made; we will rejoice and be glad in it.' },
  { ref: 'Ephesians 2:8', text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:' },
  { ref: 'Romans 6:23', text: 'For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.' },
  { ref: 'Psalm 46:10', text: 'Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.' },
  { ref: '1 John 1:9', text: 'If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.' },
  { ref: 'John 14:6', text: 'Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.' },
  { ref: 'Matthew 6:33', text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.' },
  { ref: '2 Corinthians 5:17', text: 'Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.' },
  { ref: 'Matthew 5:16', text: 'Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.' },
  { ref: 'Philippians 4:6', text: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.' },
  { ref: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.' },
  { ref: 'Romans 8:28', text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' },
  { ref: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
  { ref: 'Micah 6:8', text: 'He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?' },
  { ref: 'Isaiah 40:31', text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.' },
  { ref: 'Joshua 1:9', text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.' },
];

const wordCount = (v: Verse) => v.text.split(/\s+/).length;
export const VERSES: Verse[] = [...LIST].sort((a, b) => wordCount(a) - wordCount(b));

// ---------- Words ----------
// "LORD;" -> { before: '', word: 'LORD', after: ';' }
export type Token = { before: string; word: string; after: string; full: string };

export function tokenize(text: string): Token[] {
  return text.split(/\s+/).filter(Boolean).map((full) => {
    const m = full.match(/^([^A-Za-z0-9']*)([A-Za-z0-9'’-]+)([^A-Za-z0-9']*)$/);
    return m ? { before: m[1], word: m[2], after: m[3], full } : { before: '', word: full, after: '', full };
  });
}

export const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Which words to hide: about `share` of them, preferring real words (3+ letters).
// `keep` = words already hidden in an earlier round (they stay hidden).
export function pickBlanks(tokens: Token[], share: number, keep: number[] = []): number[] {
  const want = Math.max(1, Math.round(tokens.length * share));
  const chosen = new Set(keep);
  const big = shuffle(tokens.map((t, i) => i).filter((i) => tokens[i].word.length >= 3 && !chosen.has(i)));
  const small = shuffle(tokens.map((t, i) => i).filter((i) => tokens[i].word.length < 3 && !chosen.has(i)));
  for (const i of [...big, ...small]) {
    if (chosen.size >= want) break;
    chosen.add(i);
  }
  return [...chosen].sort((a, b) => a - b);
}

const FILLER = ['LORD', 'heart', 'light', 'world', 'faith', 'love', 'peace', 'truth', 'heaven', 'grace', 'life', 'word', 'glory', 'Father'];

// Three choices for a blank: the right word + 2 others (from the same verse when possible)
export function choicesFor(tokens: Token[], index: number): string[] {
  const right = tokens[index].word;
  const others: string[] = [];
  for (const t of shuffle(tokens)) {
    if (others.length >= 2) break;
    if (!same(t.word, right) && !others.some((o) => same(o, t.word)) && t.word.length >= 2) others.push(t.word);
  }
  for (const f of shuffle(FILLER)) {
    if (others.length >= 2) break;
    if (!same(f, right) && !others.some((o) => same(o, f))) others.push(f);
  }
  return shuffle([right, ...others]);
}

export const scrambled = (tokens: Token[]) => shuffle(tokens.map((t, i) => ({ id: i, text: t.full })));

// ---------- Progress (saved on the phone, per account) ----------
// stage 0 = just learned. Reviews come back after 1, 3 and 7 days, then every 30 days ("mastered").
export const REVIEW_DAYS = [1, 3, 7, 30];
export const WATER_PER_DAY = 3;
const DAY = 24 * 60 * 60 * 1000;

export type VerseProgress = { stage: number; due: number; learnedAt: number };
export type MemoryState = { verses: Record<string, VerseProgress>; waterDay: string; waterCount: number };
export type Kind = 'new' | 'review' | 'practice';

const todayKey = (now = Date.now()) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const keyFor = (username?: string) => `memory:${username ?? 'guest'}`;
const EMPTY: MemoryState = { verses: {}, waterDay: '', waterCount: 0 };

export async function loadMemory(username?: string): Promise<MemoryState> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(username));
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export async function saveMemory(username: string | undefined, state: MemoryState) {
  try {
    await AsyncStorage.setItem(keyFor(username), JSON.stringify(state));
  } catch {}
}

export const nextNewVerse = (s: MemoryState) => VERSES.find((v) => !s.verses[v.ref]) ?? null;
export const dueVerses = (s: MemoryState, now = Date.now()) => VERSES.filter((v) => s.verses[v.ref] && s.verses[v.ref].due <= now);
export const learnedVerses = (s: MemoryState) => VERSES.filter((v) => s.verses[v.ref]);
export const waterLeftToday = (s: MemoryState, now = Date.now()) => (s.waterDay === todayKey(now) ? Math.max(0, WATER_PER_DAY - s.waterCount) : WATER_PER_DAY);
export const isMastered = (p?: VerseProgress) => !!p && p.stage >= REVIEW_DAYS.length - 1;

// Finish a verse. Returns the new progress and whether this earned a water.
//   new      -> learned, review in 1 day, +1 water (if any left today)
//   review   -> next review further away, +1 water (if any left today)
//   practice -> extra practice (not due): XP only, no water
export function finishVerse(s: MemoryState, ref: string, kind: Kind, now = Date.now()): { state: MemoryState; water: boolean } {
  const verses = { ...s.verses };
  const old = verses[ref];
  if (kind === 'new' || !old) {
    verses[ref] = { stage: 0, due: now + REVIEW_DAYS[0] * DAY, learnedAt: now };
  } else if (kind === 'review') {
    const stage = Math.min(old.stage + 1, REVIEW_DAYS.length - 1);
    verses[ref] = { ...old, stage, due: now + REVIEW_DAYS[stage] * DAY };
  }
  const day = todayKey(now);
  const count = s.waterDay === day ? s.waterCount : 0;
  const water = kind !== 'practice' && count < WATER_PER_DAY;
  return { state: { verses, waterDay: day, waterCount: count + (water ? 1 : 0) }, water };
}
