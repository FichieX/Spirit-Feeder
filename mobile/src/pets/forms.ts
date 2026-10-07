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
export const TEEN_LEVEL = 5;
export const ADULT_LEVEL = 10;
const READ_MS = [600, 600, 400, 600, 600, 180, 180, 800];
const HUNGRY_MS = [500, 450, 450, 450, 400, 160, 160, 600];
const BREAD_MS = [260, 200, 200, 200, 200, 200, 450, 650];
const WATER_MS = [260, 220, 220, 220, 220, 260, 450, 650];
const WINE_MS = [260, 240, 240, 240, 240, 320, 450, 700];

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
};

// Adult animations, from ADULT_LEVEL.
// Donkey: red saddle blanket + bridle. Lion: dark red mane, angry brows, red eyes.
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
export const PET_BY_ANIMAL: Record<number, string> = { 1: 'donkey', 2: 'lion' };

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
