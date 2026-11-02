import AsyncStorage from '@react-native-async-storage/async-storage';

// Famous verses to memorize (BSB, Berean Standard Bible, public domain), sorted from short to long.
// They unlock one by one: finish one to get the next.
export type Verse = { ref: string; text: string };

const LIST: Verse[] = [
  { ref: '1 Thessalonians 5:17', text: 'Pray without ceasing.' },
  { ref: 'Psalm 56:3', text: 'When I am afraid, I put my trust in You.' },
  { ref: 'Psalm 23:1', text: 'The LORD is my shepherd; I shall not want.' },
  { ref: 'Genesis 1:1', text: 'In the beginning God created the heavens and the earth.' },
  { ref: 'Philippians 4:13', text: 'I can do all things through Christ who gives me strength.' },
  { ref: '1 John 4:8', text: 'Whoever does not love does not know God, because God is love.' },
  { ref: 'John 8:32', text: 'Then you will know the truth, and the truth will set you free.' },
  { ref: '1 Peter 5:7', text: 'Cast all your anxiety on Him, because He cares for you.' },
  { ref: 'Psalm 119:105', text: 'Your word is a lamp to my feet and a light to my path.' },
  { ref: 'Romans 3:23', text: 'For all have sinned and fall short of the glory of God.' },
  { ref: 'Proverbs 3:6', text: 'In all your ways acknowledge Him, and He will make your paths straight.' },
  { ref: 'Psalm 119:11', text: 'I have hidden Your word in my heart that I might not sin against You.' },
  { ref: 'Hebrews 11:1', text: 'Now faith is the assurance of what we hope for and the certainty of what we do not see.' },
  { ref: 'Proverbs 3:5', text: 'Trust in the LORD with all your heart, and lean not on your own understanding.' },
  { ref: 'John 1:1', text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
  { ref: 'Matthew 11:28', text: 'Come to Me, all you who are weary and burdened, and I will give you rest.' },
  { ref: 'Psalm 118:24', text: 'This is the day that the LORD has made; we will rejoice and be glad in it.' },
  { ref: 'Ephesians 2:8', text: 'For it is by grace you have been saved through faith, and this not from yourselves; it is the gift of God.' },
  { ref: 'Romans 6:23', text: 'For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord.' },
  { ref: 'Psalm 46:10', text: 'Be still and know that I am God; I will be exalted among the nations, I will be exalted over the earth.' },
  { ref: '1 John 1:9', text: 'If we confess our sins, He is faithful and just to forgive us our sins and to cleanse us from all unrighteousness.' },
  { ref: 'John 14:6', text: 'Jesus answered, “I am the way and the truth and the life. No one comes to the Father except through Me.”' },
  { ref: 'Matthew 6:33', text: 'But seek first the kingdom of God and His righteousness, and all these things will be added unto you.' },
  { ref: '2 Corinthians 5:17', text: 'Therefore if anyone is in Christ, he is a new creation. The old has passed away. Behold, the new has come!' },
  { ref: 'Matthew 5:16', text: 'In the same way, let your light shine before men, that they may see your good deeds and glorify your Father in heaven.' },
  { ref: 'Philippians 4:6', text: 'Be anxious for nothing, but in everything, by prayer and petition, with thanksgiving, present your requests to God.' },
  { ref: 'Jeremiah 29:11', text: 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, to give you a future and a hope.' },
  { ref: 'Romans 8:28', text: 'And we know that God works all things together for the good of those who love Him, who are called according to His purpose.' },
  { ref: 'John 3:16', text: 'For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.' },
  { ref: 'Micah 6:8', text: 'He has shown you, O man, what is good. And what does the LORD require of you but to act justly, to love mercy, and to walk humbly with your God?' },
  { ref: 'Isaiah 40:31', text: 'But those who wait upon the LORD will renew their strength; they will mount up with wings like eagles; they will run and not grow weary, they will walk and not faint.' },
  { ref: 'Joshua 1:9', text: 'Have I not commanded you to be strong and courageous? Do not be afraid; do not be discouraged, for the LORD your God is with you wherever you go.' },
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
