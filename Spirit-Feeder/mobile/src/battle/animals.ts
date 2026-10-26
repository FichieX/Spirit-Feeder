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
  move('faithful_step', 'Faithful Step', 'Proverbs 3:6', 'Steady advance', 70, 100, 3, 'In all thy ways acknowledge him, and he shall direct thy paths.'),
  move('shield_of_truth', 'Shield of Truth', 'John 8:32', 'Deflects damage', 0, 100, 2, 'And ye shall know the truth, and the truth shall make you free.'),
  move('light_bearer', 'Light Bearer', 'Psalm 119:105', 'Boosts accuracy', 68, 100, 3, 'Thy word is a lamp unto my feet, and a light unto my path.'),
  move('grace_finish', 'Grace Finish', 'Romans 8:37', 'Finisher', 94, 98, 2, 'Nay, in all these things we are more than conquerors through him that loved us.'),
  move('hope_anchor', 'Hope Anchor', 'Jeremiah 29:11', 'Stabilises the battle', 0, 100, 2, 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.'),
  move('peace_rest', 'Peace Rest', 'Psalm 46:10', 'Recover focus', 0, 100, 2, 'Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.'),
];

export const ANIMAL_TYPES: Record<AnimalKey, AnimalTypeDef> = {
  lion: {
    name: 'Lion',
    type: 'Royal',
    strong_against: ['camel', 'raven'],
    weak_to: ['dove', 'donkey'],
    neutral: ['fish'],
    moves: [
      move('roar_of_judah', 'Roar of Judah', 'Revelation 5:5', 'Roaring strike', 86, 100, 4, 'Behold, the Lion of the tribe of Judah, the Root of David, hath prevailed.'),
      move('den_of_deliverance', 'Den of Deliverance', 'Daniel 6:22', 'Defensive shield', 0, 100, 3, 'My God hath sent his angel, and hath shut the lions\' mouths, so that they have not hurt me.'),
      move('prey_tear', 'Prey Tear', 'Psalm 17:12', 'Priority attack', 92, 100, 3, 'He is like a lion that is greedy of his prey.'),
      move('wrath_of_the_king', 'Wrath of the King', 'Proverbs 19:12', 'Finisher', 110, 96, 2, 'The king\'s wrath is as the roaring of a lion; but his favour is as dew upon the grass.'),
      move('courage_of_gideon', 'Courage of Gideon', 'Judges 7:20', 'Heavy blow', 98, 95, 2, 'The sword of the LORD and of Gideon.'),
      move('joshua_stand', 'Joshua Stand', 'Joshua 1:9', 'Confidence burst', 88, 100, 3, 'Be strong and of a good courage; be not afraid, neither be thou dismayed.'),
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
      move('balaams_rebuke', 'Balaam’s Rebuke', 'Numbers 22:28', 'Cancel attack', 78, 100, 3, 'And the LORD opened the mouth of the ass, and she said unto Balaam, What have I done unto thee?'),
      move('angelic_vision', 'Angelic Vision', 'Numbers 22:23', 'Protect', 0, 100, 3, 'The donkey saw the angel of the LORD standing in the way, and turned aside.'),
      move('issachars_burden', 'Issachar’s Burden', 'Genesis 49:14', 'Defense boost', 0, 100, 2, 'Issachar is a strong ass couching down between two burdens.'),
      move('unbroken_colt', 'Unbroken Colt', 'Mark 11:2', 'Strong opener', 96, 100, 3, 'Go your way into the village over against you; and straightway ye shall find an ass tied.'),
      move('stone_of_help', 'Stone of Help', '1 Samuel 7:12', 'Buckle down', 83, 100, 3, 'Then Samuel took a stone, and set it between Mizpeh and Shen, and called the name of it Eben-ezer.'),
      move('well_of_refreshment', 'Well of Refreshment', 'Genesis 29:2', 'Recover', 0, 100, 2, 'And Jacob said, Here is the well of water; this is the place of refreshment.'),
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
      move('queens_tribute', 'Queen’s Tribute', '1 Kings 10:2', 'Lower attack', 72, 100, 3, 'And she gave the king an hundred and twenty talents of gold, and of spices great abundance.'),
      move('midianite_swarm', 'Midianite Swarm', 'Judges 7:12', 'Multi-hit', 88, 100, 3, 'And the camp was like a swarm of locusts for multitude.'),
      move('desert_ship', 'Desert Ship', 'Isaiah 60:6', 'Weather support', 0, 100, 3, 'The multitude of camels shall cover thee, the dromedaries of Midian and Ephah.'),
      move('endurance_trek', 'Endurance Trek', 'Genesis 31:17', 'Survive fatal hit', 0, 100, 2, 'Then Jacob rose up, and set his sons and his wives upon camels.'),
      move('oasis_breath', 'Oasis Breath', 'Genesis 24:19', 'Refresh and recover', 0, 100, 2, 'Drink, my lord: and she hasted, and let down her pitcher upon her hand, and gave him drink.'),
      move('rain_on_desert', 'Rain on Desert', 'Joel 2:23', 'Steady pressure', 80, 100, 2, 'Be glad then, ye children of Zion, and rejoice in the LORD your God: for he hath given you the former rain moderately.'),
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
      move('eye_pluck', 'Eye Pluck', 'Proverbs 30:17', 'Accuracy drop', 82, 95, 3, 'The eye that mocketh at his father, and despiseth to obey his mother.'),
      move('noahs_scout', 'Noah’s Scout', 'Genesis 8:7', 'Two-turn strike', 90, 100, 3, 'And he sent forth a raven, which went to and fro, until the waters were dried up from off the earth.'),
      move('plumage_of_night', 'Plumage of Night', 'Song of Solomon 5:11', 'Evasion buff', 0, 100, 2, 'His head is as the most fine gold, his locks are bushy, and black as a raven.'),
      move('unclean_dive', 'Unclean Dive', 'Leviticus 11:15', 'Poison hit', 88, 100, 3, 'The raven after his kind.'),
      move('shadow_wing', 'Shadow Wing', 'Psalm 91:1', 'Winged dodge', 0, 100, 2, 'He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.'),
      move('midnight_call', 'Midnight Call', 'Joel 2:31', 'Strike from the dark', 84, 100, 2, 'The sun shall be turned into darkness, and the moon into blood, before the great and terrible day of the LORD come.'),
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
      move('olive_branch', 'Olive Branch', 'Genesis 8:11', 'Pause enemy attack', 0, 100, 3, 'And the dove came in to him in the evening; and, lo, in her mouth was an olive leaf plucked off.'),
      move('jordan_descent', 'Jordan Descent', 'Matthew 3:16', 'Special damage', 92, 100, 3, 'And lo a voice from heaven, saying, This is my beloved Son, in whom I am well pleased.'),
      move('innocent_flight', 'Innocent Flight', 'Matthew 10:16', 'Dodge and evade', 0, 100, 2, 'Be ye therefore wise as serpents, and harmless as doves.'),
      move('purification', 'Purification', 'Leviticus 12:8', 'Clear debuffs', 0, 100, 2, 'And if she be not able to bring a lamb, then she shall bring two turtles, or two young pigeons.'),
      move('hushed_wings', 'Hushed Wings', 'Isaiah 30:15', 'Silence enemy', 76, 100, 2, 'In quietness and in confidence shall be your strength.'),
      move('peace_song', 'Peace Song', 'Song of Solomon 2:12', 'Calm the field', 0, 100, 2, 'The flowers appear on the earth; the time of the singing of birds is come.'),
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
      move('jonahs_swallow', 'Jonah’s Swallow', 'Jonah 1:17', 'Trap and damage', 90, 100, 3, 'Now the LORD had prepared a great fish to swallow up Jonah. And Jonah was in the belly of the fish three days and three nights.'),
      move('right_side_net', 'Right Side Net', 'John 21:6', 'Never misses', 85, 100, 3, 'Cast the net on the right side of the ship, and ye shall find.'),
      move('tiberias_swarm', 'Tiberias Swarm', 'Luke 5:6', 'Multi-hit', 86, 100, 3, 'And when they had this done, they inclosed a great multitude of fishes: and their net brake.'),
      move('depths_of_the_sea', 'Depths of the Sea', 'Micah 7:19', 'Reset stat boosts', 0, 100, 2, 'He will turn again, he will have compassion upon us; he will subdue our iniquities; and thou wilt cast all their sins into the depths of the sea.'),
      move('great_catch', 'Great Catch', 'Luke 5:4', 'Giant pull', 93, 100, 2, 'Launch out into the deep, and let down your nets for a draught.'),
      move('stream_of_grace', 'Stream of Grace', 'John 7:38', 'Heal and recover', 0, 100, 2, 'He that believeth on me, as the scripture hath said, out of his belly shall flow rivers of living water.'),
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
