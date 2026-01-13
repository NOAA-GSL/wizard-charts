import { getTextDimensions } from '../ProbGraphics/x1dProbConfig';

const LEGEND_CONSTANTS = {
    FONT_SIZE: 10,
    GAP: 20,
};

function X1dLegend({ x1dData, width, height, margin }) {
    const plotIds = x1dData.getPlotIds();

    //* I am probably going to need to loop through the keys and get the legend type for each plot
    //* Then there will need to be logic to determine if it is already present on the legend
    //* Perhaps I create an array that holds the 'field' attribute. If the field is present,
    //* then I don't add it to the legend.
    const legendFields = [];

    const colorbarLegendStrings = [];
    const legendItemsToRender = [];

    plotIds.forEach((plotId) => {
        const { field, model, mems, element } = x1dData.getPlotInfo(plotId);

        // if the field exists in the legend, then we don't need to add it
        if (legendFields.includes(field)) return;

        // otherwise add the field to the array
        legendFields.push(field);

        // TODO: we'll need to add logic for a chicklet chart

        let legendType;
        let elementOption;

        // set the legend type based on the element
        switch (element) {
            case 'areafill':
            case 'area':
            case 'box':
            case 'bar':
                legendType = 'rect';
                break;
            case 'boxmedian':
            case 'line':
                legendType = 'line';
                elementOption = 'horizontal';
                break;
            case 'boxwhisker':
                legendType = 'line';
                elementOption = 'vertical';
                break;
            default:
                legendType = null;
                elementOption = null;
        }

        console.log('legendType:', legendType);
        console.log('elementOption:', elementOption);

        // this returns all the color and other extra plot info for the specific id
        const allPlotInfo = x1dData.getAllPlotInfo(plotId);
        console.log('allPlotInfo:', allPlotInfo);
        const colorbarLegend = allPlotInfo.colorbar_legend;
        colorbarLegendStrings.push(colorbarLegend);

        switch (legendType) {
            case 'rect':
                legendItemsToRender.push(
                    <g>
                        <rect key={field} width={10} height={10} fill={allPlotInfo.color} />
                        <text x={1} y={1} fill="white">
                            {colorbarLegend}
                        </text>
                    </g>,
                );
                break;
            case 'line':
                legendItemsToRender.push(
                    <g>
                        <line
                            key={field}
                            strokeWidth={3}
                            x1={0}
                            x2={15}
                            y1={7.5}
                            y2={7.5}
                            stroke={allPlotInfo.color}
                        />
                        <text alignmentBaseline="hanging" x={17} y={0}>
                            {colorbarLegend}
                        </text>
                    </g>,
                );
                break;
            case 'circle':
                legendItemsToRender.push(
                    <circle
                        key={field}
                        cx={width - margin.right + 5}
                        cy={height - margin.bottom + 5}
                        r={5}
                        fill={allPlotInfo.color}
                    />,
                );
                break;
            default:
                break;
        }
    });

    const translateXPositions = [0];
    colorbarLegendStrings.forEach((legendString, index) => {
        const cumulativeWidth = colorbarLegendStrings
            // note: using index + 2 instead of 1 because the translateXPositions array starts with 0
            .slice(0, index + 2)
            .reduce(
                (acc) =>
                    acc +
                    getTextDimensions(legendString, `${LEGEND_CONSTANTS.FONT_SIZE}px Open Sans`)
                        .width +
                    LEGEND_CONSTANTS.GAP,
                0,
            );
        translateXPositions.push(cumulativeWidth);
    });
    console.log('translateXPositions:', translateXPositions);

    return (
        <g className="x1d-legend">
            {legendItemsToRender.map((legendItem, index) => (
                <g key={index} transform={`translate(${translateXPositions[index]}, 0)`}>
                    {legendItem}
                </g>
            ))}
        </g>
    );
}

export default X1dLegend;
