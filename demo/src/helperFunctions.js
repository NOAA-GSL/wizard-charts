export const generateRandomData = ({
  numPoints = 10000,
  minValue = 0,
  maxValue = 100,
  variance = 1,
  members = 1,
} = {}) => {
  // generates random data in the form [{ date: number, value: number }, ...]
  const makeData = () => {
    const data = [];
    let currentY = Math.random() * (maxValue - minValue) + minValue;

    for (let i = 0; i < numPoints; i++) {
      data.push({ date: i, value: currentY });
      const randomStep = (Math.random() * 2 - 1) * variance;
      currentY = Math.min(Math.max(currentY + randomStep, minValue), maxValue);
    }

    return data;
  };

  if (members === 1) {
    return makeData();
  } else {
    const finalData = [];

    for (let i = 0; i < members; i++) {
      finalData.push(makeData());
    }

    return finalData;
  }
};

export const dataVizColors = {
  'sea-green': '#0FB5AE',
  'palatinate-blue': '#4046CA',
  tangerine: '#F68511',
  magenta: '#DE3D82',
  'tropical-indigo': '#7E84FA',
  malachite: '#72E06A',
  azure: '#147AF3',
  violet: '#7326D3',
  yellow: '#E8C600',
  'alloy-orange': '#CB5D00',
  green: '#008F5D',
  lime: '#BCE931',
};
