export function normalizeThresholds(thresholds) {
  if (!Array.isArray(thresholds)) return [];

  const sorted = thresholds
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  return sorted.filter(
    (value, index) => index === 0 || value !== sorted[index - 1],
  );
}

export function getNumericExtent(values) {
  if (!Array.isArray(values) || values.length === 0) return [null, null];

  let min = Infinity;
  let max = -Infinity;

  values.forEach((value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    if (numeric < min) min = numeric;
    if (numeric > max) max = numeric;
  });

  if (!Number.isFinite(min) || !Number.isFinite(max)) return [null, null];
  return [min, max];
}

export function resolveThresholds(inputThresholds, values, colors) {
  const normalized = normalizeThresholds(inputThresholds);
  if (normalized.length > 0) return normalized;

  const colorCount = Array.isArray(colors) ? colors.length : 0;
  const thresholdCount = Math.max(0, colorCount - 1);
  if (thresholdCount === 0) return [];

  const [min, max] = getNumericExtent(values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max <= min) return [min];

  const step = (max - min) / colorCount;
  return Array.from(
    { length: thresholdCount },
    (_, index) => min + step * (index + 1),
  );
}
