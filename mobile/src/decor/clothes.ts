import { plainSheet } from '../pets/forms';
import { CLOTHES_LAYERS, type ClothesLayer, type ClothesLayerKey } from './clothesLayers';
import type { DecorKey } from './items';

// Which drawn layers make up each Bible piece (the cape has a back part behind the pet)
const PIECES: Partial<Record<DecorKey, ClothesLayerKey[]>> = {
  lily_crown: ['lily_crown'],
  fisher_hat: ['fisher_hat'],
  shepherd_scarf: ['scarf'],
  coat_colors: ['coat'],
  purple_cape: ['cape_back', 'cape_front'],
};
// Drawn in this order over the pet, bottom to top
const FRONT: ClothesLayerKey[] = ['coat', 'cape_front', 'scarf', 'lily_crown', 'fisher_hat'];
const NONE = { back: [] as ClothesLayer[], front: [] as ClothesLayer[] };

// The clothes layers for one animation sheet: `back` goes behind the pet, `front` on top.
// Works for any sheet (necklace or grown-up outfit on or off). Animations without
// clothes art (like falling over) get nothing.
export function clothesLayers(sheet: number, worn?: DecorKey[]) {
  if (!worn?.length) return NONE;
  const all = CLOTHES_LAYERS.get(plainSheet(sheet));
  if (!all) return NONE;
  const keys = new Set(worn.flatMap((k) => PIECES[k] ?? []));
  return {
    back: keys.has('cape_back') && all.cape_back ? [all.cape_back] : [],
    front: FRONT.filter((k) => keys.has(k) && all[k]).map((k) => all[k]!),
  };
}

// Every clothes image a set of animations needs, to load ahead of time (so nothing blinks)
export function clothesSheets(sheets: number[], worn?: DecorKey[]) {
  return sheets.flatMap((s) => {
    const { back, front } = clothesLayers(s, worn);
    return [...back, ...front].map((l) => l.src);
  });
}
