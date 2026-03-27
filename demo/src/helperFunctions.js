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
