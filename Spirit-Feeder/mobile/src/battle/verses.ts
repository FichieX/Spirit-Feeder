// Verses shown after a battle (KJV, public domain).

export type Verse = { text: string; ref: string };

export const VICTORY_VERSES: Verse[] = [
  { text: 'Behold, I give unto you power to tread on serpents and scorpions, and over all the power of the enemy.', ref: 'Luke 10:19' },
  { text: 'Submit yourselves therefore to God. Resist the devil, and he will flee from you.', ref: 'James 4:7' },
  { text: 'And the God of peace shall bruise Satan under your feet shortly.', ref: 'Romans 16:20' },
  { text: 'I can do all things through Christ which strengtheneth me.', ref: 'Philippians 4:13' },
  { text: 'The LORD is my light and my salvation; whom shall I fear?', ref: 'Psalm 27:1' },
  { text: 'Thy word have I hid in mine heart, that I might not sin against thee.', ref: 'Psalm 119:11' },
  { text: 'Be strong and of a good courage; be not afraid, neither be thou dismayed.', ref: 'Joshua 1:9' },
  { text: 'Nay, in all these things we are more than conquerors through him that loved us.', ref: 'Romans 8:37' },
];

export const COMFORT_VERSES: Verse[] = [
  { text: 'For a just man falleth seven times, and riseth up again.', ref: 'Proverbs 24:16' },
  { text: 'My grace is sufficient for thee: for my strength is made perfect in weakness.', ref: '2 Corinthians 12:9' },
  { text: 'They that wait upon the LORD shall renew their strength.', ref: 'Isaiah 40:31' },
  { text: 'The LORD upholdeth all that fall, and raiseth up all those that be bowed down.', ref: 'Psalm 145:14' },
];

export const pickVerse = (list: Verse[]) => list[Math.floor(Math.random() * list.length)];
