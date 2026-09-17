import { toComparable } from './valueUtilities.js';

export function normalizeReadoutXEligibility(value) {
  if (typeof value !== 'string') return 'withinBounds';

  const normalized = value.trim().toLowerCase();
  if (normalized === 'anydistance' || normalized === 'any-distance') {
    return 'anyDistance';
  }
  if (normalized === 'withintolerance' || normalized === 'within-tolerance') {
    return 'withinTolerance';
  }
  return 'withinBounds';
}

export function resolveReadoutXEligibility(series, readoutOptions = {}) {
  return normalizeReadoutXEligibility(
    series?.readoutXEligibility ?? readoutOptions?.xEligibility,
  );
}

export function resolveReadoutXTolerance(series, readoutOptions = {}) {
  const numeric = Number(
    series?.readoutXTolerance ?? readoutOptions?.xTolerance,
  );
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

export function resolveMissingSeriesMode(readoutOptions = {}) {
  return readoutOptions?.missingSeries === 'omit' ? 'omit' : 'placeholder';
}

export function getSeriesXExtent({ accessors, seriesData }) {
  let min = Infinity;
  let max = -Infinity;
  let minRaw = null;
  let maxRaw = null;

  seriesData.forEach((datum) => {
    const raw = accessors.x?.(datum);
    const comparable = toComparable(raw);
    if (comparable == null) return;

    if (comparable < min) {
      min = comparable;
      minRaw = raw;
    }
    if (comparable > max) {
      max = comparable;
      maxRaw = raw;
    }
  });

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  return {
    min,
    max,
    raw: { min: minRaw, max: maxRaw },
  };
}

export function resolveHoverXValue({ hoverEvent, hoverX, xScale }) {
  if (hoverEvent?.xValue != null) return hoverEvent.xValue;

  if (typeof xScale?.invert === 'function') {
    try {
      const value = xScale.invert(hoverX);
      return value == null ? null : value;
    } catch {
      return null;
    }
  }

  return null;
}

export function getXDistanceValue(first, second) {
  const firstComparable = toComparable(first);
  const secondComparable = toComparable(second);
  if (firstComparable == null || secondComparable == null) return null;
  return Math.abs(firstComparable - secondComparable);
}

export function getSeriesXAvailability({
  hoverXValue,
  nearest,
  policy,
  tolerance,
  xExtent,
}) {
  const hoverComparable = toComparable(hoverXValue);
  const sampleX = nearest?.values?.x ?? null;
  const xDistanceValue = getXDistanceValue(hoverXValue, sampleX);

  if (policy === 'anyDistance') {
    return {
      status: 'available',
      sampleX,
      xDistanceValue,
      xExtent: xExtent?.raw ?? null,
    };
  }

  if (!xExtent || hoverComparable == null) {
    return {
      status: 'available',
      sampleX,
      xDistanceValue,
      xExtent: xExtent?.raw ?? null,
    };
  }

  if (hoverComparable >= xExtent.min && hoverComparable <= xExtent.max) {
    return {
      status: 'available',
      sampleX,
      xDistanceValue,
      xExtent: xExtent.raw,
    };
  }

  if (
    policy === 'withinTolerance' &&
    tolerance != null &&
    xDistanceValue != null &&
    xDistanceValue <= tolerance
  ) {
    return {
      status: 'available',
      sampleX,
      xDistanceValue,
      xExtent: xExtent.raw,
    };
  }

  return {
    status: 'outOfRange',
    sampleX,
    xDistanceValue,
    xExtent: xExtent.raw,
  };
}
