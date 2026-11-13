import { computeDonut, niceScale } from './chart-math';

describe('niceScale', () => {
  it('rounds up to a readable maximum with equal steps', () => {
    expect(niceScale(52000)).toEqual({ max: 60000, ticks: [0, 20000, 40000, 60000] });
    expect(niceScale(7)).toEqual({ max: 7.5, ticks: [0, 2.5, 5, 7.5] });
  });

  it('handles all-zero data', () => {
    expect(niceScale(0)).toEqual({ max: 0, ticks: [0] });
    expect(niceScale(Number.NaN)).toEqual({ max: 0, ticks: [0] });
  });

  it('handles a single value', () => {
    const scale = niceScale(1250);
    expect(scale.max).toBeGreaterThanOrEqual(1250);
    expect(scale.ticks.length).toBe(4);
  });
});

describe('computeDonut', () => {
  it('returns no arcs for zero data', () => {
    expect(computeDonut([0, 0], 50)).toEqual([]);
  });

  it('draws one full circle without a gap for one item', () => {
    const [arc] = computeDonut([100], 50);
    expect(arc.length).toBeCloseTo(2 * Math.PI * 50);
    expect(arc.offset).toBe(-0);
  });

  it('splits the circumference proportionally', () => {
    const arcs = computeDonut([1, 3], 50, 0);
    const circumference = 2 * Math.PI * 50;
    expect(arcs[0].length).toBeCloseTo(circumference / 4);
    expect(arcs[1].offset).toBeCloseTo(-circumference / 4);
  });
});
