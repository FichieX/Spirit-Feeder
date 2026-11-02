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

const move = (
  key: string,
  name: string,
  verse_ref: string,
  description: string,
  power: number,
  accuracy: number,
  pp: number,
  verseText?: string,
): AnimalMove => ({
  key,
  name,
  verse_ref,
  verseText: verseText ?? name,
  description,
  power,
  accuracy,
  pp,
});

const sharedMoves: AnimalMove[] = [
  move('faithful_step', 'Faithful Step', 'Proverbs 3:6', 'Steady advance', 70, 100, 3, 'In all your ways acknowledge Him, and He will make your paths straight.'),
  move('shield_of_truth', 'Shield of Truth', 'John 8:32', 'Deflects damage', 0, 100, 2, 'Then you will know the truth, and the truth will set you free.'),
  move('light_bearer', 'Light Bearer', 'Psalm 119:105', 'Boosts accuracy', 68, 100, 3, 'Your word is a lamp to my feet and a light to my path.'),
  move('grace_finish', 'Grace Finish', 'Romans 8:37', 'Finisher', 94, 98, 2, 'No, in all these things we are more than conquerors through Him who loved us.'),
  move('hope_anchor', 'Hope Anchor', 'Jeremiah 29:11', 'Stabilises the battle', 0, 100, 2, 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, to give you a future and a hope.'),
  move('peace_rest', 'Peace Rest', 'Psalm 46:10', 'Recover focus', 0, 100, 2, 'Be still and know that I am God; I will be exalted among the nations, I will be exalted over the earth.'),
];

export const ANIMAL_TYPES: Record<AnimalKey, AnimalTypeDef> = {
  lion: {
    name: 'Lion',
    type: 'Royal',
    strong_against: ['camel', 'raven'],
    weak_to: ['dove', 'donkey'],
    neutral: ['fish'],
    moves: [
      move('roar_of_judah', 'Roar of Judah', 'Revelation 5:5', 'Roaring strike', 86, 100, 4, 'Behold, the Lion of the tribe of Judah, the Root of David, has triumphed.'),
      move('den_of_deliverance', 'Den of Deliverance', 'Daniel 6:22', 'Defensive shield', 0, 100, 3, 'My God sent His angel and shut the mouths of the lions. They have not hurt me.'),
      move('prey_tear', 'Prey Tear', 'Psalm 17:12', 'Priority attack', 92, 100, 3, 'Like a lion greedy for prey, like a young lion lurking in ambush.'),
      move('wrath_of_the_king', 'Wrath of the King', 'Proverbs 19:12', 'Finisher', 110, 96, 2, 'A king’s rage is like the roar of a lion, but his favor is like dew on the grass.'),
      move('courage_of_gideon', 'Courage of Gideon', 'Judges 7:20', 'Heavy blow', 98, 95, 2, 'A sword for the LORD and for Gideon!'),
      move('joshua_stand', 'Joshua Stand', 'Joshua 1:9', 'Confidence burst', 88, 100, 3, 'Have I not commanded you to be strong and courageous?'),
      ...sharedMoves,
    ].slice(0, 10),
  },
  donkey: {
    name: 'Donkey',
    type: 'Ground',
    strong_against: ['lion', 'dove'],
    weak_to: ['raven', 'fish'],
    neutral: ['camel'],
    moves: [
      move('balaams_rebuke', 'Balaam’s Rebuke', 'Numbers 22:28', 'Cancel attack', 78, 100, 3, 'Then the LORD opened the donkey’s mouth.'),
      move('angelic_vision', 'Angelic Vision', 'Numbers 22:23', 'Protect', 0, 100, 3, 'The donkey saw the angel of the LORD standing in the road with a drawn sword in his hand.'),
      move('issachars_burden', 'Issachar’s Burden', 'Genesis 49:14', 'Defense boost', 0, 100, 2, 'Issachar is a strong donkey, lying down between the sheepfolds.'),
      move('unbroken_colt', 'Unbroken Colt', 'Mark 11:2', 'Strong opener', 96, 100, 3, 'Go into the village ahead of you, and as soon as you enter it, you will find a colt tied there.'),
      move('stone_of_help', 'Stone of Help', '1 Samuel 7:12', 'Buckle down', 83, 100, 3, 'Thus far the LORD has helped us.'),
      move('well_of_refreshment', 'Well of Refreshment', 'Genesis 29:2', 'Recover', 0, 100, 2, 'He looked and saw a well in the field, and near it lay three flocks of sheep.'),
      ...sharedMoves,
    ].slice(0, 10),
  },
  camel: {
    name: 'Camel',
    type: 'Desert',
    strong_against: ['dove', 'fish'],
    weak_to: ['lion', 'donkey'],
    neutral: ['raven'],
    moves: [
      move('queens_tribute', 'Queen’s Tribute', '1 Kings 10:2', 'Lower attack', 72, 100, 3, 'She arrived in Jerusalem with a very large caravan—with camels bearing spices, gold in great abundance, and precious stones.'),
      move('midianite_swarm', 'Midianite Swarm', 'Judges 7:12', 'Multi-hit', 88, 100, 3, 'Their camels were as countless as the sand on the seashore.'),
      move('desert_ship', 'Desert Ship', 'Isaiah 60:6', 'Weather support', 0, 100, 3, 'Caravans of camels will cover your land, young camels of Midian and Ephah.'),
      move('endurance_trek', 'Endurance Trek', 'Genesis 31:17', 'Survive fatal hit', 0, 100, 2, 'Then Jacob got up and put his children and his wives on camels.'),
      move('oasis_breath', 'Oasis Breath', 'Genesis 24:19', 'Refresh and recover', 0, 100, 2, 'I will also draw water for your camels, until they have had enough to drink.'),
      move('rain_on_desert', 'Rain on Desert', 'Joel 2:23', 'Steady pressure', 80, 100, 2, 'Be glad, O children of Zion, and rejoice in the LORD your God, for He has given you the autumn rains for your vindication.'),
      ...sharedMoves,
    ].slice(0, 10),
  },
  raven: {
    name: 'Raven',
    type: 'Dark',
    strong_against: ['donkey', 'fish'],
    weak_to: ['dove', 'lion'],
    neutral: ['camel'],
    moves: [
      move('eye_pluck', 'Eye Pluck', 'Proverbs 30:17', 'Accuracy drop', 82, 95, 3, 'May the ravens of the valley pluck it out and young vultures devour it.'),
      move('noahs_scout', 'Noah’s Scout', 'Genesis 8:7', 'Two-turn strike', 90, 100, 3, 'And sent out a raven. It kept flying back and forth until the waters had dried up from the earth.'),
      move('plumage_of_night', 'Plumage of Night', 'Song of Solomon 5:11', 'Evasion buff', 0, 100, 2, 'His head is purest gold; his hair is wavy and black as a raven.'),
      move('unclean_dive', 'Unclean Dive', 'Leviticus 11:15', 'Poison hit', 88, 100, 3, 'Any kind of raven.'),
      move('shadow_wing', 'Shadow Wing', 'Psalm 91:1', 'Winged dodge', 0, 100, 2, 'He who dwells in the shelter of the Most High will abide in the shadow of the Almighty.'),
      move('midnight_call', 'Midnight Call', 'Joel 2:31', 'Strike from the dark', 84, 100, 2, 'The sun will be turned to darkness and the moon to blood before the coming of the great and awesome Day of the LORD.'),
      ...sharedMoves,
    ].slice(0, 10),
  },
  dove: {
    name: 'Dove',
    type: 'Spirit',
    strong_against: ['lion', 'raven'],
    weak_to: ['fish', 'camel'],
    neutral: ['donkey'],
    moves: [
      move('olive_branch', 'Olive Branch', 'Genesis 8:11', 'Pause enemy attack', 0, 100, 3, 'And behold, the dove returned to him in the evening with a freshly plucked olive leaf in her beak.'),
      move('jordan_descent', 'Jordan Descent', 'Matthew 3:16', 'Special damage', 92, 100, 3, 'He saw the Spirit of God descending like a dove and resting on Him.'),
      move('innocent_flight', 'Innocent Flight', 'Matthew 10:16', 'Dodge and evade', 0, 100, 2, 'Therefore be as shrewd as snakes and as innocent as doves.'),
      move('purification', 'Purification', 'Leviticus 12:8', 'Clear debuffs', 0, 100, 2, 'But if she cannot afford a lamb, she shall bring two turtledoves or two young pigeons.'),
      move('hushed_wings', 'Hushed Wings', 'Isaiah 30:15', 'Silence enemy', 76, 100, 2, 'Your strength would lie in quiet confidence.'),
      move('peace_song', 'Peace Song', 'Song of Solomon 2:12', 'Calm the field', 0, 100, 2, 'The flowers have appeared in the countryside; the season of singing has come.'),
      ...sharedMoves,
    ].slice(0, 10),
  },
  fish: {
    name: 'Fish',
    type: 'Miracle',
    strong_against: ['dove', 'donkey'],
    weak_to: ['camel', 'raven'],
    neutral: ['lion'],
    moves: [
      move('jonahs_swallow', 'Jonah’s Swallow', 'Jonah 1:17', 'Trap and damage', 90, 100, 3, 'Now the LORD had appointed a great fish to swallow Jonah, and Jonah spent three days and three nights in the belly of the fish.'),
      move('right_side_net', 'Right Side Net', 'John 21:6', 'Never misses', 85, 100, 3, 'Cast the net on the right side of the boat, and you will find some.'),
      move('tiberias_swarm', 'Tiberias Swarm', 'Luke 5:6', 'Multi-hit', 86, 100, 3, 'When they had done so, they caught such a large number of fish that their nets began to tear.'),
      move('depths_of_the_sea', 'Depths of the Sea', 'Micah 7:19', 'Reset stat boosts', 0, 100, 2, 'He will again have compassion on us; He will vanquish our iniquities. You will cast out all our sins into the depths of the sea.'),
      move('great_catch', 'Great Catch', 'Luke 5:4', 'Giant pull', 93, 100, 2, 'Put out into deep water and let down your nets for a catch.'),
      move('stream_of_grace', 'Stream of Grace', 'John 7:38', 'Heal and recover', 0, 100, 2, 'Whoever believes in Me, as the Scripture has said: ‘Streams of living water will flow from within him.’'),
      ...sharedMoves,
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