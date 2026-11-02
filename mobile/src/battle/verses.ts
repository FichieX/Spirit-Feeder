// Verses shown after a battle (BSB, Berean Standard Bible, public domain).

export type Verse = { text: string; ref: string };

export const VICTORY_VERSES: Verse[] = [
  { text: 'Behold, I have given you authority to tread on snakes and scorpions, and over all the power of the enemy.', ref: 'Luke 10:19' },
  { text: 'Submit yourselves, then, to God. Resist the devil, and he will flee from you.', ref: 'James 4:7' },
  { text: 'The God of peace will soon crush Satan under your feet.', ref: 'Romans 16:20' },
  { text: 'I can do all things through Christ who gives me strength.', ref: 'Philippians 4:13' },
  { text: 'The LORD is my light and my salvation—whom shall I fear?', ref: 'Psalm 27:1' },
  { text: 'I have hidden Your word in my heart that I might not sin against You.', ref: 'Psalm 119:11' },
  { text: 'Have I not commanded you to be strong and courageous? Do not be afraid; do not be discouraged.', ref: 'Joshua 1:9' },
  { text: 'No, in all these things we are more than conquerors through Him who loved us.', ref: 'Romans 8:37' },
];

export const COMFORT_VERSES: Verse[] = [
  { text: 'For though a righteous man may fall seven times, he still gets up.', ref: 'Proverbs 24:16' },
  { text: 'My grace is sufficient for you, for My power is perfected in weakness.', ref: '2 Corinthians 12:9' },
  { text: 'Those who wait upon the LORD will renew their strength.', ref: 'Isaiah 40:31' },
  { text: 'The LORD upholds all who fall and lifts up all who are bowed down.', ref: 'Psalm 145:14' },
];

export const pickVerse = (list: Verse[]) => list[Math.floor(Math.random() * list.length)];
