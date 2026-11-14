import { describe, expect, it } from 'vitest';
import { nextRating } from './rating-logic';

describe('nextRating', () => {
  it('moves up with the right and up arrows and stops at five', () => {
    expect(nextRating(3, 'ArrowRight')).toBe(4);
    expect(nextRating(3, 'ArrowUp')).toBe(4);
    expect(nextRating(5, 'ArrowRight')).toBe(5);
  });

  it('moves down with the left and down arrows and stops at one', () => {
    expect(nextRating(3, 'ArrowLeft')).toBe(2);
    expect(nextRating(3, 'ArrowDown')).toBe(2);
    expect(nextRating(1, 'ArrowLeft')).toBe(1);
  });

  it('starts from one when nothing is chosen yet', () => {
    expect(nextRating(0, 'ArrowRight')).toBe(1);
    expect(nextRating(0, 'ArrowLeft')).toBe(1);
  });

  it('jumps with Home and End and ignores other keys', () => {
    expect(nextRating(3, 'Home')).toBe(1);
    expect(nextRating(3, 'End')).toBe(5);
    expect(nextRating(3, 'a')).toBeNull();
  });
});
