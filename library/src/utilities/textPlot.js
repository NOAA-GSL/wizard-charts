import { getTextDimensions } from './measurements';
import { formatReadoutNumber } from './readoutHelpers';
import { toComparable } from './valueUtilities';

function isNumeric(value) {
  return value != null && value !== '' && Number.isFinite(Number(value));
}

function position(scale, value) {
  if (!scale || value == null || value === '') return NaN;
  const pixel = scale(value);
  return Number.isFinite(pixel)
    ? pixel +
        (typeof scale.bandwidth === 'function' ? scale.bandwidth() / 2 : 0)
    : NaN;
}

function markExtrema(points) {
  let segment = [];
  const finishSegment = () => {
    const runs = [];
    segment.forEach((point) => {
      const previous = runs.at(-1);
      if (previous?.value === point.value) previous.points.push(point);
      else runs.push({ value: point.value, points: [point] });
    });
    const turns = runs.filter((run, index) => {
      if (index === 0 || index === runs.length - 1) return false;
      const before = runs[index - 1].value;
      const after = runs[index + 1].value;
      return (
        (run.value > before && run.value > after) ||
        (run.value < before && run.value < after)
      );
    });
    turns.forEach((run, index) => {
      const point = run.points[Math.floor((run.points.length - 1) / 2)];
      point.extremum = true;
      point.strength = Math.min(
        Math.abs(point.y - (turns[index - 1] || runs[0]).points[0].y),
        Math.abs(point.y - (turns[index + 1] || runs.at(-1)).points[0].y),
      );
    });
    segment = [];
  };
  points.forEach((point) => {
    if (point) segment.push(point);
    else finishSegment();
  });
  finishSegment();
}

export function buildSeriesTextCandidates({
  data = [],
  accessors,
  xScale,
  yScale,
  series = {},
  options = {},
  groupId = 0,
}) {
  if (!accessors || !xScale || !yScale || series.isVisible === false) return [];
  const points = data.map((datum, dataIndex) => {
    const xValue = accessors.x(datum);
    const yValue = accessors.y(datum);
    if (!isNumeric(yValue)) return null;
    const x = position(xScale, xValue);
    const y = position(yScale, yValue);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {
      id: `${groupId}:${dataIndex}`,
      groupId,
      dataIndex,
      datum,
      xValue,
      yValue,
      value: Number(yValue),
      x,
      y,
      options,
      series,
      priority: 0,
      strength: 0,
    };
  });
  markExtrema(points);
  const valid = points.filter(Boolean);
  const selection = options.selection || {};
  const mode = selection.mode || 'auto';
  if (mode === 'xValues') {
    const comparablePoints = valid.filter(
      (point) => toComparable(point.xValue) != null,
    );
    const comparableValues = comparablePoints.map((point) =>
      toComparable(point.xValue),
    );
    const minimum = comparableValues.reduce(
      (value, next) => Math.min(value, next),
      Infinity,
    );
    const maximum = comparableValues.reduce(
      (value, next) => Math.max(value, next),
      -Infinity,
    );
    const selected = new Map();
    (selection.values || []).forEach((value) => {
      if (value == null || value === '') return;
      const comparable = toComparable(value);
      const numericMatch =
        comparable != null && comparable >= minimum && comparable <= maximum;
      let nearest = null;
      let distance = Infinity;
      valid.forEach((point) => {
        const pointComparable = toComparable(point.xValue);
        const nextDistance =
          numericMatch && pointComparable != null
            ? Math.abs(pointComparable - comparable)
            : point.xValue === value
              ? 0
              : Infinity;
        if (nextDistance < distance) {
          nearest = point;
          distance = nextDistance;
        }
      });
      if (!nearest || (selection.sampling === 'exact' && distance !== 0))
        return;
      if (
        isNumeric(selection.xTolerance) &&
        distance > Math.max(0, Number(selection.xTolerance))
      )
        return;
      selected.set(nearest.id, { ...nearest, priority: 3 });
    });
    return [...selected.values()];
  }
  if (mode === 'everyNth') {
    const every = Math.max(1, Math.floor(Number(selection.every) || 1));
    return valid.filter((point) => point.dataIndex % every === 0);
  }
  if (mode === 'auto' && selection.priority === 'extrema') {
    valid.forEach((point) => {
      point.priority = point.extremum ? 1 : 0;
      point.autoExtrema = true;
    });
  }
  return valid;
}

export function buildManualTextCandidates({
  data = [],
  xScale,
  yScale,
  options = {},
  groupId = 0,
}) {
  return data.flatMap((datum, dataIndex) => {
    if (!datum || datum.isVisible === false) return [];
    const x = position(xScale, datum.x);
    const y = position(yScale, datum.y);
    const value = datum.value === undefined ? datum.y : datum.value;
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      (datum.text == null && !isNumeric(value))
    )
      return [];
    return [
      {
        id: `${groupId}:${datum.id ?? dataIndex}`,
        groupId,
        dataIndex,
        datum,
        xValue: datum.x,
        yValue: datum.y,
        value,
        text: datum.text,
        x,
        y,
        options: { ...options, ...datum },
        priority: 3,
        strength: 0,
      },
    ];
  });
}

export function layoutTextCandidates({
  candidates = [],
  bounds,
  measureText = getTextDimensions,
}) {
  if (!bounds || bounds.right <= bounds.left || bounds.bottom <= bounds.top)
    return [];
  const visible = candidates
    .filter(
      (point) =>
        point.x >= bounds.left &&
        point.x <= bounds.right &&
        point.y >= bounds.top &&
        point.y <= bounds.bottom,
    )
    .map((point) => ({ ...point }));
  const extremaGroups = new Map();
  visible
    .filter((point) => point.autoExtrema)
    .forEach((point) => {
      const group = extremaGroups.get(point.groupId) || [];
      group.push(point);
      extremaGroups.set(point.groupId, group);
    });
  extremaGroups.forEach((points) => {
    const ordered = [...points].sort(
      (first, second) => first.value - second.value,
    );
    [ordered[0].value, ordered.at(-1).value].forEach((value) => {
      const representative =
        points.find((point) => point.value === value && point.extremum) ||
        points.find((point) => point.value === value);
      representative.priority = 2;
    });
  });
  const accepted = [];
  visible
    .sort(
      (first, second) =>
        second.priority - first.priority ||
        (first.priority > 0 ? second.strength - first.strength : 0) ||
        first.x - second.x ||
        first.dataIndex - second.dataIndex,
    )
    .forEach((point) => {
      const options = point.options;
      const series = point.series || {};
      const text =
        point.text == null
          ? formatReadoutNumber(point.value, options.valueFormatter, {
              units: options.units ?? series.units,
              displayUnits:
                options.displayUnits !== false && series.displayUnits !== false,
              readoutPrecision: options.precision ?? series.readoutPrecision,
              datum: point.datum,
              dataIndex: point.dataIndex,
              seriesType: series.type,
              xValue: point.xValue,
              defaultText: String(point.value),
            })
          : String(point.text);
      if (!text) return;
      const fontSize = isNumeric(options.fontSize)
        ? Math.max(1, Number(options.fontSize))
        : 12;
      const font = `${options.fontWeight ?? 700} ${fontSize}px ${options.fontFamily || 'inherit'}`;
      const dimensions = measureText(text, font);
      const halo = isNumeric(options.haloWidth)
        ? Math.max(0, Number(options.haloWidth))
        : 3;
      const width = dimensions.width + halo;
      const height = dimensions.height + halo;
      const offset = Array.isArray(options.offset) ? options.offset : [0, -10];
      const x = point.x + (isNumeric(offset[0]) ? Number(offset[0]) : 0);
      const y = point.y + (isNumeric(offset[1]) ? Number(offset[1]) : 0);
      const box = {
        left: x - width / 2,
        right: x + width / 2,
        top: y - height,
        bottom: y,
      };
      if (
        options.overflow !== 'allow' &&
        (box.left < bounds.left ||
          box.right > bounds.right ||
          box.top < bounds.top ||
          box.bottom > bounds.bottom)
      )
        return;
      const gap = isNumeric(options.minGap)
        ? Math.max(0, Number(options.minGap))
        : 6;
      if (
        options.collision !== 'allow' &&
        accepted.some((other) => {
          const spacing = Math.max(gap, other.minGap);
          return (
            box.left < other.box.right + spacing &&
            box.right + spacing > other.box.left &&
            box.top < other.box.bottom + spacing &&
            box.bottom + spacing > other.box.top
          );
        })
      )
        return;
      accepted.push({
        ...point,
        text,
        labelX: x,
        labelY: y,
        box,
        minGap: gap,
        fontSize,
      });
    });
  return accepted;
}
