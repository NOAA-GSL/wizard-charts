import { extent } from 'd3';

export function toComparable(value) {
  if (value instanceof Date) return value.getTime();
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function toTriggerPart(value) {
  if (value == null) return 'null';
  if (value instanceof Date) return `date:${value.getTime()}`;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? `num:${value}` : 'num:NaN';
  }

  if (typeof value === 'string') return `str:${value}`;
  if (typeof value === 'boolean') return `bool:${value}`;

  const numeric = Number(value);
  if (Number.isFinite(numeric)) return `num:${numeric}`;

  try {
    return `json:${JSON.stringify(value)}`;
  } catch {
    return `str:${String(value)}`;
  }
}

export function resolveThresholds(inputThresholds, values, colors) {
  const normalized = Array.isArray(inputThresholds)
    ? inputThresholds
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v))
        .sort((a, b) => a - b)
    : [];
  if (normalized.length > 0) return normalized;

  const colorCount = Array.isArray(colors) ? colors.length : 0;
  const thresholdCount = Math.max(0, colorCount - 1);
  if (thresholdCount === 0) return [];

  const [minValue, maxValue] = extent(values);
  const min = Number(minValue);
  const max = Number(maxValue);

  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max <= min) return [min];

  const step = (max - min) / colorCount;
  return Array.from({ length: thresholdCount }, (_, i) => min + step * (i + 1));
}

export function getColorForThresholdIndex(
  index,
  thresholds,
  colors,
  fallbackFill,
) {
  if (!Array.isArray(colors) || colors.length === 0) return fallbackFill;
  const colorIndex = Math.max(0, Math.min(index, thresholds.length));
  return colors[colorIndex] ?? colors[colors.length - 1] ?? fallbackFill;
}

export function getColorForValue(value, thresholds, colors, fallbackFill) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallbackFill;

  if (!thresholds.length || !Array.isArray(colors) || colors.length === 0) {
    return fallbackFill;
  }

  const bucketIndex = thresholds.findIndex((threshold) => numeric <= threshold);
  const colorIndex = bucketIndex === -1 ? thresholds.length : bucketIndex;
  return colors[colorIndex] ?? colors[colors.length - 1] ?? fallbackFill;
}

export function getBandRect(ordinalScale, value, padding = 0) {
  const start = ordinalScale(value);
  const bandwidth = ordinalScale.bandwidth();
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(bandwidth) ||
    bandwidth <= 0
  ) {
    return null;
  }

  const end = start + bandwidth;
  const min = Math.min(start, end);
  const max = Math.max(start, end);

  const pad = Math.max(0, Number(padding) || 0);
  const x = min + pad;
  const width = Math.max(0, max - min - 2 * pad);
  if (width <= 0) return null;

  return { start: x, size: width };
}

export function buildContinuousXMap(seriesData, xAccessor, xScale) {
  const byComparable = new Map();

  seriesData.forEach((d) => {
    const raw = xAccessor(d);
    if (raw == null) return;
    const comparable = toComparable(raw);
    if (comparable == null || byComparable.has(comparable)) return;

    const center = xScale(raw);
    if (!Number.isFinite(center)) return;

    byComparable.set(comparable, { comparable, center });
  });

  const ordered = Array.from(byComparable.values()).sort(
    (a, b) => a.comparable - b.comparable,
  );

  const fallbackWidth =
    ordered.length > 0
      ? Math.max(
          1,
          Math.abs(xScale.range()[1] - xScale.range()[0]) / ordered.length,
        )
      : 1;

  const lookup = new Map();
  ordered.forEach((entry, index) => {
    const prev = ordered[index - 1]?.center;
    const next = ordered[index + 1]?.center;
    const prevGap = Number.isFinite(prev) ? Math.abs(entry.center - prev) : NaN;
    const nextGap = Number.isFinite(next) ? Math.abs(next - entry.center) : NaN;

    let fallbackGap = fallbackWidth;
    if (Number.isFinite(nextGap)) fallbackGap = nextGap;
    else if (Number.isFinite(prevGap)) fallbackGap = prevGap;

    const leftBound = Number.isFinite(prev)
      ? (prev + entry.center) / 2
      : entry.center - fallbackGap / 2;
    const rightBound = Number.isFinite(next)
      ? (entry.center + next) / 2
      : entry.center + fallbackGap / 2;

    lookup.set(entry.comparable, {
      center: entry.center,
      prevCenter: prev,
      nextCenter: next,
      prevGap,
      nextGap,
      fallbackGap,
      leftBound,
      rightBound,
    });
  });

  return lookup;
}
