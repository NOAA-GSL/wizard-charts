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

function applyReadoutFormatter(formatter, value, context, fallbackText) {
  if (typeof formatter !== 'function') return fallbackText;

  try {
    const formatted = formatter(value, context);
    if (formatted == null) return fallbackText;
    return String(formatted);
  } catch {
    return fallbackText;
  }
}

function normalizeUnitsText(value) {
  if (typeof value !== 'string') return '';

  const units = value.trim();
  return units.length > 0 ? units : '';
}

function resolveReadoutPrecision(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return Math.min(20, Math.floor(parsed));
}

function appendUnitsSuffix(text, units, displayUnits) {
  if (!displayUnits) return text;

  const unitsText = normalizeUnitsText(units);
  if (!unitsText) return text;

  return `${text} ${unitsText}`;
}

function getDefaultReadoutNumberText(numeric, precision = null) {
  if (precision != null) {
    return numeric.toLocaleString(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  }

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

export function formatReadoutNumber(
  value,
  formatter = null,
  formatterContext = {},
) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'n/a';

  const readoutPrecision = resolveReadoutPrecision(
    formatterContext?.readoutPrecision,
  );
  const displayUnits = formatterContext?.displayUnits !== false;
  const units = normalizeUnitsText(formatterContext?.units);

  const fallbackText = appendUnitsSuffix(
    getDefaultReadoutNumberText(numeric, readoutPrecision),
    units,
    displayUnits,
  );

  const nextContext = {
    ...formatterContext,
    defaultText: fallbackText,
    displayUnits,
    units,
    readoutPrecision,
  };

  return applyReadoutFormatter(formatter, numeric, nextContext, fallbackText);
}

export function formatReadoutXValue(
  value,
  formatter = null,
  formatterContext = {},
) {
  const axisKey = formatterContext?.axisKey === 'x2' ? 'x2' : 'x';

  if (value instanceof Date) {
    const fallbackText = value.toLocaleString();
    return applyReadoutFormatter(
      formatter,
      value,
      { ...formatterContext, axisKey, isDate: true },
      fallbackText,
    );
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return formatReadoutNumber(numeric, formatter, {
      ...formatterContext,
      axisKey,
      isDate: false,
    });
  }

  const fallbackText = value == null ? 'n/a' : String(value);
  return applyReadoutFormatter(
    formatter,
    value,
    { ...formatterContext, axisKey, isDate: false },
    fallbackText,
  );
}

const BOX_PLOT_FIELD_LABELS = {
  median: 'Median',
  q1: 'Q1',
  q3: 'Q3',
  min: 'Min',
  max: 'Max',
};

const AREA_FIELD_LABELS = {
  y: 'Y',
  lower: 'Q1',
  upper: 'Q3',
  min: 'Min',
  max: 'Max',
};

function normalizeFieldInput(input) {
  if (Array.isArray(input)) return input;
  if (typeof input === 'string') return [input];
  return [];
}

function dedupeFields(fields) {
  return Array.from(new Set(fields));
}

function normalizeBoxPlotField(field) {
  if (typeof field !== 'string') return null;

  const normalized = field.trim().toLowerCase();
  if (normalized === 'lower') return 'q1';
  if (normalized === 'upper') return 'q3';

  if (
    normalized === 'auto' ||
    normalized === 'median' ||
    normalized === 'q1' ||
    normalized === 'q3' ||
    normalized === 'min' ||
    normalized === 'max'
  ) {
    return normalized;
  }

  return null;
}

function normalizeAreaField(field) {
  if (typeof field !== 'string') return null;

  const normalized = field.trim().toLowerCase();
  if (normalized === 'median') return 'y';
  if (normalized === 'q1') return 'lower';
  if (normalized === 'q3') return 'upper';

  if (
    normalized === 'auto' ||
    normalized === 'y' ||
    normalized === 'lower' ||
    normalized === 'upper' ||
    normalized === 'min' ||
    normalized === 'max'
  ) {
    return normalized;
  }

  return null;
}

function resolveConfiguredFields(input, normalizeField, fallback = ['auto']) {
  const normalized = normalizeFieldInput(input)
    .map((field) => normalizeField(field))
    .filter(Boolean);

  if (normalized.length === 0) return fallback;
  return dedupeFields(normalized);
}

function resolveBoxPlotFields(readoutOptions = {}) {
  return resolveConfiguredFields(
    readoutOptions?.boxPlotFields,
    normalizeBoxPlotField,
    ['auto'],
  );
}

function resolveAreaFields(readoutOptions = {}) {
  return resolveConfiguredFields(
    readoutOptions?.areaFields,
    normalizeAreaField,
    ['auto'],
  );
}

function resolveBoxPlotFieldValue(values = {}, field) {
  if (field === 'median') return values.median;
  if (field === 'q1') return values.q1;
  if (field === 'q3') return values.q3;
  if (field === 'min') return values.min;
  if (field === 'max') return values.max;
  return undefined;
}

function resolveAreaFieldValue(values = {}, field) {
  if (field === 'y') return values.y;
  if (field === 'lower') return values.lower;
  if (field === 'upper') return values.upper;
  if (field === 'min') return values.min;
  if (field === 'max') return values.max;
  return undefined;
}

function resolveAutoBoxPlotValue(values = {}) {
  if (Number.isFinite(Number(values.median))) return values.median;
  if (
    Number.isFinite(Number(values.q1)) &&
    Number.isFinite(Number(values.q3))
  ) {
    return (Number(values.q1) + Number(values.q3)) / 2;
  }
  return values.y;
}

function resolveAutoAreaValue(values = {}) {
  if (Number.isFinite(Number(values.y))) return values.y;
  if (
    Number.isFinite(Number(values.lower)) &&
    Number.isFinite(Number(values.upper))
  ) {
    return (Number(values.lower) + Number(values.upper)) / 2;
  }
  return values.value;
}

export function resolveSeriesReadoutEntries(summary, readoutOptions = {}) {
  const values = summary?.values || {};

  if (summary?.seriesType === 'boxPlot') {
    const fields = resolveBoxPlotFields(readoutOptions);
    if (fields.length === 1 && fields[0] === 'auto') {
      return [
        { key: 'auto', label: null, value: resolveAutoBoxPlotValue(values) },
      ];
    }

    return fields
      .filter((field) => field !== 'auto')
      .map((field) => ({
        key: field,
        label: BOX_PLOT_FIELD_LABELS[field],
        value: resolveBoxPlotFieldValue(values, field),
      }));
  }

  if (summary?.seriesType === 'area') {
    const fields = resolveAreaFields(readoutOptions);
    if (fields.length === 1 && fields[0] === 'auto') {
      return [
        { key: 'auto', label: null, value: resolveAutoAreaValue(values) },
      ];
    }

    return fields
      .filter((field) => field !== 'auto')
      .map((field) => ({
        key: field,
        label: AREA_FIELD_LABELS[field],
        value: resolveAreaFieldValue(values, field),
      }));
  }

  if (summary?.seriesType === 'matrix' || summary?.seriesType === 'heatmap') {
    return [{ key: 'value', label: null, value: values.value }];
  }

  return [{ key: 'y', label: null, value: values.y }];
}

export function resolveSeriesValue(summary, readoutOptions = {}) {
  const entries = resolveSeriesReadoutEntries(summary, readoutOptions);
  if (!entries.length) return undefined;

  const firstFinite = entries.find((entry) =>
    Number.isFinite(Number(entry.value)),
  );
  return firstFinite ? firstFinite.value : entries[0].value;
}

function resolveReadoutValueFormatter(readoutOptions = {}) {
  return typeof readoutOptions?.valueFormatter === 'function'
    ? readoutOptions.valueFormatter
    : null;
}

function buildReadoutValueFormatterContext(
  summary,
  entry,
  variant,
  readoutOptions = {},
) {
  const readoutDisplayUnits = readoutOptions?.displayUnits !== false;
  const seriesDisplayUnits = summary?.seriesDisplayUnits !== false;

  return {
    seriesType: summary?.seriesType ?? null,
    fieldKey: entry?.key ?? null,
    fieldLabel: entry?.label ?? null,
    variant,
    summary,
    units: normalizeUnitsText(summary?.seriesUnits),
    displayUnits: readoutDisplayUnits && seriesDisplayUnits,
    readoutDisplayUnits,
    seriesDisplayUnits,
    readoutPrecision: summary?.seriesReadoutPrecision,
  };
}

export function formatSeriesReadoutText(summary, readoutOptions = {}) {
  const entries = resolveSeriesReadoutEntries(summary, readoutOptions);
  if (!entries.length) return 'n/a';

  const valueFormatter = resolveReadoutValueFormatter(readoutOptions);

  if (entries.length === 1 && !entries[0].label) {
    return formatReadoutNumber(
      entries[0].value,
      valueFormatter,
      buildReadoutValueFormatterContext(
        summary,
        entries[0],
        'row',
        readoutOptions,
      ),
    );
  }

  return entries
    .map((entry) => {
      const valueText = formatReadoutNumber(
        entry.value,
        valueFormatter,
        buildReadoutValueFormatterContext(
          summary,
          entry,
          'row',
          readoutOptions,
        ),
      );
      return entry.label ? `${entry.label}: ${valueText}` : valueText;
    })
    .join(' | ');
}

export function resolveSeriesReadoutDetailLines(summary, readoutOptions = {}) {
  if (summary?.seriesType !== 'boxPlot' && summary?.seriesType !== 'area') {
    return [];
  }

  const entries = resolveSeriesReadoutEntries(summary, readoutOptions);
  const valueFormatter = resolveReadoutValueFormatter(readoutOptions);

  return entries
    .filter((entry) => entry?.label && Number.isFinite(Number(entry?.value)))
    .map((entry) => ({
      key: entry.key,
      label: String(entry.label),
      text: formatReadoutNumber(
        entry.value,
        valueFormatter,
        buildReadoutValueFormatterContext(
          summary,
          entry,
          'detail',
          readoutOptions,
        ),
      ),
    }));
}
