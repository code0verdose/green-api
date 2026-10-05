import { computeBackoff } from './compute-backoff.util';

describe('computeBackoff', () => {
  it('doubles from 1 s and caps at 30 s', () => {
    const noJitter = () => 0.5;
    expect([1, 2, 3, 4, 5, 6, 7, 20].map((attempt) => computeBackoff(attempt, noJitter))).toEqual([
      1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000,
    ]);
  });

  it('spreads retries by ±20 %', () => {
    expect(computeBackoff(1, () => 0)).toBe(800);
    expect(computeBackoff(1, () => 1)).toBe(1200);
  });

  it('treats attempt 0 like the first retry', () => {
    expect(computeBackoff(0, () => 0.5)).toBe(1000);
  });
});
