import { useRef } from 'react';
import { area as d3Area, line as d3Line } from 'd3';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import {
  defaultAreaOptions,
  defaultLineOptions,
} from '../utilities/defaultOptions';

function Area({ seriesIndex = 0, options = {} }) {
  const finalOptions = mergeDeep(defaultAreaOptions, options);
  const { fill, stroke, className, sx } = finalOptions;

  const { chartValues, xScale, yScale, getAccessors } = useChartHelpers();
  const accessors = getAccessors(seriesIndex);

  // clip rect ref will be animated to reveal the area left-to-right
  const clipRectRef = useRef(null);
  const whiskerRef = useRef(null);

  // area generator: fallback to primary y if q1/q3 missing
  const areaGen = d3Area()
    .x((d) => xScale(accessors.x(d)))
    .y0((d) => yScale(accessors.q1YKey ? accessors.q1YKey(d) : accessors.y(d)))
    .y1((d) => yScale(accessors.q3YKey ? accessors.q3YKey(d) : accessors.y(d)));

  const areaPath = areaGen(chartValues.data);

  // animation for the area chart
  useAnimation({
    type: 'revealArea',
    ref: clipRectRef,
    trigger: chartValues.data,
  });

  // animate whiskers as lines, will reveal left to right inside the clip path
  useAnimation({
    type: 'drawLines',
    ref: whiskerRef,
    trigger: chartValues.data,
  });

  return (
    <g className={className} style={sx}>
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
                .x((d) => xScale(accessors.x(d)))
                .y((d) =>
                  yScale(
                    accessors.q3YKey ? accessors.q3YKey(d) : accessors.y(d),
                  ),
                )(chartValues.data);
              const bottomLine = d3Line()
                .x((d) => xScale(accessors.x(d)))
                .y((d) =>
                  yScale(
                    accessors.q1YKey ? accessors.q1YKey(d) : accessors.y(d),
                  ),
                )(chartValues.data);
              const lineStroke = stroke || defaultLineOptions.stroke;
              const lineStrokeWidth = defaultLineOptions.strokeWidth;
              return (
                <g>
                  {topLine && (
                    <path
                      d={topLine}
                      fill="none"
                      stroke={lineStroke}
                      strokeWidth={lineStrokeWidth}
                    />
                  )}
                  {bottomLine && (
                    <path
                      d={bottomLine}
                      fill="none"
                      stroke={lineStroke}
                      strokeWidth={lineStrokeWidth}
                    />
                  )}
                </g>
              );
            })()}
            {/* whiskers (min/max) - placed inside clip so they reveal with area */}
            <g ref={whiskerRef}>
              {chartValues.data.map((dataPoint) => {
                const cx = xScale(accessors.x(dataPoint));

                const q3Val = accessors.q3YKey
                  ? accessors.q3YKey(dataPoint)
                  : accessors.y(dataPoint);
                const q1Val = accessors.q1YKey
                  ? accessors.q1YKey(dataPoint)
                  : accessors.y(dataPoint);
                const yTop = yScale(q3Val);
                const yBottom = yScale(q1Val);

                const maxVal = accessors.maxYKey
                  ? accessors.maxYKey(dataPoint)
                  : undefined;
                const minVal = accessors.minYKey
                  ? accessors.minYKey(dataPoint)
                  : undefined;

                return (
                  <g key={accessors.x(dataPoint)}>
                    {typeof maxVal !== 'undefined' && (
                      <line
                        x1={cx}
                        x2={cx}
                        y1={yTop}
                        y2={yScale(maxVal)}
                        stroke={stroke || 'currentColor'}
                        strokeWidth={1}
                      />
                    )}
                    {typeof minVal !== 'undefined' && (
                      <line
                        x1={cx}
                        x2={cx}
                        y1={yBottom}
                        y2={yScale(minVal)}
                        stroke={stroke || 'currentColor'}
                        strokeWidth={1}
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
