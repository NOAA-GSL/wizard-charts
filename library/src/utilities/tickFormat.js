import { timeFormat, format as d3Format } from 'd3';

// returns a D3 time formatter function bound to `spec`.
// todo: should I add some logic for local vs UTC?
const timeFormatter = (spec = '%Y-%m-%d %H:%M') => timeFormat(spec);

// returns a D3 number formatter function bound to `specifier`.
const numberFormatter = (specifier = '.2s') => d3Format(specifier);

// add any kind of presets here...
const simpleDateHour = () => timeFormatter('%Y-%m-%d %H');

export { timeFormatter, numberFormatter, simpleDateHour };
