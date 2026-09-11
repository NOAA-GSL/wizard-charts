import { timeFormat, utcFormat, format as d3Format } from 'd3';

// returns a D3 time formatter function bound to `spec`.
const timeFormatter = (spec = '%Y-%m-%d %H:%M') => timeFormat(spec);

// returns a D3 UTC time formatter function bound to `spec`.
const utcTimeFormatter = (spec = '%Y-%m-%d %H:%MZ') => utcFormat(spec);

// returns a D3 number formatter function bound to `specifier`.
const numberFormatter = (specifier = '.2s') => d3Format(specifier);

// add any kind of presets here...
const simpleDateHour = () => timeFormatter('%Y-%m-%d %H');
const simpleDateHourUTC = () => utcTimeFormatter('%Y-%m-%d %HZ');

export {
  timeFormatter,
  utcTimeFormatter,
  numberFormatter,
  simpleDateHour,
  simpleDateHourUTC,
};
