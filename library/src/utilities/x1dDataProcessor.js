import * as d3 from 'd3';
import store from '../../../../store';

/**
 * This factory function is used to process and visualize data for the x1d plots
 * @param {object} chartObject contains the full data dictionary for a single plot
 * @returns a series of methods that can be used to access the data
 */
const x1dDataProcessor = (chartObject) => {
  // hard coded values for now, maybe want them to be dynamic?
  const xticks = 10;
  // const yticks = 10;

  const formatMinute = d3.timeFormat('%I:%M'); // %I=12 %M=55
  const formatMinuteUTC = d3.timeFormat('%H:%M'); // H=24 %M=55
  const formatHour = d3.timeFormat('%I %p'); // %I=12 %p=pm
  const formatHourUTC = d3.timeFormat('%H UTC'); // %I=15 UTC
  const formatDay = d3.timeFormat('%a %d'); // %a=Wed %d=05

  // extracts values from the individual plots (called getDicInfo in Graph.js)
  const getPlotInfo = (plotId) => {
    const { model, field, data, mems } = chartObject.plots[plotId];
    const element = chartObject.plots[plotId].charttype;
    const yAxisLocation = chartObject.plots[plotId].yaxis;
    return { field, model, data, mems, element, yAxisLocation };
  };

  // returns the full plot object for a single plot
  const getAllPlotInfo = (plotId) => chartObject.plots[plotId];

  // returns the keys of the plots object (ie ['HREF_pw_HRRR -6h_50%_circle', ...])
  const getPlotIds = () => Object.keys(chartObject.plots);

  // returns the unique values of an array
  const getUniqueValues = (array) => [...new Set(array)];

  // loops through all plots to get the unique axis types
  const getAxisTypes = () => {
    const plotIds = getPlotIds();
    //* taking the first index since we are assuming all plots have the same axis types
    const yAxis = getUniqueValues(plotIds.map((key) => chartObject.plots[key].yaxisType))[0];
    const xAxis = getUniqueValues(plotIds.map((key) => chartObject.plots[key].xaxisType))[0];
    return { xAxis, yAxis };
  };

  const isTimeAxis = (axisName) => getAxisTypes()[axisName] === 'scaleTime';

  // this is from Graph.js. Returns an object with the min and max values for each axis.
  // The y axis has a left and right value, which is used for dual y axis plots
  const findAxisRanges = () => {
    const ranges = {
      xMin: null,
      xMax: null,
      yMin: {
        left: null,
        right: null,
      },
      yMax: {
        left: null,
        right: null,
      },
    };

    // loop through plot keys and set the min/max values for the axis
    getPlotIds().forEach((plotId) => {
      const { yAxisLocation } = getPlotInfo(plotId);
      for (const mem in chartObject.plots[plotId].data) {
        const values = chartObject.plots[plotId].data[mem].map((a) => a.value);
        const dates = chartObject.plots[plotId].data[mem].map((a) => a.date);
        const [valuesMin, valuesMax] = d3.extent(values);
        const [datesMin, datesMax] = d3.extent(dates);

        if (!ranges.yMin[yAxisLocation] || valuesMin < ranges.yMin[yAxisLocation])
          ranges.yMin[yAxisLocation] = valuesMin;
        if (!ranges.yMax[yAxisLocation] || valuesMax > ranges.yMax[yAxisLocation])
          ranges.yMax[yAxisLocation] = valuesMax;
        // assuming xAxis for time
        if (isTimeAxis('xAxis')) {
          if (!ranges.xMin || datesMin.getTime() < ranges.xMin.getTime())
            ranges.xMin = new Date(datesMin.getTime());
          if (!ranges.xMax || datesMax.getTime() > ranges.xMax.getTime())
            ranges.xMax = new Date(datesMax.getTime());
        } else {
          if (!ranges.xMin || datesMin < ranges.xMin) ranges.xMin = datesMin;
          if (!ranges.xMax || datesMax > ranges.xMax) ranges.xMax = datesMax;
        }
      }

      // Some charts have set yaxis ranges, set logic here
      const xMin = chartObject.plots[plotId]?.xaxisrange?.[0];
      const xMax = chartObject.plots[plotId]?.xaxisrange?.[1];
      if (xMin != null && ranges.xMin > xMin) ranges.xMin = xMin;
      if (xMax != null && ranges.xMax < xMax) ranges.xMax = xMax;

      // Some charts have set yaxis ranges, set logic here
      const yMin = chartObject.plots[plotId]?.yaxisrange?.[0];
      const yMax = chartObject.plots[plotId]?.yaxisrange?.[1];
      if (yMin != null && ranges.yMin[yAxisLocation] > yMin) ranges.yMin[yAxisLocation] = yMin;
      if (yMax != null && ranges.yMax[yAxisLocation] < yMax) ranges.yMax[yAxisLocation] = yMax;

      // TODO: This needs to be reworked since we are not storing the yAxis scale
      // If the axis is made, and yaxis lock is on, return the current yaxis domain
      // if (
      //     element !== 'pdf' &&
      //     y?.[this.svgid]?.[yAxisLocation] &&
      //     this.chartOptions?.x1dLockYaxis
      // ) {
      //     const [domainMin, domainMax] = y[this.svgid][yAxisLocation].domain();
      //     ranges.yMin[yAxisLocation] = domainMin;
      //     ranges.yMax[yAxisLocation] = domainMax;
      // }

      if (chartObject.extraPadding === true) {
        if (chartObject.yaxisType === 'scaleLog') {
          ranges.yMax[yAxisLocation] *= 1.5;
        } else {
          ranges.yMax[yAxisLocation] *= 1.05;
        }
        ranges.xMax *= 1.05;
      }
    });

    return ranges;
  };

  /**
   * This function loops through all of the plot keys and finds the min and max values. This
   * can be used to set the D3 scale of the domain.
   * @param {string} axisName this is the type of axis, either 'xAxis', 'yAxis'
   * @param {number} length this is the width or height of the graph container, which depends
   * on if you are creating an x or y scale
   * @param {object} margin contains the top, right, bottom, and left margins
   */
  const getAxisScales = (width, height, margin) => {
    // create the axisScale based on axisName and axisType
    const axisTypes = getAxisTypes();
    const axisScales = { xScale: null, yLeftScale: null, yRightScale: null };

    // get the min and max values for the axis
    const { xMin, xMax, yMin, yMax } = findAxisRanges();

    // get d3.range from the axis length and margin values
    // need to know where to start on the canvas coordinates
    const rangeStart = {
      xAxis: margin.left,
      yAxis: height - margin.bottom,
    };
    const rangeEnd = {
      xAxis: width - margin.right,
      yAxis: margin.top,
    };

    // set the xScale
    if (axisTypes.xAxis === 'scaleTime') {
      axisScales.xScale = d3
        .scaleTime()
        .domain([xMin, xMax])
        .range([rangeStart.xAxis, rangeEnd.xAxis]);
    } else if (axisTypes.xAxis === 'scaleLinear') {
      axisScales.xScale = d3
        .scaleLinear()
        .domain([xMin, xMax])
        .range([rangeStart.xAxis, rangeEnd.xAxis]);
    } else {
      throw new Error('Unsupported axis type');
    }

    // set the yScale
    if (axisTypes.yAxis === 'scaleLinear') {
      axisScales.yLeftScale = d3
        .scaleLinear()
        .domain([yMin.left, yMax.left])
        .range([rangeStart.yAxis, rangeEnd.yAxis]);
      // if we have a right scale, add that as well
      axisScales.yRightScale =
        yMin.right !== null
          ? d3
              .scaleLinear()
              .domain([yMin.right, yMax.right])
              .range([rangeStart.yAxis, rangeEnd.yAxis])
          : null;
    } else if (axisTypes.yAxis === 'scaleLog') {
      axisScales.yLeftScale = d3
        .scaleLog()
        .domain([yMin.left, yMax.left])
        .range([rangeStart.yAxis, rangeEnd.yAxis]);
      // if we have a right scale, add that as well
      axisScales.yRightScale =
        yMin.right !== null
          ? d3.scaleLog().domain([yMin.right, yMax.right]).range([rangeStart.yAxis, rangeEnd.yAxis])
          : null;
    } else {
      throw new Error('Unsupported axis type');
    }

    return axisScales;
  };

  const generateDates = (startTime, startDate, timestep) => {
    const dates = [];

    for (let count = 0; count <= xticks; count += 1) {
      if (startTime.getTime() !== startDate.getTime()) {
        // Add date to array unless the startdate and rounded date equal to each other
        dates.push(new Date(startDate));
        // This prevents a date at the edge of the screen
      }
      startDate.setSeconds(startDate.getSeconds() + timestep);
    }

    return dates;
  };

  const roundHoursUp = (date, interval) => {
    // get settings from Redux store
    const { timeZone } = store.getState().settings; // can be local or UTC

    let adjustedDate = new Date(date.getTime());
    if (timeZone === 'UTC') {
      adjustedDate = new Date(
        date.toLocaleString('en-US', {
          timeZone,
        }),
      );
    }
    const minuteDiff = Math.round((adjustedDate - date) / 1000 / 60);

    let rounded;
    if (interval < 3600) {
      // function to handle rounding in seconds
      const coeff = 1000 * interval;
      rounded = new Date(Math.ceil(adjustedDate.getTime() / coeff) * coeff);
    } else if (interval < 86400) {
      // function to handle rounding to nearest 1, 3, 6, 12 hours
      const coeff = interval / 60 / 60;
      rounded = new Date(
        adjustedDate.setHours(Math.ceil(adjustedDate.getHours() / coeff) * coeff, 0, 0),
      );
      // needed otherwise we won't get nice round values
      if (timeZone === 'UTC') {
        rounded = new Date(rounded.getTime() - minuteDiff * 60000);
      }
    } else {
      // if the interval is greater than a day, round to nearest 00 UTC
      const coeff = interval / 60 / 60;
      // Have the day tick marks at 00Z
      if (timeZone === 'UTC') {
        rounded = new Date(
          adjustedDate.setUTCHours(Math.ceil(adjustedDate.getUTCHours() / coeff) * coeff),
        );
      } else {
        // Have the day tick marks at 12am local time
        rounded = new Date(
          adjustedDate.setHours(Math.ceil(adjustedDate.getHours() / coeff) * coeff),
        );
      }
    }
    return rounded;
  };

  const getTickValues = (startTime, endTime) => {
    startTime.setMilliseconds(0);
    const secondDiff = (endTime.getTime() - startTime.getTime()) / 1000;

    let timestep = Math.round(secondDiff / xticks);
    if (timestep <= 60) {
      timestep = 60; // 1 minute, low possible tick marks
    } else if (timestep <= 600) {
      timestep = 600; // 10 minutes
    } else if (timestep <= 3600) {
      timestep = 3600; // 1 hour
    } else if (timestep <= 7200) {
      timestep = 7200; // 2 hour
    } else if (timestep <= 10800) {
      timestep = 10800; // 3 hour
    } else if (timestep <= 21600) {
      timestep = 21600; // 6 hour
    } else if (timestep <= 43200) {
      timestep = 43200; // 12 hour
    } else if (timestep <= 86400) {
      timestep = 86400; // 1 day
    } else if (timestep <= 172800) {
      timestep = 172800; // 2 day
    } else if (timestep <= 259200) {
      timestep = 259200; // 3 day
    } else if (timestep <= 345600) {
      timestep = 345600; // 4 day
    } else {
      timestep = 604800; // 7 day
    }

    // start the fist tick at the nearest starttick hour
    const startDate = roundHoursUp(startTime, timestep);
    const dates = generateDates(startTime, startDate, timestep);
    // remove any dates beyond the end time
    const filteredDates = dates.filter((date) => date <= endTime);
    return filteredDates;
  };

  const getTickLabel = (date, startTime, endTime) => {
    // timezone option
    const { timeZone } = store.getState().settings; // can be local or UTC

    date.setMilliseconds(0); // without this the date comparisons below don't match up
    // change timezone if needed
    let adjustedDate = new Date(date.getTime());
    if (timeZone === 'UTC') {
      adjustedDate = new Date(
        date.toLocaleString('en-US', {
          timeZone,
        }),
      );
    }

    const secondDiff = (endTime.getTime() - startTime.getTime()) / 1000;
    const timestep = Math.round(secondDiff / xticks);

    // series of checks to see how to format the date
    if (timestep < 86400) {
      if (timeZone === 'UTC') {
        if (d3.timeHour(adjustedDate) < adjustedDate) {
          return formatMinuteUTC(adjustedDate);
        }
        if (d3.timeDay(adjustedDate) < adjustedDate) {
          return formatHourUTC(adjustedDate);
        }
        return formatDay(adjustedDate);
      }

      if (d3.timeHour(adjustedDate) < adjustedDate) {
        return formatMinute(adjustedDate);
      }

      if (d3.timeDay(adjustedDate) < adjustedDate) {
        return formatHour(adjustedDate);
      }

      return formatDay(adjustedDate);
    }
    return formatDay(adjustedDate);
  };

  // can limit tick values from [0,0.5,1,1.5,2] to [0,1,2]
  const limitTickValues = (tickValues, axis) => {
    if (chartObject[`${axis}LimitTicks`] !== false) {
      const divideBy = 10 ** chartObject[`${axis}LimitTicks`];
      return tickValues.filter((x) => x % divideBy === 0);
    }
    if (chartObject[`${axis}Values`] !== false) {
      return chartObject[`${axis}Values`];
    }
    return tickValues;
  };

  // If larger than 1000 format.  We can't do all values with this since .1s converts 0.5 to 500m
  // ex: 1000 -> 1K, 1,000,000 -> 1M
  const customTickFormat = (d, log = false) => {
    if (chartObject.yaxisformatting === false) return d;
    // For a log axis, only return the major values 1, 10, 100, 1000, etc
    if (log) {
      const logD = Math.log10(d);
      if (logD % 1 !== 0) return '';
    }

    return d >= 1000 ? d3.format('.1s')(d) : d;
  };

  const getAxisTicks = (axisName, axisScale) => {
    if (!axisScale) return null;
    // this will contain an object for each tick with the values and label
    const tickInfo = [];
    const [domainStart, domainEnd] = axisScale.domain();
    // ScaleTime
    if (isTimeAxis(axisName)) {
      const tickValues = getTickValues(domainStart, domainEnd);
      const tickLables = tickValues.map((date) => getTickLabel(date, domainStart, domainEnd));
      tickValues.forEach((date, index) => {
        tickInfo.push({
          value: date,
          label: tickLables[index],
        });
      });
    } else {
      // ScaleLinear
      // Get the automatic tick values
      // using toLowerCase because the dictionary keys (ie 'xaxis') are all lowercase
      const tickValues = limitTickValues(axisScale.ticks(), axisName.toLowerCase());
      const tickLabels = tickValues.map((value) => customTickFormat(value, true));
      tickValues.forEach((value, index) => {
        tickInfo.push({
          value,
          label: tickLabels[index],
        });
      });
    }

    // return the final array of tick values and labels
    return tickInfo;
  };

  return {
    getAxisTicks,
    getAxisScales,
    getPlotIds,
    getPlotInfo,
    getAllPlotInfo,
  };
};

export default x1dDataProcessor;
