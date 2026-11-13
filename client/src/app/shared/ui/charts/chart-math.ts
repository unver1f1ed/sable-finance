export interface Scale {
  max: number;
  ticks: number[];
}

export function niceScale(maxValue: number, intervals = 3): Scale {
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return { max: 0, ticks: [0] };
  }
  const raw = maxValue / intervals;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  const step = factor * magnitude;
  const ticks = Array.from({ length: intervals + 1 }, (_, index) => step * index);
  return { max: step * intervals, ticks };
}

export interface DonutArc {
  length: number;
  gap: number;
  offset: number;
}

export function computeDonut(values: number[], radius: number, gapLength = 4): DonutArc[] {
  const total = values.reduce((sum, value) => sum + Math.max(value, 0), 0);
  if (total <= 0) {
    return [];
  }
  const circumference = 2 * Math.PI * radius;
  const visible = values.filter((value) => value > 0).length;
  let start = 0;
  return values.map((value) => {
    const share = (Math.max(value, 0) / total) * circumference;
    const gap = visible > 1 ? gapLength : 0;
    const arc = { length: Math.max(share - gap, 0), gap: circumference - Math.max(share - gap, 0), offset: -start };
    start += share;
    return arc;
  });
}
