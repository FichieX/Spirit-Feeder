export type AnimalKey = 'lion' | 'donkey' | 'camel' | 'raven' | 'dove' | 'fish';

export type AnimalMove = {
  key: string;
  name: string;
  verse_ref: string;
  verseText?: string;
  description: string;
  power: number;
  accuracy: number;
  pp?: number;
};

export type AnimalTypeDef = {
  name: string;
  type: string;
  strong_against: AnimalKey[];
  weak_to: AnimalKey[];
  neutral: AnimalKey[];
  moves: AnimalMove[];
};

const move = (key: string, name: string, verse_ref: string, description: string, power: number, accuracy: number, pp: number, verseText?: string): AnimalMove => ({
  key,
  name,
  verse_ref,
  verseText: verseText ?? name,
  description,
  power,
  accuracy,
  pp,
});

const shared = [
  move('faithful_step', 'Faithful Step', 'Proverbs 3:5-6', 'Trust God in every step', 72, 100, 3, 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.'),
  move('grace_in_weakness', 'Grace in Weakness', '2 Corinthians 12:9', 'Grace steadies the battle', 0, 100, 2, 'My grace is sufficient for thee: for my strength is made perfect in weakness.'),
  move('armor_of_god', 'Armor of God', 'Ephesians 6:11', 'Defensive protection', 0, 100, 3, 'Put on the whole armour of God, that ye may be able to stand against the wiles of the devil.'),
  move('victory_in_christ', 'Victory in Christ', 'Romans 8:37', 'Finisher', 96, 98, 2, 'Nay, in all these things we are more than conquerors through him that loved us.'),
];

export const ANIMAL_TYPES: Record<AnimalKey, AnimalTypeDef> = {
  lion: {
    name: 'Lion',
    type: 'Royal',
    strong_against: ['camel', 'raven'],
    weak_to: ['dove', 'donkey'],
    neutral: ['fish'],
    moves: [
      move('roar_of_judah', 'Roar of Judah', 'Revelation 5:5', 'Royal authority strike', 88, 100, 4, 'Behold, the Lion of the tribe of Judah, the Root of David, hath prevailed.'),
      move('courage_of_gideon', 'Courage of Gideon', 'Joshua 1:9', 'Bold charge', 90, 100, 3, 'Be strong and of a good courage; be not afraid, neither be thou dismayed.'),
      move('strength_in_christ', 'Strength in Christ', 'Philippians 4:13', 'Divine power burst', 92, 100, 3, 'I can do all things through Christ which strengtheneth me.'),
      move('old_self_crucified', 'Old Self Crucified', 'Romans 6:6', 'Breaks enemy momentum', 86, 100, 3, 'Knowing this, that our old man is crucified with him, that the body of sin might be destroyed.'),
      move('kingdom_authority', 'Kingdom Authority', 'Psalm 24:7', 'Commanding strike', 84, 100, 3, 'Lift up your heads, O ye gates; and be ye lift up, ye everlasting doors; and the King of glory shall come in.'),
      move('stand_firm', 'Stand Firm', 'Ephesians 6:13', 'Guard and brace', 0, 100, 2, 'Wherefore take unto you the whole armour of God, that ye may be able to withstand in the evil day.'),
      ...shared,
    ].slice(0, 10),
  },
  donkey: {
    name: 'Donkey',
    type: 'Ground',
    strong_against: ['lion', 'dove'],
    weak_to: ['raven', 'fish'],
    neutral: ['camel'],
    moves: [
      move('humble_load', 'Humble Load', 'Matthew 11:29', 'Patient burden-bearer', 78, 100, 3, 'Take my yoke upon you, and learn of me; for I am meek and lowly in heart.'),
      move('kindness_remedy', 'Kindness Remedy', 'Ephesians 4:32', 'Forgive and steady', 80, 100, 3, 'Be kind one to another, tenderhearted, forgiving one another, even as God for Christ\'s sake hath forgiven you.'),
      move('trust_in_lord', 'Trust in the Lord', 'Proverbs 3:5-6', 'Steady guidance', 82, 100, 3, 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.'),
      move('gentle_guidance', 'Gentle Guidance', 'Psalm 23:3', 'Calm recovery', 0, 100, 2, 'He restoreth my soul: he leadeth me in the paths of righteousness for his name\'s sake.'),
      move('burden_bearer', 'Burden Bearer', 'Galatians 6:2', 'Carry others', 84, 100, 3, 'Bear ye one another\'s burdens, and so fulfil the law of Christ.'),
      move('steady_heart', 'Steady Heart', 'Isaiah 40:31', 'Long endurance', 88, 100, 3, 'They that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles.'),
      ...shared,
    ].slice(0, 10),
  },
  camel: {
    name: 'Camel',
    type: 'Desert',
    strong_against: ['dove', 'fish'],
    weak_to: ['lion', 'donkey'],
    neutral: ['raven'],
    moves: [
      move('endurance_in_trial', 'Endurance in Trial', 'James 1:12', 'The long march attack', 82, 100, 3, 'Blessed is the man that endureth temptation: for when he is tried, he shall receive the crown of life.'),
      move('grace_for_the_journey', 'Grace for the Journey', '2 Corinthians 12:9', 'Stay standing through hardship', 0, 100, 2, 'My grace is sufficient for thee: for my strength is made perfect in weakness.'),
      move('renewed_strength', 'Renewed Strength', 'Isaiah 40:31', 'Endurance burst', 90, 100, 3, 'They that wait upon the LORD shall renew their strength; they shall run, and not be weary.'),
      move('perseverance_run', 'Perseverance Run', 'Hebrews 12:1-2', 'Lasting advance', 86, 100, 3, 'Let us run with patience the race that is set before us, looking unto Jesus.'),
      move('manna_for_the_journey', 'Manna for the Journey', 'Exodus 16:4', 'Sustain and recover', 0, 100, 2, 'Behold, I will rain bread from heaven for you.'),
      move('rest_in_him', 'Rest in Him', 'Psalm 23:1-2', 'Recover and steady', 0, 100, 2, 'The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures.'),
      ...shared,
    ].slice(0, 10),
  },
  raven: {
    name: 'Raven',
    type: 'Dark',
    strong_against: ['donkey', 'fish'],
    weak_to: ['dove', 'lion'],
    neutral: ['camel'],
    moves: [
      move('watchful_wing', 'Watchful Wing', '1 Peter 5:8', 'Alert pressure', 82, 100, 3, 'Be sober, be vigilant; because your adversary the devil, as a roaring lion, walketh about, seeking whom he may devour.'),
      move('hidden_refuge', 'Hidden Refuge', 'Psalm 91:1', 'Defensive glider', 0, 100, 2, 'He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.'),
      move('spiritual_weapons', 'Spiritual Weapons', '2 Corinthians 10:4-5', 'Disruptive attack', 88, 100, 3, 'The weapons of our warfare are not carnal, but mighty through God to the pulling down of strong holds.'),
      move('awake_and_sober', 'Awake and Sober', '1 Thessalonians 5:6', 'Precision strike', 84, 100, 3, 'Let us not sleep, as do others; but let us watch and be sober.'),
      move('armour_of_light', 'Armor of Light', 'Ephesians 6:13', 'Protective ward', 0, 100, 2, 'Wherefore take unto you the whole armour of God, that ye may be able to withstand.'),
      move('fear_not', 'Fear Not', 'Joshua 1:9', 'Battle focus', 86, 100, 3, 'Be strong and of a good courage; be not afraid, neither be thou dismayed.'),
      ...shared,
    ].slice(0, 10),
  },
  dove: {
    name: 'Dove',
    type: 'Spirit',
    strong_against: ['lion', 'raven'],
    weak_to: ['fish', 'camel'],
    neutral: ['donkey'],
    moves: [
      move('peace_of_christ', 'Peace of Christ', 'John 14:27', 'Calm the field', 0, 100, 2, 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you.'),
      move('peacemaker', 'Peacemaker', 'Matthew 5:9', 'Soften enemy pressure', 78, 100, 3, 'Blessed are the peacemakers: for they shall be called the children of God.'),
      move('kindness_bears_all', 'Kindness Bears All', 'Ephesians 4:32', 'Restore harmony', 80, 100, 3, 'Be kind one to another, tenderhearted, forgiving one another, even as God for Christ\'s sake hath forgiven you.'),
      move('live_peaceably', 'Live Peaceably', 'Romans 12:18', 'Calm and recover', 0, 100, 2, 'If it be possible, as much as lieth in you, live peaceably with all men.'),
      move('pure_heart', 'Pure Heart', 'Matthew 5:8', 'Cleanse the battle', 0, 100, 2, 'Blessed are the pure in heart: for they shall see God.'),
      move('quiet_strength', 'Quiet Strength', 'Isaiah 30:15', 'Silence enemy', 76, 100, 2, 'In quietness and in confidence shall be your strength.'),
      ...shared,
    ].slice(0, 10),
  },
  fish: {
    name: 'Fish',
    type: 'Miracle',
    strong_against: ['dove', 'donkey'],
    weak_to: ['camel', 'raven'],
    neutral: ['lion'],
    moves: [
      move('fishers_of_people', 'Fishers of People', 'Mark 1:17', 'Gospel call', 84, 100, 3, 'Follow me, and I will make you fishers of men.'),
      move('living_water', 'Living Water', 'John 7:38', 'Heal and recover', 0, 100, 2, 'He that believeth on me, as the scripture hath said, out of his belly shall flow rivers of living water.'),
      move('deep_trust', 'Deep Trust', 'Luke 5:4-5', 'Huge catch', 90, 100, 3, 'Launch out into the deep, and let down your nets for a draught.'),
      move('born_of_god', 'Born of God', 'John 1:12', 'Divine strength', 86, 100, 3, 'As many as received him, to them gave he power to become the sons of God.'),
      move('follow_me', 'Follow Me', 'Matthew 4:19', 'Swift pursuit', 82, 100, 3, 'Follow me, and I will make you fishers of men.'),
      move('grace_abounds', 'Grace Abounds', 'Romans 5:8', 'Sacrificial strike', 88, 100, 3, 'But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.'),
      ...shared,
    ].slice(0, 10),
  },
};

export const getAnimalMoves = (key: AnimalKey) => ANIMAL_TYPES[key].moves;

export const ALL_ANIMAL_MOVE_VERSES = Object.values(ANIMAL_TYPES).flatMap((animal) =>
  animal.moves.map((moveDef) => ({
    ref: moveDef.verse_ref,
    text: moveDef.verseText ?? moveDef.name,
    animalKey: animal.name.toLowerCase() as AnimalKey,
    moveKey: moveDef.key,
  })),
);

export const scrambleWords = (text: string): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const copy = [...words];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const isTypeAdvantage = (attacker: AnimalKey, defender: AnimalKey) => {
  return ANIMAL_TYPES[attacker].strong_against.includes(defender);
};

export const isTypeDisadvantage = (attacker: AnimalKey, defender: AnimalKey) => {
  return ANIMAL_TYPES[attacker].weak_to.includes(defender);
};

export const getBattleHealth = (level: number, animalKey: AnimalKey) => {
  const base = {
    lion: 150,
    donkey: 145,
    camel: 155,
    raven: 140,
    dove: 150,
    fish: 148,
  }[animalKey] ?? 145;
  return Math.round(base + Math.max(0, level - 1) * 18);
};

export const computeAnimalDamage = (attacker: AnimalKey, defender: AnimalKey, attackPower: number, attackerLevel: number, defenderLevel: number) => {
  const multiplier = isTypeAdvantage(attacker, defender) ? 1.5 : isTypeDisadvantage(attacker, defender) ? 0.7 : 1;
  const base = attackPower + attackerLevel * 5 - defenderLevel * 3;
  const damage = Math.max(0, Math.round(base * multiplier));
  return { damage, multiplier };
};

export const chooseCpuMove = (animal: AnimalKey) => {
  const moves = getAnimalMoves(animal);
  return moves[Math.floor(Math.random() * moves.length)];
};

export const getVerseMovePower = (text: string) => {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.min(120, 52 + words * 4 + (text.length % 17));
};

export const getVerseMoveAccuracy = (text: string) => Math.min(100, 72 + (text.length % 12));

export const getVerseMovePP = (text: string) => Math.min(5, 2 + (text.length % 3));
