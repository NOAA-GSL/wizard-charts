export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function resolveReadoutFontOptions(input, fallback) {
  const next = input && typeof input === 'object' ? input : {};

  const parsedSize = Number(next.fontSize);
  const fontSize =
    Number.isFinite(parsedSize) && parsedSize > 0
      ? parsedSize
      : fallback.fontSize;

  const fontWeight = next.fontWeight ?? fallback.fontWeight;
  const fontFamily =
    typeof next.fontFamily === 'string' && next.fontFamily.trim().length > 0
      ? next.fontFamily
      : fallback.fontFamily;
  const fontColor =
    typeof next.fontColor === 'string' && next.fontColor.trim().length > 0
      ? next.fontColor
      : fallback.fontColor;

  return {
    fontSize,
    fontWeight,
    fontFamily,
    fontColor,
  };
}

export function resolveReadoutPadding(input, fallback) {
  const numeric = Number(input);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return { x: numeric, y: numeric };
  }

  const next = input && typeof input === 'object' ? input : {};
  const parsedX = Number(next.x);
  const parsedY = Number(next.y);

  return {
    x: Number.isFinite(parsedX) && parsedX >= 0 ? parsedX : fallback.x,
    y: Number.isFinite(parsedY) && parsedY >= 0 ? parsedY : fallback.y,
  };
}

export function toFontString(fontOptions) {
  return `${fontOptions.fontWeight} ${fontOptions.fontSize}px ${fontOptions.fontFamily}`;
}

export function formatReadoutNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'n/a';

  const abs = Math.abs(numeric);
  if (abs >= 100) {
    return numeric.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  if (abs >= 1) {
    return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  return numeric.toLocaleString(undefined, {
    minimumSignificantDigits: 1,
    maximumSignificantDigits: 3,
  });
}

export function formatReadoutXValue(value) {
  if (value instanceof Date) {
    return value.toLocaleString();
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return formatReadoutNumber(numeric);
  }

  if (value == null) return 'n/a';
  return String(value);
}

export function resolveSeriesValue(summary) {
  const values = summary?.values || {};

  if (summary?.seriesType === 'boxPlot') {
    if (Number.isFinite(Number(values.median))) return values.median;
    if (
      Number.isFinite(Number(values.q1)) &&
      Number.isFinite(Number(values.q3))
    ) {
      return (Number(values.q1) + Number(values.q3)) / 2;
    }
    return values.y;
  }

  if (summary?.seriesType === 'area') {
    if (Number.isFinite(Number(values.y))) return values.y;
    if (
      Number.isFinite(Number(values.lower)) &&
      Number.isFinite(Number(values.upper))
    ) {
      return (Number(values.lower) + Number(values.upper)) / 2;
    }
    return values.value;
  }

  if (summary?.seriesType === 'matrix' || summary?.seriesType === 'heatmap') {
    return values.value;
  }

  return values.y;
}
