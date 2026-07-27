import { useRef } from 'react';
import { area as d3Area, line as d3Line } from 'd3';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { createAccessor, mergeDeep } from '../utilities/dataUtilities';
import { defaultAreaStackedOptions } from '../utilities/defaultOptions';

function toBandStyleValue(value, bandIndex) {
  if (Array.isArray(value)) {
    return value[bandIndex] ?? value[value.length - 1] ?? undefined;
  }
  return value;
}

function toFieldIdFromKey(key) {
  if (typeof key !== 'string') return '';
  const trimmed = key.trim();
  if (!trimmed) return '';

  const segments = trimmed.split('.');
  const lastSegment = segments[segments.length - 1] || trimmed;
  return lastSegment.toLowerCase();
}

function createBandDefinition(band = {}, bandIndex = 0, fallbackOptions = {}) {
  const lowerKey =
    typeof band.lowerKey === 'string' && band.lowerKey.trim().length > 0
      ? band.lowerKey
      : null;
  const upperKey =
    typeof band.upperKey === 'string' && band.upperKey.trim().length > 0
      ? band.upperKey
      : null;

  if (!lowerKey || !upperKey) return null;

  const lowerField = toFieldIdFromKey(lowerKey);
  const upperField = toFieldIdFromKey(upperKey);

  return {
    lowerKey,
    upperKey,
    lowerField,
    upperField,
    lowerLabel:
      typeof band.lowerLabel === 'string' && band.lowerLabel.trim().length > 0
        ? band.lowerLabel.trim()
        : lowerField,
    upperLabel:
      typeof band.upperLabel === 'string' && band.upperLabel.trim().length > 0
        ? band.upperLabel.trim()
        : upperField,
    getLower: createAccessor(lowerKey),
    getUpper: createAccessor(upperKey),
    fill: toBandStyleValue(band.fill ?? fallbackOptions.fill, bandIndex),
    stroke: toBandStyleValue(band.stroke ?? fallbackOptions.stroke, bandIndex),
    strokeWidth: Number.isFinite(Number(band.strokeWidth))
      ? Math.max(0, Number(band.strokeWidth))
      : Math.max(
          0,
          Number(toBandStyleValue(fallbackOptions.strokeWidth, bandIndex)) || 0,
        ),
  };
}

function AreaStacked({ seriesIndex = 0, options = {} }) {
  const finalOptions = mergeDeep(defaultAreaStackedOptions, options);
  const {
    bands,
    className,
    fill,
    isVisible,
    medianIsVisible,
    medianKey,
    medianStroke,
    medianStrokeWidth,
    stroke,
    strokeWidth,
    sx,
  } = finalOptions;

  const { chartValues, getAccessors, getSeriesData, getSeriesScales } =
    useChartHelpers();
  const accessors = getAccessors(seriesIndex);
  const data = getSeriesData(seriesIndex);
  const { xScale, yScale } = getSeriesScales(seriesIndex);

  const isFiniteNumber = (value) => Number.isFinite(Number(value));
  const hasValidX = (datum) => accessors.x(datum) != null;

  const bandDefs = (Array.isArray(bands) ? bands : [])
    .map((band, bandIndex) =>
      createBandDefinition(band, bandIndex, { fill, stroke, strokeWidth }),
    )
    .filter(Boolean);

  let medianAccessor = null;
  if (typeof medianKey === 'string' && medianKey.trim().length > 0) {
    medianAccessor = createAccessor(medianKey);
  } else if (typeof accessors.medianYKey === 'function') {
    medianAccessor = accessors.medianYKey;
  }

  const clipRectRef = useRef(null);
  const medianPathRef = useRef(null);

  useAnimation({
    type: 'revealArea',
    ref: clipRectRef,
    trigger: data,
  });

  useAnimation({
    type: 'drawLine',
    ref: medianPathRef,
    trigger: data,
  });

  if (!xScale || !yScale) return null;

  const bandPaths = bandDefs
    .map((band) => {
      const areaPath = d3Area()
        .defined(
          (datum) =>
            hasValidX(datum) &&
            isFiniteNumber(band.getLower(datum)) &&
            isFiniteNumber(band.getUpper(datum)),
        )
        .x((datum) => xScale(accessors.x(datum)))
        .y0((datum) => yScale(Number(band.getLower(datum))))
        .y1((datum) => yScale(Number(band.getUpper(datum))))(data);

      if (!areaPath) return null;

      return {
        ...band,
        areaPath,
      };
    })
    .filter(Boolean);

  const medianPath =
    medianAccessor && medianIsVisible
      ? d3Line()
          .defined(
            (datum) =>
              hasValidX(datum) && isFiniteNumber(medianAccessor(datum)),
          )
          .x((datum) => xScale(accessors.x(datum)))
          .y((datum) => yScale(Number(medianAccessor(datum))))(data)
      : null;

  if (bandPaths.length === 0 && !medianPath) return null;

  return (
    <g
      className={className}
      style={{ ...sx, visibility: isVisible ? 'visible' : 'hidden' }}
    >
      <defs>
        <clipPath
          id={`area-stacked-clip-${seriesIndex}`}
          clipPathUnits="userSpaceOnUse"
        >
          <rect
            ref={clipRectRef}
            x={chartValues.margin.left}
            y={chartValues.margin.top}
            width={chartValues.innerWidth}
            height={chartValues.innerHeight}
            style={{
              transform: 'scaleX(0)',
              transformOrigin: '0% 50%',
              transformBox: 'fill-box',
            }}
          />
        </clipPath>
      </defs>

      <g clipPath={`url(#area-stacked-clip-${seriesIndex})`}>
        {bandPaths.map((band) => (
          <path
            key={`${band.lowerKey}-${band.upperKey}`}
            d={band.areaPath}
            fill={band.fill ?? 'none'}
            stroke={band.stroke ?? 'none'}
            strokeWidth={band.strokeWidth}
          />
        ))}

        {medianPath && (
          <path
            ref={medianPathRef}
            d={medianPath}
            fill="none"
            stroke={medianStroke}
            strokeWidth={medianStrokeWidth}
          />
        )}
      </g>
    </g>
  );
}

export default AreaStacked;
