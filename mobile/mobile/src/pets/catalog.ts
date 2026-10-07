// Every pet the player can choose 
export type PetDef = {
  key: string;
  name: string;
  animalId: number; // must match the animal's id in the backend database
  blurb: string;
  frameW: number; // one frame's size in pixel-art pixels
  frameH: number;
  idle: { sheet: number; ms: number[] };
  happy: { sheet: number; ms: number[] };
};

export const PETS: PetDef[] = [
  {
    key: 'donkey',
    name: 'Donkey',
    animalId: 1,
    blurb: 'Stubborn, loyal, and the only animal in the Bible that talks.',
    frameW: 43,
    frameH: 69,
    idle: {
      sheet: require('../../assets/images/donkey_idle.png'),
      ms: [190, 190, 190, 190, 190, 190, 190, 190, 190, 190, 190, 190, 140, 190, 190, 190],
    },
    happy: {
      sheet: require('../../assets/images/donkey_happy.png'),
      ms: [90, 70, 70, 90, 70, 70, 90, 110, 170, 280, 190, 190, 190, 190],
    },
  },
  {
    key: 'lion',
    name: 'Lion',
    animalId: 2,
    blurb: 'Brave, noble, and a symbol of the Lion of Judah.',
    frameW: 56,
    frameH: 58,
    idle: {
      sheet: require('../../assets/images/lion_idle.png'),
      ms: [220, 180, 180, 180, 220, 180, 180, 180],
    },
    // Proud roar when picked
    happy: {
      sheet: require('../../assets/images/lion_happy.png'),
      ms: [160, 140, 180, 110, 110, 110, 110, 260, 200, 300],
    },
  },
];