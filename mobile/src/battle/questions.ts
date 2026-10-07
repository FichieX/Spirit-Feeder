// Bible questions for battles. Each has 1 correct answer + 2 wrong ones.
// tier 1 = easy (serpent at Lv 5), 2 = medium (Lv 10), 3 = hard (Lv 15+).
// Later the backend can send these instead (quiz_questions table).

export type Question = {
  q: string;
  correct: string;
  wrong: [string, string];
  ref: string; // where to read about it
  tier: 1 | 2 | 3;
};

export const QUESTIONS: Question[] = [
  // ---- tier 1: easy ----
  { tier: 1, q: 'Who built the ark?', correct: 'Noah', wrong: ['Moses', 'Abraham'], ref: 'Genesis 6' },
  { tier: 1, q: 'What did God create on the first day?', correct: 'Light', wrong: ['Animals', 'The sun'], ref: 'Genesis 1:3' },
  { tier: 1, q: 'Who was swallowed by a great fish?', correct: 'Jonah', wrong: ['Peter', 'Elijah'], ref: 'Jonah 1:17' },
  { tier: 1, q: 'Who defeated Goliath?', correct: 'David', wrong: ['Saul', 'Samson'], ref: '1 Samuel 17' },
  { tier: 1, q: 'In which town was Jesus born?', correct: 'Bethlehem', wrong: ['Nazareth', 'Jerusalem'], ref: 'Luke 2:4-7' },
  { tier: 1, q: 'How many disciples did Jesus choose?', correct: '12', wrong: ['7', '40'], ref: 'Luke 6:13' },
  { tier: 1, q: 'Who led Israel out of Egypt?', correct: 'Moses', wrong: ['Joshua', 'Joseph'], ref: 'Exodus 12-14' },
  { tier: 1, q: 'What did the serpent tempt Eve to eat?', correct: 'Fruit of the forbidden tree', wrong: ['Bread', 'A fish'], ref: 'Genesis 3' },
  { tier: 1, q: 'Who was thrown into the lions’ den?', correct: 'Daniel', wrong: ['Jeremiah', 'Ezekiel'], ref: 'Daniel 6' },
  { tier: 1, q: 'What is the first book of the Bible?', correct: 'Genesis', wrong: ['Exodus', 'Matthew'], ref: 'Genesis 1:1' },
  { tier: 1, q: 'Which animal spoke to Balaam?', correct: 'A donkey', wrong: ['A lion', 'A serpent'], ref: 'Numbers 22:28' },
  { tier: 1, q: 'Who was the mother of Jesus?', correct: 'Mary', wrong: ['Martha', 'Elizabeth'], ref: 'Luke 1:30-31' },

  // ---- tier 2: medium ----
  { tier: 2, q: 'How many days and nights did it rain on the ark?', correct: '40', wrong: ['7', '100'], ref: 'Genesis 7:12' },
  { tier: 2, q: 'What did Moses lift up in the wilderness so people bitten by serpents could live?', correct: 'A bronze serpent', wrong: ['A golden calf', 'The ark'], ref: 'Numbers 21:8-9' },
  { tier: 2, q: 'Who was sold by his brothers into Egypt?', correct: 'Joseph', wrong: ['Benjamin', 'Isaac'], ref: 'Genesis 37' },
  { tier: 2, q: 'What did Jesus turn water into at Cana?', correct: 'Wine', wrong: ['Milk', 'Oil'], ref: 'John 2:1-11' },
  { tier: 2, q: 'Who denied Jesus three times?', correct: 'Peter', wrong: ['Judas', 'Thomas'], ref: 'Luke 22:54-62' },
  { tier: 2, q: 'Whose strength was in his hair?', correct: 'Samson', wrong: ['Gideon', 'Absalom'], ref: 'Judges 16' },
  { tier: 2, q: 'Which city’s walls fell after Israel marched around it?', correct: 'Jericho', wrong: ['Babylon', 'Nineveh'], ref: 'Joshua 6' },
  { tier: 2, q: 'How many loaves did Jesus use to feed the 5,000?', correct: '5', wrong: ['2', '12'], ref: 'John 6:9' },
  { tier: 2, q: 'Who was the first king of Israel?', correct: 'Saul', wrong: ['David', 'Solomon'], ref: '1 Samuel 10' },
  { tier: 2, q: 'What did God give Moses on Mount Sinai?', correct: 'The Ten Commandments', wrong: ['A staff', 'Manna'], ref: 'Exodus 20' },
  { tier: 2, q: 'Who was taken up to heaven in a whirlwind?', correct: 'Elijah', wrong: ['Elisha', 'Enoch'], ref: '2 Kings 2:11' },
  { tier: 2, q: 'Who wrote most of the Psalms?', correct: 'David', wrong: ['Solomon', 'Asaph'], ref: 'Psalms' },

  // ---- tier 3: hard ----
  { tier: 3, q: 'In John 1, what was “in the beginning”?', correct: 'The Word', wrong: ['The Light', 'The Spirit'], ref: 'John 1:1' },
  { tier: 3, q: 'Who climbed a sycamore tree to see Jesus?', correct: 'Zacchaeus', wrong: ['Nicodemus', 'Bartimaeus'], ref: 'Luke 19:1-4' },
  { tier: 3, q: 'What was Paul’s name before he was called Paul?', correct: 'Saul', wrong: ['Silas', 'Simon'], ref: 'Acts 13:9' },
  { tier: 3, q: 'How old was Methuselah when he died?', correct: '969', wrong: ['777', '930'], ref: 'Genesis 5:27' },
  { tier: 3, q: 'Which prophet saw a valley of dry bones?', correct: 'Ezekiel', wrong: ['Isaiah', 'Daniel'], ref: 'Ezekiel 37' },
  { tier: 3, q: 'Who was the Moabite who said “thy people shall be my people”?', correct: 'Ruth', wrong: ['Naomi', 'Esther'], ref: 'Ruth 1:16' },
  { tier: 3, q: 'What shook off Paul’s hand into the fire on Malta?', correct: 'A viper', wrong: ['A scorpion', 'A spider'], ref: 'Acts 28:3-5' },
  { tier: 3, q: 'Which king saw handwriting on the wall?', correct: 'Belshazzar', wrong: ['Nebuchadnezzar', 'Darius'], ref: 'Daniel 5' },
  { tier: 3, q: 'What is the shortest verse in the Bible (KJV)?', correct: 'Jesus wept.', wrong: ['Pray without ceasing.', 'Rejoice evermore.'], ref: 'John 11:35' },
  { tier: 3, q: 'Who interpreted Pharaoh’s dream of seven cows?', correct: 'Joseph', wrong: ['Daniel', 'Moses'], ref: 'Genesis 41' },
];

export function tierFor(level: number): 1 | 2 | 3 {
  if (level >= 15) return 3;
  if (level >= 10) return 2;
  return 1;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Questions for one battle: mostly from this level's tier, a few easier ones mixed in.
export function pickQuestions(level: number, count = 10): Question[] {
  const tier = tierFor(level);
  const main = shuffle(QUESTIONS.filter((q) => q.tier === tier));
  const rest = shuffle(QUESTIONS.filter((q) => q.tier !== tier));
  return [...main, ...rest].slice(0, count);
}

// The three answers in random order
export function choicesFor(q: Question): string[] {
  return shuffle([q.correct, ...q.wrong]);
}
