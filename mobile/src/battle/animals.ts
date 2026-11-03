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
  verseText: string,
): AnimalMove => ({
  key,
  name,
  verse_ref,
  verseText,
  description,
  power,
  accuracy,
  pp,
});

export const ANIMAL_TYPES: Record<AnimalKey, AnimalTypeDef> = {
  lion: {
    name: 'Lion',
    type: 'Royal',
    strong_against: ['camel', 'raven'],
    weak_to: ['dove', 'donkey'],
    neutral: ['fish'],
    moves: [
      move('roar_of_judah', 'Roar of Judah', 'Revelation 5:5', 'Hope in Christ, the victorious Lion of Judah', 88, 100, 3, 'Behold, the Lion of the tribe of Judah, the Root of David, has triumphed.'),
      move('courage_of_gideon', 'Courage and Strength', 'Joshua 1:9', 'Remember God’s presence when afraid', 82, 100, 3, 'Have I not commanded you to be strong and courageous? Do not be afraid; do not be discouraged, for the LORD your God is with you wherever you go.'),
      move('strength_in_christ', 'Strength in Christ', 'Philippians 4:13', 'Find strength through Christ', 84, 100, 3, 'I can do all things through Christ who gives me strength.'),
      move('old_self_crucified', 'A New Life', 'Romans 6:6', 'Remember freedom from sin', 78, 100, 3, 'We know that our old self was crucified with Him so that the body of sin might be rendered powerless.'),
      move('kingdom_authority', 'King of Glory', 'Psalm 24:7', 'Celebrate the glory of God', 76, 100, 3, 'Lift up your heads, O gates! Be lifted up, O ancient doors, that the King of Glory may enter!'),
      move('the_lord_is_my_light', 'The Lord Is My Light', 'Psalm 27:1', 'Courage when facing fear', 80, 100, 3, 'The LORD is my light and my salvation—whom shall I fear?'),
      move('spirit_of_power', 'Spirit of Power', '2 Timothy 1:7', 'Choose love and self-control over fear', 78, 100, 3, 'For God has not given us a spirit of fear, but of power, love, and self-control.'),
      move('be_watchful', 'Be Watchful', '1 Corinthians 16:13', 'Stand firm in faith', 76, 100, 3, 'Be on the alert. Stand firm in the faith. Be men of courage. Be strong.'),
      move('act_justly', 'Act Justly', 'Micah 6:8', 'Practice justice, mercy, and humility', 74, 100, 3, 'Act justly, love mercy, and walk humbly with your God.'),
      move('rock_and_fortress', 'Rock and Fortress', 'Psalm 18:2', 'Remember God as refuge and strength', 72, 100, 3, 'The LORD is my rock, my fortress, and my deliverer.'),
    ],
  },
  donkey: {
    name: 'Donkey',
    type: 'Ground',
    strong_against: ['lion', 'dove'],
    weak_to: ['raven', 'fish'],
    neutral: ['camel'],
    moves: [
      move('humble_load', 'Learn from Jesus', 'Matthew 11:29', 'Practice humility and gentleness', 76, 100, 3, 'Take My yoke upon you and learn from Me, for I am gentle and humble in heart.'),
      move('kindness_remedy', 'Kindness and Forgiveness', 'Ephesians 4:32', 'Choose kindness and forgiveness', 78, 100, 3, 'Be kind and tenderhearted to one another, forgiving each other just as in Christ God forgave you.'),
      move('trust_in_lord', 'Trust in the Lord', 'Proverbs 3:5-6', 'Trust God to guide your path', 80, 100, 3, 'Trust in the LORD with all your heart, and lean not on your own understanding. In all your ways acknowledge Him, and He will make your paths straight.'),
      move('burden_bearer', 'Bear One Another’s Burdens', 'Galatians 6:2', 'Help carry another person’s burdens', 78, 100, 3, 'Carry one another’s burdens, and in this way you will fulfill the law of Christ.'),
      move('steady_heart', 'Renewed Strength', 'Isaiah 40:31', 'Wait on God for renewed strength', 82, 100, 3, 'Those who hope in the LORD will renew their strength. They will soar on wings like eagles.'),
      move('do_not_worry', 'Do Not Worry', 'Matthew 6:34', 'Focus on today rather than tomorrow', 74, 100, 3, 'Therefore do not worry about tomorrow, for tomorrow will worry about itself.'),
      move('look_to_others', 'Look to Others', 'Philippians 2:3-4', 'Value and serve other people', 76, 100, 3, 'In humility, value others above yourselves, not looking to your own interests but each of you to the interests of the others.'),
      move('forgive_one_another', 'Forgive One Another', 'Colossians 3:13', 'Bear with others and forgive', 78, 100, 3, 'Bear with one another and forgive any complaint you may have against someone else. Forgive as the Lord forgave you.'),
      move('commit_your_works', 'Commit Your Works', 'Proverbs 16:3', 'Entrust your plans to God', 72, 100, 3, 'Commit your works to the LORD, and your plans will be achieved.'),
      move('the_lord_is_near', 'The Lord Is Near', 'Psalm 34:18', 'Find hope when brokenhearted', 76, 100, 3, 'The LORD is near to the brokenhearted; He saves the contrite in spirit.'),
    ],
  },
  camel: {
    name: 'Camel',
    type: 'Desert',
    strong_against: ['dove', 'fish'],
    weak_to: ['lion', 'donkey'],
    neutral: ['raven'],
    moves: [
      move('endurance_in_trial', 'Endurance in Trial', 'James 1:12', 'Persevere through testing', 80, 100, 3, 'Blessed is the man who perseveres under trial, because when he has stood the test, he will receive the crown of life.'),
      move('grace_for_the_journey', 'Grace for the Journey', '2 Corinthians 12:9', 'Remember that God’s grace is sufficient', 76, 100, 3, 'My grace is sufficient for you, for My power is perfected in weakness.'),
      move('renewed_strength', 'Renewed Strength', 'Isaiah 40:31', 'Keep going with strength from God', 82, 100, 3, 'Those who hope in the LORD will renew their strength. They will run and not grow weary.'),
      move('perseverance_run', 'Run with Perseverance', 'Hebrews 12:1-2', 'Keep your focus on Jesus', 80, 100, 3, 'Let us run with perseverance the race marked out for us, fixing our eyes on Jesus.'),
      move('rest_in_him', 'The Lord Is My Shepherd', 'Psalm 23:1-2', 'Remember God’s care and rest', 74, 100, 3, 'The LORD is my shepherd; I shall not want. He makes me lie down in green pastures.'),
      move('perseverance', 'Perseverance Produces Hope', 'Romans 5:3-4', 'See how perseverance forms character and hope', 78, 100, 3, 'Suffering produces perseverance; perseverance, character; and character, hope.'),
      move('do_not_grow_weary', 'Do Not Grow Weary', 'Galatians 6:9', 'Continue doing good', 76, 100, 3, 'Let us not grow weary in doing good, for in due time we will reap a harvest if we do not give up.'),
      move('help_from_the_lord', 'Help from the Lord', 'Psalm 121:1-2', 'Remember where help comes from', 74, 100, 3, 'My help comes from the LORD, the Maker of heaven and earth.'),
      move('seek_first', 'Seek First', 'Matthew 6:33', 'Put God’s kingdom first', 78, 100, 3, 'But seek first the kingdom of God and His righteousness, and all these things will be added unto you.'),
      move('cast_your_cares', 'Cast Your Cares', '1 Peter 5:7', 'Give your worries to God', 72, 100, 3, 'Cast all your anxiety on Him, because He cares for you.'),
    ],
  },
  raven: {
    name: 'Raven',
    type: 'Dark',
    strong_against: ['donkey', 'fish'],
    weak_to: ['dove', 'lion'],
    neutral: ['camel'],
    moves: [
      move('watchful_wing', 'Be Alert and Watchful', '1 Peter 5:8', 'Stay alert and clear-minded', 80, 100, 3, 'Be sober-minded and alert. Your adversary the devil prowls around like a roaring lion, seeking someone to devour.'),
      move('hidden_refuge', 'Hidden Refuge', 'Psalm 91:1', 'Find safety in God', 74, 100, 3, 'He who dwells in the shelter of the Most High will abide in the shadow of the Almighty.'),
      move('spiritual_weapons', 'Weapons of Truth', '2 Corinthians 10:4-5', 'Take thoughts captive to obey Christ', 82, 100, 3, 'The weapons of our warfare are not the weapons of the world. Instead, they have divine power to demolish strongholds.'),
      move('awake_and_sober', 'Awake and Sober', '1 Thessalonians 5:6', 'Stay awake and self-controlled', 76, 100, 3, 'So then, let us not sleep as the others do, but let us remain awake and sober.'),
      move('fear_not', 'Fear Not', 'Joshua 1:9', 'Remember God is with you', 78, 100, 3, 'Be strong and courageous. Do not be afraid or discouraged, for the LORD your God is with you wherever you go.'),
      move('guard_your_heart', 'Guard Your Heart', 'Proverbs 4:23', 'Be careful what shapes your life', 78, 100, 3, 'Guard your heart with all diligence, for from it flow springs of life.'),
      move('quick_to_listen', 'Quick to Listen', 'James 1:19', 'Listen before speaking or becoming angry', 74, 100, 3, 'Everyone should be quick to listen, slow to speak, and slow to anger.'),
      move('words_that_build', 'Words That Build', 'Ephesians 4:29', 'Use words that help and encourage', 76, 100, 3, 'Let no unwholesome talk come out of your mouths, but only what is helpful for building up the one in need.'),
      move('when_i_am_afraid', 'When I Am Afraid', 'Psalm 56:3', 'Choose trust when afraid', 76, 100, 3, 'When I am afraid, I will trust in You.'),
      move('gentle_answer', 'A Gentle Answer', 'Proverbs 15:1', 'Respond gently instead of escalating anger', 72, 100, 3, 'A gentle answer turns away wrath, but a harsh word stirs up anger.'),
    ],
  },
  dove: {
    name: 'Dove',
    type: 'Spirit',
    strong_against: ['lion', 'raven'],
    weak_to: ['fish', 'camel'],
    neutral: ['donkey'],
    moves: [
      move('peace_of_christ', 'Peace of Christ', 'John 14:27', 'Receive the peace Jesus gives', 74, 100, 3, 'Peace I leave with you; My peace I give to you. I do not give to you as the world gives.'),
      move('peacemaker', 'Peacemaker', 'Matthew 5:9', 'Choose the way of peace', 74, 100, 3, 'Blessed are the peacemakers, for they will be called sons of God.'),
      move('kindness_bears_all', 'Kindness and Forgiveness', 'Ephesians 4:32', 'Show kindness and forgive', 76, 100, 3, 'Be kind and tenderhearted to one another, forgiving each other just as in Christ God forgave you.'),
      move('live_peaceably', 'Live in Peace', 'Romans 12:18', 'Do what you can to live peaceably', 72, 100, 3, 'If it is possible on your part, live at peace with everyone.'),
      move('pure_heart', 'Pure in Heart', 'Matthew 5:8', 'Value a pure heart', 72, 100, 3, 'Blessed are the pure in heart, for they will see God.'),
      move('let_peace_rule', 'Let Peace Rule', 'Colossians 3:15', 'Choose peace and thankfulness', 74, 100, 3, 'Let the peace of Christ rule in your hearts, for to this you were called as members of one body. And be thankful.'),
      move('overcome_evil', 'Overcome Evil with Good', 'Romans 12:21', 'Answer evil with good', 78, 100, 3, 'Do not be overcome by evil, but overcome evil with good.'),
      move('love_is_patient', 'Love Is Patient', '1 Corinthians 13:4', 'Practice patient and kind love', 74, 100, 3, 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud.'),
      move('prayer_and_peace', 'Prayer and Peace', 'Philippians 4:6-7', 'Bring worries to God in prayer', 78, 100, 3, 'Do not be anxious about anything, but in everything, by prayer and petition, with thanksgiving, present your requests to God.'),
      move('come_to_me', 'Come to Me', 'Matthew 11:28', 'Find rest in Jesus', 72, 100, 3, 'Come to Me, all you who are weary and burdened, and I will give you rest.'),
    ],
  },
  fish: {
    name: 'Fish',
    type: 'Miracle',
    strong_against: ['dove', 'donkey'],
    weak_to: ['camel', 'raven'],
    neutral: ['lion'],
    moves: [
      move('fishers_of_people', 'Fishers of People', 'Matthew 4:19', 'Follow Jesus and share the gospel', 78, 100, 3, 'Follow Me, and I will make you fishers of men.'),
      move('living_water', 'Living Water', 'John 7:38', 'Remember Jesus’ promise of living water', 74, 100, 3, 'Whoever believes in Me, as the Scripture has said, rivers of living water will flow from within him.'),
      move('deep_trust', 'Put Out into Deep Water', 'Luke 5:4-5', 'Trust Jesus enough to follow His direction', 78, 100, 3, 'Put out into deep water and let down your nets for a catch.'),
      move('born_of_god', 'Children of God', 'John 1:12', 'Receive and believe in Christ', 76, 100, 3, 'To all who did receive Him, to those who believed in His name, He gave the right to become children of God.'),
      move('grace_abounds', 'God’s Love in Christ', 'Romans 5:8', 'Remember God’s love shown in Christ', 80, 100, 3, 'God proves His love for us in this: While we were still sinners, Christ died for us.'),
      move('god_loved_the_world', 'God Loved the World', 'John 3:16', 'Remember the heart of the gospel', 82, 100, 3, 'For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.'),
      move('make_disciples', 'Make Disciples', 'Matthew 28:19-20', 'Share and teach Jesus’ commands', 78, 100, 3, 'Go, therefore, and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.'),
      move('confess_and_believe', 'Confess and Believe', 'Romans 10:9', 'Remember the good news of salvation', 80, 100, 3, 'If you confess with your mouth, “Jesus is Lord,” and believe in your heart that God raised Him from the dead, you will be saved.'),
      move('create_a_clean_heart', 'Create a Clean Heart', 'Psalm 51:10', 'Ask God for a renewed heart', 74, 100, 3, 'Create in me a clean heart, O God, and renew a right spirit within me.'),
      move('abide_in_me', 'Abide in Me', 'John 15:5', 'Stay connected to Jesus and bear fruit', 76, 100, 3, 'I am the vine and you are the branches. The one who remains in Me, and I in him, will bear much fruit.'),
    ],
  },
};

export const getAnimalMoves = (key: AnimalKey) => ANIMAL_TYPES[key].moves;

export const ALL_ANIMAL_MOVE_VERSES = Object.entries(ANIMAL_TYPES).flatMap(([key, animal]) => {
  const animalKey = key as AnimalKey;

  return animal.moves.map((moveDef) => ({
    ref: moveDef.verse_ref,
    text: moveDef.verseText ?? moveDef.name,
    animalKey,
    moveKey: moveDef.key,
  }));
});

export const scrambleWords = (text: string): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const copy = [...words];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
};

export const getVerseMatchPercent = (expected: string[], answer: string[]) => {
  if (expected.length === 0) return 0;

  const normalize = (word: string) =>
    word.toLowerCase().replace(/[.,!?;:"“”'’()[\]—-]/g, '');

  const correctWords = expected.reduce(
    (count, word, index) =>
      count + (normalize(word) === normalize(answer[index] ?? '') ? 1 : 0),
    0,
  );

  return correctWords / expected.length;
};

export const isTypeAdvantage = (attacker: AnimalKey, defender: AnimalKey) =>
  ANIMAL_TYPES[attacker].strong_against.includes(defender);

export const isTypeDisadvantage = (attacker: AnimalKey, defender: AnimalKey) =>
  ANIMAL_TYPES[attacker].weak_to.includes(defender);

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

export const computeAnimalDamage = (
  attacker: AnimalKey,
  defender: AnimalKey,
  attackPower: number,
  attackerLevel: number,
  defenderLevel: number,
) => {
  const multiplier = isTypeAdvantage(attacker, defender)
    ? 1.5
    : isTypeDisadvantage(attacker, defender)
      ? 0.7
      : 1;
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

export const getVerseMoveAccuracy = (text: string) =>
  Math.min(100, 72 + (text.length % 12));

export const getVerseMovePP = (text: string) =>
  Math.min(5, 2 + (text.length % 3));