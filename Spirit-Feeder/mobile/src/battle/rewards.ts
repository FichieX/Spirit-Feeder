import { randomPower, type PowerKey } from './powerups';
import { randomNewDecor, type DecorKey } from '../decor/items';

// What a victory gives you.
export type Reward = { kind: 'power'; power: PowerKey } | { kind: 'decor'; item: DecorKey } | { kind: 'none' };

// Chances change with the serpent's level:
//   Lv 5:   always a power-up
//   Lv 25+: 50% power-up, 30% decoration, 20% nothing
//   in between it slides smoothly from one to the other
export function rewardOdds(milestone: number) {
  const t = Math.max(0, Math.min(1, (milestone - 5) / 20));
  return { power: 1 - 0.5 * t, decor: 0.3 * t, none: 0.2 * t };
}

export function rollReward(petKey: string, milestone: number, ownedDecor: DecorKey[]): Reward {
  const odds = rewardOdds(milestone);
  const roll = Math.random();
  if (roll < odds.decor) {
    const item = randomNewDecor(ownedDecor);
    // Already have every decoration: give a power-up instead
    return item ? { kind: 'decor', item } : { kind: 'power', power: randomPower(petKey) };
  }
  if (roll < odds.decor + odds.none) return { kind: 'none' };
  return { kind: 'power', power: randomPower(petKey) };
}
