const DEFAULT_WHEEL_ZOOM_SPEED = 0.1;
const DEFAULT_ZOOM_MIN_WINDOW = 0;
const DEFAULT_DRAG_MIN_PIXELS = 4;
const DEFAULT_DRAG_BOX_FILL = '#147AF333';
const DEFAULT_DRAG_BOX_STROKE = '#147AF3';
const DEFAULT_DRAG_BOX_STROKE_WIDTH = 1;
const DEFAULT_PAN_CURSOR = 'move';
const SUPPORTED_ZOOM_MODIFIER_KEYS = new Set(['ctrl', 'shift', 'alt', 'meta']);

export function clampToRange(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function isContinuousZoomAxisType(type) {
  return type === 'linear' || type === 'time';
}

export function normalizeZoomOptions(zoomOptions = {}) {
  const modifierRaw = String(zoomOptions?.modifierKey || 'ctrl').toLowerCase();
  const modifierKey = SUPPORTED_ZOOM_MODIFIER_KEYS.has(modifierRaw)
    ? modifierRaw
    : 'ctrl';

  const wheelZoomSpeed = Number(zoomOptions?.wheelZoomSpeed);
  const minWindow = Number(zoomOptions?.minWindow);
  const minDragPixels = Number(zoomOptions?.minDragPixels);
  const dragBoxStrokeWidth = Number(zoomOptions?.dragBox?.strokeWidth);
  const panCursorRaw = zoomOptions?.panCursor;

  return {
    enabled: zoomOptions?.enabled !== false,
    wheelEnabled: zoomOptions?.wheelEnabled !== false,
    dragEnabled: zoomOptions?.dragEnabled !== false,
    panEnabled: zoomOptions?.panEnabled !== false,
    rightClickResetEnabled: zoomOptions?.rightClickResetEnabled !== false,
    modifierKey,
    panCursor:
      typeof panCursorRaw === 'string' && panCursorRaw.trim().length > 0
        ? panCursorRaw
        : DEFAULT_PAN_CURSOR,
    wheelZoomSpeed:
      Number.isFinite(wheelZoomSpeed) && wheelZoomSpeed > 0
        ? wheelZoomSpeed
        : DEFAULT_WHEEL_ZOOM_SPEED,
    minWindow:
      Number.isFinite(minWindow) && minWindow > 0
        ? minWindow
        : DEFAULT_ZOOM_MIN_WINDOW,
    minDragPixels:
      Number.isFinite(minDragPixels) && minDragPixels >= 0
        ? minDragPixels
        : DEFAULT_DRAG_MIN_PIXELS,
    dragBox: {
      fill:
        typeof zoomOptions?.dragBox?.fill === 'string' &&
        zoomOptions.dragBox.fill.trim().length > 0
          ? zoomOptions.dragBox.fill
          : DEFAULT_DRAG_BOX_FILL,
      stroke:
        typeof zoomOptions?.dragBox?.stroke === 'string' &&
        zoomOptions.dragBox.stroke.trim().length > 0
          ? zoomOptions.dragBox.stroke
          : DEFAULT_DRAG_BOX_STROKE,
      strokeWidth:
        Number.isFinite(dragBoxStrokeWidth) && dragBoxStrokeWidth >= 0
          ? dragBoxStrokeWidth
          : DEFAULT_DRAG_BOX_STROKE_WIDTH,
    },
  };
}

export function toDomainNumber(value) {
  if (value instanceof Date) return value.getTime();
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function convertDomainValue(sampleValue, numericValue) {
  if (!Number.isFinite(numericValue)) return null;
  if (sampleValue instanceof Date) return new Date(numericValue);
  return numericValue;
}

function normalizeDomainBounds(bounds) {
  if (!Array.isArray(bounds) || bounds.length !== 2) return null;

  const start = toDomainNumber(bounds[0]);
  const end = toDomainNumber(bounds[1]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  return { start, end };
}

function cloneDomain(domain) {
  return Array.isArray(domain) && domain.length === 2
    ? [domain[0], domain[1]]
    : null;
}

export function domainsEqual(a, b) {
  const domainA = cloneDomain(a);
  const domainB = cloneDomain(b);
  if (domainA == null && domainB == null) return true;
  if (domainA == null || domainB == null) return false;

  return (
    domainA[0]?.valueOf?.() === domainB[0]?.valueOf?.() &&
    domainA[1]?.valueOf?.() === domainB[1]?.valueOf?.()
  );
}

export function zoomDomainOverridesEqual(a = {}, b = {}) {
  return domainsEqual(a.x, b.x) && domainsEqual(a.x2, b.x2);
}

export function normalizeZoomDomainOverrides(overrides = {}) {
  return {
    x: cloneDomain(overrides.x),
    x2: cloneDomain(overrides.x2),
  };
}

export function getZoomStateFromOverrides(
  overrides = {},
  bounds = {},
  source = null,
) {
  const domain = normalizeZoomDomainOverrides(overrides);
  const normalizedBounds = {
    x: cloneDomain(bounds.x),
    x2: cloneDomain(bounds.x2),
  };
  const primaryDomain = domain.x || domain.x2;
  const start = primaryDomain ? toDomainNumber(primaryDomain[0]) : null;
  const end = primaryDomain ? toDomainNumber(primaryDomain[1]) : null;
  const hasWindow =
    Number.isFinite(start) && Number.isFinite(end) && end > start;
  const centerValue = hasWindow ? start + (end - start) / 2 : null;
  const center =
    hasWindow && primaryDomain[0] instanceof Date
      ? new Date(centerValue)
      : centerValue;

  return {
    domain,
    start: hasWindow ? primaryDomain[0] : null,
    startValue: hasWindow ? start : null,
    center,
    centerValue,
    end: hasWindow ? primaryDomain[1] : null,
    endValue: hasWindow ? end : null,
    windowSize: hasWindow ? end - start : null,
    bounds: normalizedBounds,
    isZoomed: domain.x != null || domain.x2 != null,
    source,
  };
}

function clampDomainWindowToBounds(start, end, bounds) {
  let nextStart = start;
  let nextEnd = end;
  const normalizedBounds = normalizeDomainBounds(bounds);

  if (normalizedBounds) {
    const span = nextEnd - nextStart;
    const boundsSpan = normalizedBounds.end - normalizedBounds.start;

    if (span >= boundsSpan) {
      return {
        start: normalizedBounds.start,
        end: normalizedBounds.end,
      };
    }

    if (nextStart < normalizedBounds.start) {
      const shift = normalizedBounds.start - nextStart;
      nextStart += shift;
      nextEnd += shift;
    }

    if (nextEnd > normalizedBounds.end) {
      const shift = nextEnd - normalizedBounds.end;
      nextStart -= shift;
      nextEnd -= shift;
    }

    nextStart = Math.max(normalizedBounds.start, nextStart);
    nextEnd = Math.min(normalizedBounds.end, nextEnd);
  }

  return { start: nextStart, end: nextEnd };
}

export function buildZoomedDomain(
  scale,
  anchorPixel,
  zoomFactor,
  minWindow = 0,
  bounds = null,
) {
  if (!scale || typeof scale.invert !== 'function') return null;

  const domain = scale.domain?.();
  if (!Array.isArray(domain) || domain.length !== 2) return null;

  const domainStart = toDomainNumber(domain[0]);
  const domainEnd = toDomainNumber(domain[1]);
  if (!Number.isFinite(domainStart) || !Number.isFinite(domainEnd)) return null;

  const span = domainEnd - domainStart;
  if (!Number.isFinite(span) || span <= 0) return null;

  const anchorValue = scale.invert(anchorPixel);
  const anchorNumber = toDomainNumber(anchorValue);
  if (!Number.isFinite(anchorNumber)) return null;

  const anchorRatio = (anchorNumber - domainStart) / span;
  const normalizedAnchorRatio = Number.isFinite(anchorRatio)
    ? Math.min(1, Math.max(0, anchorRatio))
    : 0.5;

  const requestedSpan = span * zoomFactor;
  const normalizedBounds = normalizeDomainBounds(bounds);
  const boundsSpan = normalizedBounds
    ? normalizedBounds.end - normalizedBounds.start
    : null;
  const maxSpan = Number.isFinite(boundsSpan) ? boundsSpan : Infinity;
  const nextSpan = Math.min(maxSpan, Math.max(minWindow, requestedSpan));
  if (!Number.isFinite(nextSpan) || nextSpan <= 0) return null;

  let nextStart = anchorNumber - normalizedAnchorRatio * nextSpan;
  let nextEnd = nextStart + nextSpan;

  if (normalizedBounds) {
    if (nextStart < normalizedBounds.start) {
      const shift = normalizedBounds.start - nextStart;
      nextStart += shift;
      nextEnd += shift;
    }

    if (nextEnd > normalizedBounds.end) {
      const shift = nextEnd - normalizedBounds.end;
      nextStart -= shift;
      nextEnd -= shift;
    }

    nextStart = Math.max(normalizedBounds.start, nextStart);
    nextEnd = Math.min(normalizedBounds.end, nextEnd);
  }

  if (!Number.isFinite(nextStart) || !Number.isFinite(nextEnd)) return null;
  if (nextEnd <= nextStart) return null;

  const startValue = convertDomainValue(domain[0], nextStart);
  const endValue = convertDomainValue(domain[1], nextEnd);
  if (startValue == null || endValue == null) return null;

  return [startValue, endValue];
}

export function buildDomainFromPixelWindow(
  scale,
  pixelStart,
  pixelEnd,
  minWindow = 0,
  bounds = null,
) {
  if (!scale || typeof scale.invert !== 'function') return null;

  const domain = scale.domain?.();
  if (!Array.isArray(domain) || domain.length !== 2) return null;

  const windowStartPixel = Math.min(pixelStart, pixelEnd);
  const windowEndPixel = Math.max(pixelStart, pixelEnd);
  if (!Number.isFinite(windowStartPixel) || !Number.isFinite(windowEndPixel)) {
    return null;
  }

  const startValueRaw = scale.invert(windowStartPixel);
  const endValueRaw = scale.invert(windowEndPixel);
  const startNumberRaw = toDomainNumber(startValueRaw);
  const endNumberRaw = toDomainNumber(endValueRaw);

  if (!Number.isFinite(startNumberRaw) || !Number.isFinite(endNumberRaw)) {
    return null;
  }

  let nextStart = Math.min(startNumberRaw, endNumberRaw);
  let nextEnd = Math.max(startNumberRaw, endNumberRaw);

  const normalizedBounds = normalizeDomainBounds(bounds);
  const boundsSpan = normalizedBounds
    ? normalizedBounds.end - normalizedBounds.start
    : null;

  if (normalizedBounds) {
    nextStart = clampToRange(
      nextStart,
      normalizedBounds.start,
      normalizedBounds.end,
    );
    nextEnd = clampToRange(
      nextEnd,
      normalizedBounds.start,
      normalizedBounds.end,
    );
  }

  let span = nextEnd - nextStart;
  if (!Number.isFinite(span) || span <= 0) return null;

  const safeMinWindow = Number.isFinite(minWindow) ? Math.max(0, minWindow) : 0;
  if (safeMinWindow > 0 && span < safeMinWindow) {
    const targetSpan = Number.isFinite(boundsSpan)
      ? Math.min(boundsSpan, safeMinWindow)
      : safeMinWindow;
    const center = (nextStart + nextEnd) / 2;
    nextStart = center - targetSpan / 2;
    nextEnd = center + targetSpan / 2;

    if (normalizedBounds) {
      if (nextStart < normalizedBounds.start) {
        const shift = normalizedBounds.start - nextStart;
        nextStart += shift;
        nextEnd += shift;
      }

      if (nextEnd > normalizedBounds.end) {
        const shift = nextEnd - normalizedBounds.end;
        nextStart -= shift;
        nextEnd -= shift;
      }

      nextStart = Math.max(normalizedBounds.start, nextStart);
      nextEnd = Math.min(normalizedBounds.end, nextEnd);
    }

    span = nextEnd - nextStart;
    if (!Number.isFinite(span) || span <= 0) return null;
  }

  const startValue = convertDomainValue(domain[0], nextStart);
  const endValue = convertDomainValue(domain[1], nextEnd);
  if (startValue == null || endValue == null) return null;

  return [startValue, endValue];
}

export function buildDomainFromCenterWindow(
  scale,
  center,
  windowSize,
  minWindow = 0,
  bounds = null,
) {
  if (!scale || typeof scale.domain !== 'function') return null;

  const domain = scale.domain?.();
  if (!Array.isArray(domain) || domain.length !== 2) return null;

  const centerNumber = toDomainNumber(center);
  const requestedWindow = Number(windowSize);
  if (!Number.isFinite(centerNumber) || !Number.isFinite(requestedWindow)) {
    return null;
  }

  const safeMinWindow = Number.isFinite(minWindow) ? Math.max(0, minWindow) : 0;
  let nextWindowSize = Math.max(safeMinWindow, requestedWindow);
  const normalizedBounds = normalizeDomainBounds(bounds);
  const boundsSpan = normalizedBounds
    ? normalizedBounds.end - normalizedBounds.start
    : null;

  if (Number.isFinite(boundsSpan)) {
    nextWindowSize = Math.min(boundsSpan, nextWindowSize);
  }

  if (!Number.isFinite(nextWindowSize) || nextWindowSize <= 0) return null;

  const unclampedStart = centerNumber - nextWindowSize / 2;
  const unclampedEnd = centerNumber + nextWindowSize / 2;
  const { start, end } = clampDomainWindowToBounds(
    unclampedStart,
    unclampedEnd,
    bounds,
  );

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  const startValue = convertDomainValue(domain[0], start);
  const endValue = convertDomainValue(domain[1], end);
  if (startValue == null || endValue == null) return null;

  return [startValue, endValue];
}

export function buildPannedDomain(scale, pixelDelta, bounds = null) {
  if (!scale || typeof scale.invert !== 'function') return null;

  const domain = scale.domain?.();
  const range = scale.range?.();
  if (!Array.isArray(domain) || domain.length !== 2) return null;
  if (!Array.isArray(range) || range.length !== 2) return null;

  const domainStart = toDomainNumber(domain[0]);
  const domainEnd = toDomainNumber(domain[1]);
  if (!Number.isFinite(domainStart) || !Number.isFinite(domainEnd)) return null;

  const centerPixel = (Number(range[0]) + Number(range[1])) / 2;
  const centerDomainValue = toDomainNumber(scale.invert(centerPixel));
  const shiftedDomainValue = toDomainNumber(
    scale.invert(centerPixel + pixelDelta),
  );
  if (
    !Number.isFinite(centerDomainValue) ||
    !Number.isFinite(shiftedDomainValue)
  ) {
    return null;
  }

  const domainDelta = shiftedDomainValue - centerDomainValue;
  let nextStart = domainStart - domainDelta;
  let nextEnd = domainEnd - domainDelta;

  const normalizedBounds = normalizeDomainBounds(bounds);
  if (normalizedBounds) {
    const span = nextEnd - nextStart;
    const boundsSpan = normalizedBounds.end - normalizedBounds.start;
    if (span > boundsSpan) {
      nextStart = normalizedBounds.start;
      nextEnd = normalizedBounds.end;
    } else {
      if (nextStart < normalizedBounds.start) {
        const shift = normalizedBounds.start - nextStart;
        nextStart += shift;
        nextEnd += shift;
      }

      if (nextEnd > normalizedBounds.end) {
        const shift = nextEnd - normalizedBounds.end;
        nextStart -= shift;
        nextEnd -= shift;
      }

      nextStart = Math.max(normalizedBounds.start, nextStart);
      nextEnd = Math.min(normalizedBounds.end, nextEnd);
    }
  }

  if (!Number.isFinite(nextStart) || !Number.isFinite(nextEnd)) return null;
  if (nextEnd <= nextStart) return null;

  const startValue = convertDomainValue(domain[0], nextStart);
  const endValue = convertDomainValue(domain[1], nextEnd);
  if (startValue == null || endValue == null) return null;

  return [startValue, endValue];
}

export function isPanPossible(scale, bounds) {
  if (!scale) return false;

  const currentDomain = scale.domain?.();
  const normalizedCurrent = normalizeDomainBounds(currentDomain);
  const normalizedBounds = normalizeDomainBounds(bounds);
  if (!normalizedCurrent || !normalizedBounds) return false;

  const currentSpan = normalizedCurrent.end - normalizedCurrent.start;
  const boundsSpan = normalizedBounds.end - normalizedBounds.start;
  return currentSpan < boundsSpan;
}
