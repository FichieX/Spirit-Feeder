export type AnimalKey = 'lion' | 'donkey' | 'camel' | 'raven' | 'dove' | 'fish';

export type AnimalMove = {
  key: string;
  name: string;
  verse_ref: string;
  description: string;
  power: number;
  accuracy: number;
};

export type AnimalTypeDef = {
  name: string;
  type: string;
  strong_against: AnimalKey[];
  weak_to: AnimalKey[];
  neutral: AnimalKey[];
  moves: AnimalMove[];
};

export const ANIMAL_TYPES: Record<AnimalKey, AnimalTypeDef> = {
  lion: {
    name: 'Lion',
    type: 'Royal',
    strong_against: ['camel', 'raven'],
    weak_to: ['dove', 'donkey'],
    neutral: ['fish'],
    moves: [
      { key: 'roar_of_judah', name: 'Roar of Judah', verse_ref: 'Revelation 5:5', description: 'Roaring strike', power: 86, accuracy: 100 },
      { key: 'den_of_deliverance', name: 'Den of Deliverance', verse_ref: 'Daniel 6:22', description: 'Defensive shield', power: 0, accuracy: 100 },
      { key: 'prey_tear', name: 'Prey Tear', verse_ref: 'Psalm 17:12', description: 'Priority attack', power: 92, accuracy: 100 },
      { key: 'wrath_of_the_king', name: 'Wrath of the King', verse_ref: 'Proverbs 19:12', description: 'Finisher', power: 110, accuracy: 100 },
    ],
  },
  donkey: {
    name: 'Donkey',
    type: 'Ground',
    strong_against: ['lion', 'dove'],
    weak_to: ['raven', 'fish'],
    neutral: ['camel'],
    moves: [
      { key: 'balaams_rebuke', name: 'Balaam’s Rebuke', verse_ref: 'Numbers 22:28', description: 'Cancel attack', power: 78, accuracy: 100 },
      { key: 'angelic_vision', name: 'Angelic Vision', verse_ref: 'Numbers 22:23', description: 'Protect', power: 0, accuracy: 100 },
      { key: 'issachars_burden', name: 'Issachar’s Burden', verse_ref: 'Genesis 49:14', description: 'Defense boost', power: 0, accuracy: 100 },
      { key: 'unbroken_colt', name: 'Unbroken Colt', verse_ref: 'Mark 11:2', description: 'Strong opener', power: 96, accuracy: 100 },
    ],
  },
  camel: {
    name: 'Camel',
    type: 'Desert',
    strong_against: ['dove', 'fish'],
    weak_to: ['lion', 'donkey'],
    neutral: ['raven'],
    moves: [
      { key: 'queens_tribute', name: 'Queen’s Tribute', verse_ref: '1 Kings 10:2', description: 'Lower attack', power: 72, accuracy: 100 },
      { key: 'midianite_swarm', name: 'Midianite Swarm', verse_ref: 'Judges 7:12', description: 'Multi-hit', power: 88, accuracy: 100 },
      { key: 'desert_ship', name: 'Desert Ship', verse_ref: 'Isaiah 60:6', description: 'Weather support', power: 0, accuracy: 100 },
      { key: 'endurance_trek', name: 'Endurance Trek', verse_ref: 'Genesis 31:17', description: 'Survive fatal hit', power: 0, accuracy: 100 },
    ],
  },
  raven: {
    name: 'Raven',
    type: 'Dark',
    strong_against: ['donkey', 'fish'],
    weak_to: ['dove', 'lion'],
    neutral: ['camel'],
    moves: [
      { key: 'eye_pluck', name: 'Eye Pluck', verse_ref: 'Proverbs 30:17', description: 'Accuracy drop', power: 82, accuracy: 95 },
      { key: 'noahs_scout', name: 'Noah’s Scout', verse_ref: 'Genesis 8:7', description: 'Two-turn strike', power: 90, accuracy: 100 },
      { key: 'plumage_of_night', name: 'Plumage of Night', verse_ref: 'Song of Solomon 5:11', description: 'Evasion buff', power: 0, accuracy: 100 },
      { key: 'unclean_dive', name: 'Unclean Dive', verse_ref: 'Leviticus 11:15', description: 'Poison hit', power: 88, accuracy: 100 },
    ],
  },
  dove: {
    name: 'Dove',
    type: 'Spirit',
    strong_against: ['lion', 'raven'],
    weak_to: ['fish', 'camel'],
    neutral: ['donkey'],
    moves: [
      { key: 'olive_branch', name: 'Olive Branch', verse_ref: 'Genesis 8:11', description: 'Pause enemy attack', power: 0, accuracy: 100 },
      { key: 'jordan_descent', name: 'Jordan Descent', verse_ref: 'Matthew 3:16', description: 'Special damage', power: 92, accuracy: 100 },
      { key: 'innocent_flight', name: 'Innocent Flight', verse_ref: 'Matthew 10:16', description: 'Dodge and evade', power: 0, accuracy: 100 },
      { key: 'purification', name: 'Purification', verse_ref: 'Leviticus 12:8', description: 'Clear debuffs', power: 0, accuracy: 100 },
    ],
  },
  fish: {
    name: 'Fish',
    type: 'Miracle',
    strong_against: ['dove', 'donkey'],
    weak_to: ['camel', 'raven'],
    neutral: ['lion'],
    moves: [
      { key: 'jonahs_swallow', name: 'Jonah’s Swallow', verse_ref: 'Jonah 1:17', description: 'Trap and damage', power: 90, accuracy: 100 },
      { key: 'right_side_net', name: 'Right Side Net', verse_ref: 'John 21:6', description: 'Never misses', power: 85, accuracy: 100 },
      { key: 'tiberias_swarm', name: 'Tiberias Swarm', verse_ref: 'Luke 5:6', description: 'Multi-hit', power: 86, accuracy: 100 },
      { key: 'depths_of_the_sea', name: 'Depths of the Sea', verse_ref: 'Micah 7:19', description: 'Reset stat boosts', power: 0, accuracy: 100 },
    ],
  },
};

export const getAnimalMoves = (key: AnimalKey) => ANIMAL_TYPES[key].moves;

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

export const computeAnimalDamage = (attacker: AnimalKey, defender: AnimalKey, attackPower: number, attackerLevel: number, defenderLevel: number) => {
  const multiplier = isTypeAdvantage(attacker, defender) ? 1.5 : isTypeDisadvantage(attacker, defender) ? 0.7 : 1;
  const base = attackPower + attackerLevel * 3 - defenderLevel * 2;
  const damage = Math.max(0, Math.round(base * multiplier));
  return { damage, multiplier };
};

export const chooseCpuMove = (animal: AnimalKey) => {
  const moves = getAnimalMoves(animal);
  return moves[Math.floor(Math.random() * moves.length)];
};