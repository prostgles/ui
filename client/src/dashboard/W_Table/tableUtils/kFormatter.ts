export const kFormatter = (num: number) => {
  const abs = Math.abs(num);
  if (abs > 1e12 - 1)
    return Math.sign(num) * +(Math.abs(num) / 1e12).toFixed(1) + " T";
  if (abs > 1e9 - 1)
    return Math.sign(num) * +(Math.abs(num) / 1e9).toFixed(1) + " B";
  if (abs > 1e6 - 1)
    return Math.sign(num) * +(Math.abs(num) / 1e6).toFixed(1) + " m";
  if (abs > 999)
    return Math.sign(num) * +(Math.abs(num) / 1000).toFixed(1) + " k";
  return num.toString();
};
