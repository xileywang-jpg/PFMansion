
export const DIE_FACES = [0, 0, 1, 1, 2, 2];

export interface RollResult {
  total: number;
  results: number[]; // Individual die results
}

/**
 * Rolls N number of Betrayal-style dice (0, 1, 2 pips).
 */
export const rollDice = (numberOfDice: number): RollResult => {
  const results: number[] = [];
  let total = 0;

  for (let i = 0; i < numberOfDice; i++) {
    const roll = DIE_FACES[Math.floor(Math.random() * DIE_FACES.length)];
    results.push(roll);
    total += roll;
  }

  return { total, results };
};
