import { useRef } from 'react';
import { area as d3Area, line as d3Line } from 'd3';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultAreaOptions } from '../utilities/defaultOptions';

function Area({ seriesIndex = 0, options = {} }) {
  const finalOptions = mergeDeep(defaultAreaOptions, options);
  const { fill, isVisible, stroke, strokeWhisker, strokeWidth, className, sx } =
    finalOptions;

  const { chartValues, xScale, yScale, getAccessors } = useChartHelpers();
  const accessors = getAccessors(seriesIndex);
  const data = chartValues.data || [];

  const isFiniteNumber = (value) => Number.isFinite(Number(value));
  const getLowerY = (d) =>
    accessors.q1YKey ? accessors.q1YKey(d) : accessors.y(d);
  const getUpperY = (d) =>
    accessors.q3YKey ? accessors.q3YKey(d) : accessors.y(d);
  const hasValidX = (d) => accessors.x(d) != null;
  const hasValidLowerPoint = (d) =>
    hasValidX(d) && isFiniteNumber(getLowerY(d));
  const hasValidUpperPoint = (d) =>
    hasValidX(d) && isFiniteNumber(getUpperY(d));
  const hasValidBandPoint = (d) =>
    hasValidLowerPoint(d) && hasValidUpperPoint(d);

  // clip rect ref will be animated to reveal the area left-to-right
  const clipRectRef = useRef(null);
  const whiskerRef = useRef(null);

  // area generator: fallback to primary y if q1/q3 missing
  const areaGen = d3Area()
    .defined(hasValidBandPoint)
    .x((d) => xScale(accessors.x(d)))
    .y0((d) => yScale(Number(getLowerY(d))))
    .y1((d) => yScale(Number(getUpperY(d))));

  const areaPath = areaGen(data);

  // animation for the area chart
  useAnimation({
    type: 'revealArea',
    ref: clipRectRef,
    trigger: data,
  });

  // animate whiskers as lines, will reveal left to right inside the clip path
  useAnimation({
    type: 'drawLines',
    ref: whiskerRef,
    trigger: data,
  });

  return (
    <g
      className={className}
      style={{ ...sx, visibility: isVisible ? 'visible' : 'hidden' }}
    >
      {areaPath && (
        <>
          <defs>
            <clipPath
              id={`area-clip-${seriesIndex}`}
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

          <g clipPath={`url(#area-clip-${seriesIndex})`}>
            {/* area, filled but no stroke */}
            <path d={areaPath} fill={fill} stroke="none" />

            {/* top and bottom edges drawn as separate lines so strokes are clipped to the area bounds */}
            {(() => {
              const topLine = d3Line()
                .defined(hasValidUpperPoint)
                .x((d) => xScale(accessors.x(d)))
                .y((d) => yScale(Number(getUpperY(d))))(data);
              const bottomLine = d3Line()
                .defined(hasValidLowerPoint)
                .x((d) => xScale(accessors.x(d)))
                .y((d) => yScale(Number(getLowerY(d))))(data);
              return (
                <g>
                  {topLine && (
                    <path
                      d={topLine}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                    />
                  )}
                  {bottomLine && (
                    <path
                      d={bottomLine}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                    />
                  )}
                </g>
              );
            })()}
            {/* whiskers (min/max) - placed inside clip so they reveal with area */}
            <g ref={whiskerRef}>
              {data.filter(hasValidBandPoint).map((dataPoint) => {
                const cx = xScale(accessors.x(dataPoint));

                const yTop = yScale(Number(getUpperY(dataPoint)));
                const yBottom = yScale(Number(getLowerY(dataPoint)));

                const maxVal = accessors.maxYKey
                  ? accessors.maxYKey(dataPoint)
                  : undefined;
                const minVal = accessors.minYKey
                  ? accessors.minYKey(dataPoint)
                  : undefined;

                return (
                  <g key={accessors.x(dataPoint)}>
                    {isFiniteNumber(maxVal) && (
                      <line
                        x1={cx}
                        x2={cx}
                        y1={yTop}
                        y2={yScale(Number(maxVal))}
                        stroke={strokeWhisker || 'currentColor'}
                        strokeWidth={strokeWidth || 1}
                      />
                    )}
                    {isFiniteNumber(minVal) && (
                      <line
                        x1={cx}
                        x2={cx}
                        y1={yBottom}
                        y2={yScale(Number(minVal))}
                        stroke={strokeWhisker || 'currentColor'}
                        strokeWidth={strokeWidth || 1}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        </>
      )}
    </g>
  );
}

export default Area;
