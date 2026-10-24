// All pet animations in one place, shared by the study room and the battle screen.
// Stages: baby (Lv 1-4) -> teen / young (Lv 5-9) -> adult (Lv 10+)

export const PET_SCALE = 6;

// w / h: only for animations drawn on a bigger canvas than the pet's normal frame
export type Anim = { sheet: number; ms: number[]; w?: number; h?: number };

// Egg (same for every pet). Frames are 51 x 66 pixel-art pixels.
export const EGG = {
  frameW: 51,
  frameH: 66,
  idle: { sheet: require('../../assets/images/egg_idle.png'), ms: [520, 160, 160, 160, 300] },
  hatch: { sheet: require('../../assets/images/egg_hatch.png'), ms: [110, 110, 110, 110, 160, 160, 140] },
};

// Baby animations for each pet.
//   tap    = what it does when you tap it (donkey: love, lion: roar)
//   moods  = random things it does on its own while idle
export type BabyAnims = {
  frameW: number;
  frameH: number;
  idle: Anim;
  tap: Anim;
  hungry: Anim;
  dance?: Anim;
  read: Anim;
  bread: Anim;
  water: Anim;
  wine: Anim;
  moods: ('dance' | 'read')[];
  // Falling-over animation before the "passed away" screen (its frames are wider)
  die?: { frameW: number; frameH: number; anim: Anim };
  scale?: number; // grown-ups are drawn a bit bigger
};

const DIE_MS = [150, 150, 150, 200, 160, 140, 140, 160, 260, 260, 300, 400, 400, 900];

// Levels when the pet grows: baby -> teen (young) -> adult
export const TEEN_LEVEL = 30;
export const ADULT_LEVEL = 60;
const READ_MS = [600, 600, 400, 600, 600, 180, 180, 800];
const HUNGRY_MS = [500, 450, 450, 450, 400, 160, 160, 600];
const BREAD_MS = [260, 200, 200, 200, 200, 200, 450, 650];
const WATER_MS = [260, 220, 220, 220, 220, 260, 450, 650];
const WINE_MS = [260, 240, 240, 240, 240, 320, 450, 700];

// Raven + camel timings (all their animations are drawn with the same frame counts)
const NEW_MS = {
  idle: [240, 200, 200, 200, 240, 120, 200, 200],
  tap: [90, 70, 70, 90, 70, 70, 90, 110, 170, 280],
  hungry: [500, 450, 450, 450, 400, 160, 160, 600],
  read: [600, 600, 400, 600, 600, 180, 180, 800],
  bread: [260, 200, 200, 200, 200, 200, 450, 650],
  water: [260, 220, 220, 220, 220, 260, 450, 650],
  wine: [260, 240, 240, 240, 240, 320, 450, 700],
  dance: [180, 180, 180, 180, 180, 180, 180, 180],
};

export const BABIES: Record<string, BabyAnims> = {
  donkey: {
    frameW: 51,
    frameH: 66,
    idle: { sheet: require('../../assets/images/baby_idle.png'), ms: [700, 500, 700, 500] },
    tap: { sheet: require('../../assets/images/baby_love.png'), ms: [90, 70, 70, 90, 70, 70, 90, 110, 170, 280] },
    hungry: { sheet: require('../../assets/images/baby_hungry.png'), ms: [500, 450, 450, 450, 400, 160, 160, 600] },
    dance: { sheet: require('../../assets/images/baby_dance.png'), ms: [180, 180, 180, 180, 180, 180, 180, 180] },
    read: { sheet: require('../../assets/images/baby_read.png'), ms: [600, 600, 400, 600, 600, 180, 180, 800] },
    bread: { sheet: require('../../assets/images/eat_bread.png'), ms: [260, 200, 200, 200, 200, 200, 450, 650] },
    water: { sheet: require('../../assets/images/eat_water.png'), ms: [260, 220, 220, 220, 220, 260, 450, 650] },
    wine: { sheet: require('../../assets/images/eat_wine.png'), ms: [260, 240, 240, 240, 240, 320, 450, 700] },
    moods: ['dance', 'read'],
    die: { frameW: 51, frameH: 66, anim: { sheet: require('../../assets/images/donkey_baby_die.png'), ms: DIE_MS } },
  },
  lion: {
    frameW: 49,
    frameH: 63,
    idle: { sheet: require('../../assets/images/lion_baby_idle.png'), ms: [260, 220, 220, 220, 260, 220, 220, 220] },
    // Proud little roar when tapped
    tap: {
      sheet: require('../../assets/images/lion_baby_roar.png'),
      ms: [160, 140, 180, 110, 110, 110, 110, 260, 200, 300],
    },
    hungry: {
      sheet: require('../../assets/images/lion_baby_hungry.png'),
      ms: [500, 450, 450, 450, 400, 300, 300, 600],
    },
    read: {
      sheet: require('../../assets/images/lion_baby_read.png'),
      ms: [500, 400, 300, 500, 500, 500, 500, 400, 500, 500, 500, 700],
    },
    bread: { sheet: require('../../assets/images/lion_baby_eat_bread.png'), ms: BREAD_MS },
    water: { sheet: require('../../assets/images/lion_baby_eat_water.png'), ms: WATER_MS },
    wine: { sheet: require('../../assets/images/lion_baby_eat_wine.png'), ms: WINE_MS },
    moods: ['read'],
    die: { frameW: 59, frameH: 63, anim: { sheet: require('../../assets/images/lion_baby_die.png'), ms: DIE_MS } },
  },
  raven: {
    frameW: 48,
    frameH: 63,
    idle: { sheet: require('../../assets/images/raven_baby_idle.png'), ms: NEW_MS.idle },
    tap: { sheet: require('../../assets/images/raven_baby_happy.png'), ms: NEW_MS.tap },
    hungry: { sheet: require('../../assets/images/raven_baby_hungry.png'), ms: NEW_MS.hungry, w: 48, h: 81 },
    dance: { sheet: require('../../assets/images/raven_baby_dance.png'), ms: NEW_MS.dance },
    read: { sheet: require('../../assets/images/raven_baby_read.png'), ms: NEW_MS.read },
    bread: { sheet: require('../../assets/images/raven_baby_eat_bread.png'), ms: NEW_MS.bread },
    water: { sheet: require('../../assets/images/raven_baby_eat_water.png'), ms: NEW_MS.water },
    wine: { sheet: require('../../assets/images/raven_baby_eat_wine.png'), ms: NEW_MS.wine },
    moods: ['dance', 'read'],
    die: { frameW: 72, frameH: 63, anim: { sheet: require('../../assets/images/raven_baby_die.png'), ms: DIE_MS } },
  },
  camel: {
    frameW: 51,
    frameH: 66,
    idle: { sheet: require('../../assets/images/camel_baby_idle.png'), ms: NEW_MS.idle },
    tap: { sheet: require('../../assets/images/camel_baby_happy.png'), ms: NEW_MS.tap },
    hungry: { sheet: require('../../assets/images/camel_baby_hungry.png'), ms: NEW_MS.hungry, w: 51, h: 84 },
    dance: { sheet: require('../../assets/images/camel_baby_dance.png'), ms: NEW_MS.dance },
    read: { sheet: require('../../assets/images/camel_baby_read.png'), ms: NEW_MS.read },
    bread: { sheet: require('../../assets/images/camel_baby_eat_bread.png'), ms: NEW_MS.bread },
    water: { sheet: require('../../assets/images/camel_baby_eat_water.png'), ms: NEW_MS.water },
    wine: { sheet: require('../../assets/images/camel_baby_eat_wine.png'), ms: NEW_MS.wine },
    moods: ['dance', 'read'],
    die: { frameW: 75, frameH: 66, anim: { sheet: require('../../assets/images/camel_baby_die.png'), ms: DIE_MS } },
  },
};

// Teen (young) animations, from TEEN_LEVEL. Same names as the babies.
const DONKEY_IDLE: Anim = {
  sheet: require('../../assets/images/donkey_idle.png'),
  ms: [190, 190, 190, 190, 190, 190, 190, 190, 190, 190, 190, 190, 140, 190, 190, 190],
};
const DONKEY_HAPPY: Anim = {
  sheet: require('../../assets/images/donkey_happy.png'),
  ms: [90, 70, 70, 90, 70, 70, 90, 110, 170, 280, 190, 190, 190, 190],
};

export const TEENS: Record<string, BabyAnims> = {
  donkey: {
    frameW: 43,
    frameH: 69,
    idle: DONKEY_IDLE,
    tap: DONKEY_HAPPY,
    hungry: { sheet: require('../../assets/images/donkey_hungry.png'), ms: HUNGRY_MS, w: 43, h: 87 },
    read: { sheet: require('../../assets/images/donkey_read.png'), ms: READ_MS },
    bread: { sheet: require('../../assets/images/donkey_eat_bread.png'), ms: BREAD_MS },
    water: { sheet: require('../../assets/images/donkey_eat_water.png'), ms: WATER_MS },
    wine: { sheet: require('../../assets/images/donkey_eat_wine.png'), ms: WINE_MS },
    moods: ['read'],
    die: { frameW: 52, frameH: 69, anim: { sheet: require('../../assets/images/donkey_die.png'), ms: DIE_MS } },
  },
  lion: {
    frameW: 56,
    frameH: 70,
    idle: { sheet: require('../../assets/images/lion_idle.png'), ms: [220, 180, 180, 180, 220, 180, 180, 180] },
    // Proud roar when tapped
    tap: {
      sheet: require('../../assets/images/lion_happy.png'),
      ms: [160, 140, 180, 110, 110, 110, 110, 260, 200, 300],
    },
    hungry: {
      sheet: require('../../assets/images/lion_hungry.png'),
      ms: [500, 450, 450, 450, 400, 300, 300, 600],
    },
    read: {
      sheet: require('../../assets/images/lion_read.png'),
      ms: [500, 400, 300, 500, 500, 500, 500, 400, 500, 500, 500, 700],
    },
    bread: { sheet: require('../../assets/images/lion_eat_bread.png'), ms: BREAD_MS },
    water: { sheet: require('../../assets/images/lion_eat_water.png'), ms: WATER_MS },
    wine: { sheet: require('../../assets/images/lion_eat_wine.png'), ms: WINE_MS },
    moods: ['read'],
    die: { frameW: 80, frameH: 70, anim: { sheet: require('../../assets/images/lion_die.png'), ms: DIE_MS } },
  },
  raven: {
    frameW: 48,
    frameH: 69,
    idle: { sheet: require('../../assets/images/raven_idle.png'), ms: NEW_MS.idle },
    tap: { sheet: require('../../assets/images/raven_happy.png'), ms: NEW_MS.tap },
    hungry: { sheet: require('../../assets/images/raven_hungry.png'), ms: NEW_MS.hungry, w: 48, h: 87 },
    read: { sheet: require('../../assets/images/raven_read.png'), ms: NEW_MS.read },
    bread: { sheet: require('../../assets/images/raven_eat_bread.png'), ms: NEW_MS.bread },
    water: { sheet: require('../../assets/images/raven_eat_water.png'), ms: NEW_MS.water },
    wine: { sheet: require('../../assets/images/raven_eat_wine.png'), ms: NEW_MS.wine },
    moods: ['read'],
    die: { frameW: 72, frameH: 69, anim: { sheet: require('../../assets/images/raven_die.png'), ms: DIE_MS } },
  },
  camel: {
    frameW: 52,
    frameH: 72,
    idle: { sheet: require('../../assets/images/camel_idle.png'), ms: NEW_MS.idle },
    tap: { sheet: require('../../assets/images/camel_happy.png'), ms: NEW_MS.tap },
    hungry: { sheet: require('../../assets/images/camel_hungry.png'), ms: NEW_MS.hungry, w: 52, h: 90 },
    read: { sheet: require('../../assets/images/camel_read.png'), ms: NEW_MS.read },
    bread: { sheet: require('../../assets/images/camel_eat_bread.png'), ms: NEW_MS.bread },
    water: { sheet: require('../../assets/images/camel_eat_water.png'), ms: NEW_MS.water },
    wine: { sheet: require('../../assets/images/camel_eat_wine.png'), ms: NEW_MS.wine },
    moods: ['read'],
    die: { frameW: 76, frameH: 72, anim: { sheet: require('../../assets/images/camel_die.png'), ms: DIE_MS } },
  },
};

// Adult animations, from ADULT_LEVEL.
// Donkey: red saddle blanket + bridle. Lion: dark red mane, angry brows, red eyes, cross.
// Raven: bread pouch. Camel: wise-men robe. (These grown-up outfits can be taken off: see OUTFIT_PAIRS.)
const DONKEY_ADULT_HAPPY: Anim = {
  sheet: require('../../assets/images/donkey_adult_happy.png'),
  ms: [90, 70, 70, 90, 70, 70, 90, 110, 170, 280, 190, 190, 190, 190],
};

export const ADULTS: Record<string, BabyAnims> = {
  donkey: {
    frameW: 43,
    frameH: 69,
    scale: 7,
    idle: {
      sheet: require('../../assets/images/donkey_adult_idle.png'),
      ms: [190, 190, 190, 190, 190, 190, 190, 190, 190, 190, 190, 190, 140, 190, 190, 190],
    },
    tap: DONKEY_ADULT_HAPPY,
    hungry: { sheet: require('../../assets/images/donkey_adult_hungry.png'), ms: HUNGRY_MS, w: 43, h: 87 },
    read: { sheet: require('../../assets/images/donkey_adult_read.png'), ms: READ_MS },
    bread: { sheet: require('../../assets/images/donkey_adult_eat_bread.png'), ms: BREAD_MS },
    water: { sheet: require('../../assets/images/donkey_adult_eat_water.png'), ms: WATER_MS },
    wine: { sheet: require('../../assets/images/donkey_adult_eat_wine.png'), ms: WINE_MS },
    moods: ['read'],
    die: { frameW: 52, frameH: 69, anim: { sheet: require('../../assets/images/donkey_adult_die.png'), ms: DIE_MS } },
  },
  lion: {
    frameW: 56,
    frameH: 70,
    scale: 7,
    idle: { sheet: require('../../assets/images/lion_adult_idle.png'), ms: [220, 180, 180, 180, 220, 180, 180, 180] },
    // Fierce roar when tapped
    tap: {
      sheet: require('../../assets/images/lion_adult_happy.png'),
      ms: [160, 140, 180, 110, 110, 110, 110, 260, 200, 300],
    },
    hungry: {
      sheet: require('../../assets/images/lion_adult_hungry.png'),
      ms: [500, 450, 450, 450, 400, 300, 300, 600],
    },
    read: {
      sheet: require('../../assets/images/lion_adult_read.png'),
      ms: [500, 400, 300, 500, 500, 500, 500, 400, 500, 500, 500, 700],
    },
    bread: { sheet: require('../../assets/images/lion_adult_eat_bread.png'), ms: BREAD_MS },
    water: { sheet: require('../../assets/images/lion_adult_eat_water.png'), ms: WATER_MS },
    wine: { sheet: require('../../assets/images/lion_adult_eat_wine.png'), ms: WINE_MS },
    moods: ['read'],
    die: { frameW: 80, frameH: 70, anim: { sheet: require('../../assets/images/lion_adult_die.png'), ms: DIE_MS } },
  },
  raven: {
    frameW: 52,
    frameH: 72,
    scale: 7,
    idle: { sheet: require('../../assets/images/raven_adult_idle.png'), ms: NEW_MS.idle },
    tap: { sheet: require('../../assets/images/raven_adult_happy.png'), ms: NEW_MS.tap },
    hungry: { sheet: require('../../assets/images/raven_adult_hungry.png'), ms: NEW_MS.hungry, w: 52, h: 90 },
    read: { sheet: require('../../assets/images/raven_adult_read.png'), ms: NEW_MS.read },
    bread: { sheet: require('../../assets/images/raven_adult_eat_bread.png'), ms: NEW_MS.bread },
    water: { sheet: require('../../assets/images/raven_adult_eat_water.png'), ms: NEW_MS.water },
    wine: { sheet: require('../../assets/images/raven_adult_eat_wine.png'), ms: NEW_MS.wine },
    moods: ['read'],
    die: { frameW: 76, frameH: 72, anim: { sheet: require('../../assets/images/raven_adult_die.png'), ms: DIE_MS } },
  },
  camel: {
    frameW: 56,
    frameH: 76,
    scale: 6,
    idle: { sheet: require('../../assets/images/camel_adult_idle.png'), ms: NEW_MS.idle },
    tap: { sheet: require('../../assets/images/camel_adult_happy.png'), ms: NEW_MS.tap },
    hungry: { sheet: require('../../assets/images/camel_adult_hungry.png'), ms: NEW_MS.hungry, w: 56, h: 94 },
    read: { sheet: require('../../assets/images/camel_adult_read.png'), ms: NEW_MS.read },
    bread: { sheet: require('../../assets/images/camel_adult_eat_bread.png'), ms: NEW_MS.bread },
    water: { sheet: require('../../assets/images/camel_adult_eat_water.png'), ms: NEW_MS.water },
    wine: { sheet: require('../../assets/images/camel_adult_eat_wine.png'), ms: NEW_MS.wine },
    moods: ['read'],
    die: { frameW: 80, frameH: 76, anim: { sheet: require('../../assets/images/camel_adult_die.png'), ms: DIE_MS } },
  },
};

// Every sheet the study can show, loaded ahead of time so nothing blinks
export const ALL_SHEETS = [
  EGG.idle.sheet,
  EGG.hatch.sheet,
  ...[...Object.values(BABIES), ...Object.values(TEENS), ...Object.values(ADULTS)].flatMap((b) =>
    [b.idle, b.tap, b.hungry, b.dance, b.read, b.bread, b.water, b.wine, b.die?.anim]
      .filter((a): a is Anim => !!a)
      .map((a) => a.sheet),
  ),
];

// animal_id from the server -> which baby
export const PET_BY_ANIMAL: Record<number, string> = { 1: 'donkey', 2: 'lion', 3: 'raven', 4: 'camel' };

export type Form = 'baby' | 'teen' | 'adult';

export function formFor(level: number): Form {
  if (level >= ADULT_LEVEL) return 'adult';
  if (level >= TEEN_LEVEL) return 'teen';
  return 'baby';
}

export function animsFor(petKey: string, level: number): BabyAnims {
  const f = formFor(level);
  const set = f === 'adult' ? ADULTS : f === 'teen' ? TEENS : BABIES;
  return set[petKey] ?? set.donkey;
}

// The same animations with the cross necklace drawn on, used when the pet wears it.
// (The adult lion's normal sheets already have his cross; his plain sheets map to them.)
const NECKLACE_PAIRS: [number, number][] = [
  [require('../../assets/images/baby_idle.png'), require('../../assets/images/baby_idle_cross.png')],
  [require('../../assets/images/baby_love.png'), require('../../assets/images/baby_love_cross.png')],
  [require('../../assets/images/baby_hungry.png'), require('../../assets/images/baby_hungry_cross.png')],
  [require('../../assets/images/baby_dance.png'), require('../../assets/images/baby_dance_cross.png')],
  [require('../../assets/images/baby_read.png'), require('../../assets/images/baby_read_cross.png')],
  [require('../../assets/images/eat_bread.png'), require('../../assets/images/eat_bread_cross.png')],
  [require('../../assets/images/eat_water.png'), require('../../assets/images/eat_water_cross.png')],
  [require('../../assets/images/eat_wine.png'), require('../../assets/images/eat_wine_cross.png')],
  [require('../../assets/images/donkey_baby_die.png'), require('../../assets/images/donkey_baby_die_cross.png')],
  [require('../../assets/images/lion_baby_idle.png'), require('../../assets/images/lion_baby_idle_cross.png')],
  [require('../../assets/images/lion_baby_roar.png'), require('../../assets/images/lion_baby_roar_cross.png')],
  [require('../../assets/images/lion_baby_hungry.png'), require('../../assets/images/lion_baby_hungry_cross.png')],
  [require('../../assets/images/lion_baby_read.png'), require('../../assets/images/lion_baby_read_cross.png')],
  [require('../../assets/images/lion_baby_eat_bread.png'), require('../../assets/images/lion_baby_eat_bread_cross.png')],
  [require('../../assets/images/lion_baby_eat_water.png'), require('../../assets/images/lion_baby_eat_water_cross.png')],
  [require('../../assets/images/lion_baby_eat_wine.png'), require('../../assets/images/lion_baby_eat_wine_cross.png')],
  [require('../../assets/images/lion_baby_die.png'), require('../../assets/images/lion_baby_die_cross.png')],
  [require('../../assets/images/donkey_idle.png'), require('../../assets/images/donkey_idle_cross.png')],
  [require('../../assets/images/donkey_happy.png'), require('../../assets/images/donkey_happy_cross.png')],
  [require('../../assets/images/donkey_hungry.png'), require('../../assets/images/donkey_hungry_cross.png')],
  [require('../../assets/images/donkey_read.png'), require('../../assets/images/donkey_read_cross.png')],
  [require('../../assets/images/donkey_eat_bread.png'), require('../../assets/images/donkey_eat_bread_cross.png')],
  [require('../../assets/images/donkey_eat_water.png'), require('../../assets/images/donkey_eat_water_cross.png')],
  [require('../../assets/images/donkey_eat_wine.png'), require('../../assets/images/donkey_eat_wine_cross.png')],
  [require('../../assets/images/donkey_die.png'), require('../../assets/images/donkey_die_cross.png')],
  [require('../../assets/images/donkey_adult_idle.png'), require('../../assets/images/donkey_adult_idle_cross.png')],
  [require('../../assets/images/donkey_adult_happy.png'), require('../../assets/images/donkey_adult_happy_cross.png')],
  [require('../../assets/images/donkey_adult_hungry.png'), require('../../assets/images/donkey_adult_hungry_cross.png')],
  [require('../../assets/images/donkey_adult_read.png'), require('../../assets/images/donkey_adult_read_cross.png')],
  [require('../../assets/images/donkey_adult_eat_bread.png'), require('../../assets/images/donkey_adult_eat_bread_cross.png')],
  [require('../../assets/images/donkey_adult_eat_water.png'), require('../../assets/images/donkey_adult_eat_water_cross.png')],
  [require('../../assets/images/donkey_adult_eat_wine.png'), require('../../assets/images/donkey_adult_eat_wine_cross.png')],
  [require('../../assets/images/donkey_adult_die.png'), require('../../assets/images/donkey_adult_die_cross.png')],
  [require('../../assets/images/lion_idle.png'), require('../../assets/images/lion_idle_cross.png')],
  [require('../../assets/images/lion_happy.png'), require('../../assets/images/lion_happy_cross.png')],
  [require('../../assets/images/lion_hungry.png'), require('../../assets/images/lion_hungry_cross.png')],
  [require('../../assets/images/lion_read.png'), require('../../assets/images/lion_read_cross.png')],
  [require('../../assets/images/lion_eat_bread.png'), require('../../assets/images/lion_eat_bread_cross.png')],
  [require('../../assets/images/lion_eat_water.png'), require('../../assets/images/lion_eat_water_cross.png')],
  [require('../../assets/images/lion_eat_wine.png'), require('../../assets/images/lion_eat_wine_cross.png')],
  [require('../../assets/images/lion_die.png'), require('../../assets/images/lion_die_cross.png')],
  [require('../../assets/images/raven_baby_idle.png'), require('../../assets/images/raven_baby_idle_cross.png')],
  [require('../../assets/images/raven_baby_happy.png'), require('../../assets/images/raven_baby_happy_cross.png')],
  [require('../../assets/images/raven_baby_hungry.png'), require('../../assets/images/raven_baby_hungry_cross.png')],
  [require('../../assets/images/raven_baby_read.png'), require('../../assets/images/raven_baby_read_cross.png')],
  [require('../../assets/images/raven_baby_eat_bread.png'), require('../../assets/images/raven_baby_eat_bread_cross.png')],
  [require('../../assets/images/raven_baby_eat_water.png'), require('../../assets/images/raven_baby_eat_water_cross.png')],
  [require('../../assets/images/raven_baby_eat_wine.png'), require('../../assets/images/raven_baby_eat_wine_cross.png')],
  [require('../../assets/images/raven_baby_die.png'), require('../../assets/images/raven_baby_die_cross.png')],
  [require('../../assets/images/raven_baby_dance.png'), require('../../assets/images/raven_baby_dance_cross.png')],
  [require('../../assets/images/raven_idle.png'), require('../../assets/images/raven_idle_cross.png')],
  [require('../../assets/images/raven_happy.png'), require('../../assets/images/raven_happy_cross.png')],
  [require('../../assets/images/raven_hungry.png'), require('../../assets/images/raven_hungry_cross.png')],
  [require('../../assets/images/raven_read.png'), require('../../assets/images/raven_read_cross.png')],
  [require('../../assets/images/raven_eat_bread.png'), require('../../assets/images/raven_eat_bread_cross.png')],
  [require('../../assets/images/raven_eat_water.png'), require('../../assets/images/raven_eat_water_cross.png')],
  [require('../../assets/images/raven_eat_wine.png'), require('../../assets/images/raven_eat_wine_cross.png')],
  [require('../../assets/images/raven_die.png'), require('../../assets/images/raven_die_cross.png')],
  [require('../../assets/images/raven_adult_idle.png'), require('../../assets/images/raven_adult_idle_cross.png')],
  [require('../../assets/images/raven_adult_idle_plain.png'), require('../../assets/images/raven_adult_idle_plain_cross.png')],
  [require('../../assets/images/raven_adult_happy.png'), require('../../assets/images/raven_adult_happy_cross.png')],
  [require('../../assets/images/raven_adult_happy_plain.png'), require('../../assets/images/raven_adult_happy_plain_cross.png')],
  [require('../../assets/images/raven_adult_hungry.png'), require('../../assets/images/raven_adult_hungry_cross.png')],
  [require('../../assets/images/raven_adult_hungry_plain.png'), require('../../assets/images/raven_adult_hungry_plain_cross.png')],
  [require('../../assets/images/raven_adult_read.png'), require('../../assets/images/raven_adult_read_cross.png')],
  [require('../../assets/images/raven_adult_read_plain.png'), require('../../assets/images/raven_adult_read_plain_cross.png')],
  [require('../../assets/images/raven_adult_eat_bread.png'), require('../../assets/images/raven_adult_eat_bread_cross.png')],
  [require('../../assets/images/raven_adult_eat_bread_plain.png'), require('../../assets/images/raven_adult_eat_bread_plain_cross.png')],
  [require('../../assets/images/raven_adult_eat_water.png'), require('../../assets/images/raven_adult_eat_water_cross.png')],
  [require('../../assets/images/raven_adult_eat_water_plain.png'), require('../../assets/images/raven_adult_eat_water_plain_cross.png')],
  [require('../../assets/images/raven_adult_eat_wine.png'), require('../../assets/images/raven_adult_eat_wine_cross.png')],
  [require('../../assets/images/raven_adult_eat_wine_plain.png'), require('../../assets/images/raven_adult_eat_wine_plain_cross.png')],
  [require('../../assets/images/raven_adult_die.png'), require('../../assets/images/raven_adult_die_cross.png')],
  [require('../../assets/images/raven_adult_die_plain.png'), require('../../assets/images/raven_adult_die_plain_cross.png')],
  [require('../../assets/images/camel_baby_idle.png'), require('../../assets/images/camel_baby_idle_cross.png')],
  [require('../../assets/images/camel_baby_happy.png'), require('../../assets/images/camel_baby_happy_cross.png')],
  [require('../../assets/images/camel_baby_hungry.png'), require('../../assets/images/camel_baby_hungry_cross.png')],
  [require('../../assets/images/camel_baby_read.png'), require('../../assets/images/camel_baby_read_cross.png')],
  [require('../../assets/images/camel_baby_eat_bread.png'), require('../../assets/images/camel_baby_eat_bread_cross.png')],
  [require('../../assets/images/camel_baby_eat_water.png'), require('../../assets/images/camel_baby_eat_water_cross.png')],
  [require('../../assets/images/camel_baby_eat_wine.png'), require('../../assets/images/camel_baby_eat_wine_cross.png')],
  [require('../../assets/images/camel_baby_die.png'), require('../../assets/images/camel_baby_die_cross.png')],
  [require('../../assets/images/camel_baby_dance.png'), require('../../assets/images/camel_baby_dance_cross.png')],
  [require('../../assets/images/camel_idle.png'), require('../../assets/images/camel_idle_cross.png')],
  [require('../../assets/images/camel_happy.png'), require('../../assets/images/camel_happy_cross.png')],
  [require('../../assets/images/camel_hungry.png'), require('../../assets/images/camel_hungry_cross.png')],
  [require('../../assets/images/camel_read.png'), require('../../assets/images/camel_read_cross.png')],
  [require('../../assets/images/camel_eat_bread.png'), require('../../assets/images/camel_eat_bread_cross.png')],
  [require('../../assets/images/camel_eat_water.png'), require('../../assets/images/camel_eat_water_cross.png')],
  [require('../../assets/images/camel_eat_wine.png'), require('../../assets/images/camel_eat_wine_cross.png')],
  [require('../../assets/images/camel_die.png'), require('../../assets/images/camel_die_cross.png')],
  [require('../../assets/images/camel_adult_idle.png'), require('../../assets/images/camel_adult_idle_cross.png')],
  [require('../../assets/images/camel_adult_idle_plain.png'), require('../../assets/images/camel_adult_idle_plain_cross.png')],
  [require('../../assets/images/camel_adult_happy.png'), require('../../assets/images/camel_adult_happy_cross.png')],
  [require('../../assets/images/camel_adult_happy_plain.png'), require('../../assets/images/camel_adult_happy_plain_cross.png')],
  [require('../../assets/images/camel_adult_hungry.png'), require('../../assets/images/camel_adult_hungry_cross.png')],
  [require('../../assets/images/camel_adult_hungry_plain.png'), require('../../assets/images/camel_adult_hungry_plain_cross.png')],
  [require('../../assets/images/camel_adult_read.png'), require('../../assets/images/camel_adult_read_cross.png')],
  [require('../../assets/images/camel_adult_read_plain.png'), require('../../assets/images/camel_adult_read_plain_cross.png')],
  [require('../../assets/images/camel_adult_eat_bread.png'), require('../../assets/images/camel_adult_eat_bread_cross.png')],
  [require('../../assets/images/camel_adult_eat_bread_plain.png'), require('../../assets/images/camel_adult_eat_bread_plain_cross.png')],
  [require('../../assets/images/camel_adult_eat_water.png'), require('../../assets/images/camel_adult_eat_water_cross.png')],
  [require('../../assets/images/camel_adult_eat_water_plain.png'), require('../../assets/images/camel_adult_eat_water_plain_cross.png')],
  [require('../../assets/images/camel_adult_eat_wine.png'), require('../../assets/images/camel_adult_eat_wine_cross.png')],
  [require('../../assets/images/camel_adult_eat_wine_plain.png'), require('../../assets/images/camel_adult_eat_wine_plain_cross.png')],
  [require('../../assets/images/camel_adult_die.png'), require('../../assets/images/camel_adult_die_cross.png')],
  [require('../../assets/images/camel_adult_die_plain.png'), require('../../assets/images/camel_adult_die_plain_cross.png')],
  [require('../../assets/images/lion_adult_idle_plain.png'), require('../../assets/images/lion_adult_idle.png')],
  [require('../../assets/images/lion_adult_happy_plain.png'), require('../../assets/images/lion_adult_happy.png')],
  [require('../../assets/images/lion_adult_hungry_plain.png'), require('../../assets/images/lion_adult_hungry.png')],
  [require('../../assets/images/lion_adult_read_plain.png'), require('../../assets/images/lion_adult_read.png')],
  [require('../../assets/images/lion_adult_eat_bread_plain.png'), require('../../assets/images/lion_adult_eat_bread.png')],
  [require('../../assets/images/lion_adult_eat_water_plain.png'), require('../../assets/images/lion_adult_eat_water.png')],
  [require('../../assets/images/lion_adult_eat_wine_plain.png'), require('../../assets/images/lion_adult_eat_wine.png')],
  [require('../../assets/images/lion_adult_die_plain.png'), require('../../assets/images/lion_adult_die.png')],
];
const NECKLACE_SHEETS = new Map<number, number>(NECKLACE_PAIRS);

// Swap a sheet for its necklace version when the necklace is on
export const withNecklace = (sheet: number, on: boolean) => (on ? (NECKLACE_SHEETS.get(sheet) ?? sheet) : sheet);

// Grown-up outfits (donkey saddle blanket, lion cross, raven bread pouch, camel robe).
// The ADULTS sheets are drawn wearing it; taking it off swaps to these plain sheets.
// (The plain adult donkey is the young donkey's art, drawn bigger.)
const OUTFIT_PAIRS: [number, number][] = [
  [require('../../assets/images/donkey_adult_idle.png'), require('../../assets/images/donkey_idle.png')],
  [require('../../assets/images/donkey_adult_happy.png'), require('../../assets/images/donkey_happy.png')],
  [require('../../assets/images/donkey_adult_hungry.png'), require('../../assets/images/donkey_hungry.png')],
  [require('../../assets/images/donkey_adult_read.png'), require('../../assets/images/donkey_read.png')],
  [require('../../assets/images/donkey_adult_eat_bread.png'), require('../../assets/images/donkey_eat_bread.png')],
  [require('../../assets/images/donkey_adult_eat_water.png'), require('../../assets/images/donkey_eat_water.png')],
  [require('../../assets/images/donkey_adult_eat_wine.png'), require('../../assets/images/donkey_eat_wine.png')],
  [require('../../assets/images/donkey_adult_die.png'), require('../../assets/images/donkey_die.png')],
  [require('../../assets/images/lion_adult_idle.png'), require('../../assets/images/lion_adult_idle_plain.png')],
  [require('../../assets/images/lion_adult_happy.png'), require('../../assets/images/lion_adult_happy_plain.png')],
  [require('../../assets/images/lion_adult_hungry.png'), require('../../assets/images/lion_adult_hungry_plain.png')],
  [require('../../assets/images/lion_adult_read.png'), require('../../assets/images/lion_adult_read_plain.png')],
  [require('../../assets/images/lion_adult_eat_bread.png'), require('../../assets/images/lion_adult_eat_bread_plain.png')],
  [require('../../assets/images/lion_adult_eat_water.png'), require('../../assets/images/lion_adult_eat_water_plain.png')],
  [require('../../assets/images/lion_adult_eat_wine.png'), require('../../assets/images/lion_adult_eat_wine_plain.png')],
  [require('../../assets/images/lion_adult_die.png'), require('../../assets/images/lion_adult_die_plain.png')],
  [require('../../assets/images/raven_adult_idle.png'), require('../../assets/images/raven_adult_idle_plain.png')],
  [require('../../assets/images/raven_adult_happy.png'), require('../../assets/images/raven_adult_happy_plain.png')],
  [require('../../assets/images/raven_adult_hungry.png'), require('../../assets/images/raven_adult_hungry_plain.png')],
  [require('../../assets/images/raven_adult_read.png'), require('../../assets/images/raven_adult_read_plain.png')],
  [require('../../assets/images/raven_adult_eat_bread.png'), require('../../assets/images/raven_adult_eat_bread_plain.png')],
  [require('../../assets/images/raven_adult_eat_water.png'), require('../../assets/images/raven_adult_eat_water_plain.png')],
  [require('../../assets/images/raven_adult_eat_wine.png'), require('../../assets/images/raven_adult_eat_wine_plain.png')],
  [require('../../assets/images/raven_adult_die.png'), require('../../assets/images/raven_adult_die_plain.png')],
  [require('../../assets/images/camel_adult_idle.png'), require('../../assets/images/camel_adult_idle_plain.png')],
  [require('../../assets/images/camel_adult_happy.png'), require('../../assets/images/camel_adult_happy_plain.png')],
  [require('../../assets/images/camel_adult_hungry.png'), require('../../assets/images/camel_adult_hungry_plain.png')],
  [require('../../assets/images/camel_adult_read.png'), require('../../assets/images/camel_adult_read_plain.png')],
  [require('../../assets/images/camel_adult_eat_bread.png'), require('../../assets/images/camel_adult_eat_bread_plain.png')],
  [require('../../assets/images/camel_adult_eat_water.png'), require('../../assets/images/camel_adult_eat_water_plain.png')],
  [require('../../assets/images/camel_adult_eat_wine.png'), require('../../assets/images/camel_adult_eat_wine_plain.png')],
  [require('../../assets/images/camel_adult_die.png'), require('../../assets/images/camel_adult_die_plain.png')],
];
const OUTFIT_OFF = new Map<number, number>(OUTFIT_PAIRS);

// The sheet to show: grown-up outfit on or off, then the necklace on or off
export function dressed(sheet: number, outfitOn: boolean, necklaceOn: boolean) {
  const s = outfitOn ? sheet : (OUTFIT_OFF.get(sheet) ?? sheet);
  return withNecklace(s, necklaceOn);
}
