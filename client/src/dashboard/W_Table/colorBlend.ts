const r = Math.round;

function toRGBA(d) {
  const l = d.length;
  const rgba = {};
  if (d.slice(0, 3).toLowerCase() === "rgb") {
    d = d.replace(" ", "").split(",");
    rgba[0] = parseInt(d[0].slice(d[3].toLowerCase() === "a" ? 5 : 4), 10);
    rgba[1] = parseInt(d[1], 10);
    rgba[2] = parseInt(d[2], 10);
    rgba[3] = d[3] ? parseFloat(d[3]) : -1;
  } else {
    if (l < 6)
      d = parseInt(
        String(d[1]) +
          d[1] +
          d[2] +
          d[2] +
          d[3] +
          d[3] +
          (l > 4 ? String(d[4]) + d[4] : ""),
        16,
      );
    else d = parseInt(d.slice(1), 16);
    rgba[0] = (d >> 16) & 255;
    rgba[1] = (d >> 8) & 255;
    rgba[2] = d & 255;
    rgba[3] =
      l === 9 || l === 5 ? r((((d >> 24) & 255) / 255) * 10000) / 10000 : -1;
  }
  return rgba;
}

export function blend(from: string, to: string, perc = 0.5) {
  from = from.trim();
  to = to.trim();
  const b = perc < 0;
  perc = b ? perc * -1 : perc;
  const f = toRGBA(from);
  const t = toRGBA(to);
  if (to[0] === "r") {
    const alpha =
      f[3] > -1 && t[3] > -1 ? r(((t[3] - f[3]) * perc + f[3]) * 10000) / 10000
      : t[3] < 0 ? f[3]
      : t[3];
    return (
      "rgb" +
      (to[3] === "a" ? "a(" : "(") +
      r((t[0] - f[0]) * perc + f[0]) +
      "," +
      r((t[1] - f[1]) * perc + f[1]) +
      "," +
      r((t[2] - f[2]) * perc + f[2]) +
      (f[3] < 0 && t[3] < 0 ? "" : "," + alpha) +
      ")"
    );
  }

  return (
    "#" +
    (
      0x100000000 +
      (f[3] > -1 && t[3] > -1 ? r(((t[3] - f[3]) * perc + f[3]) * 255)
      : t[3] > -1 ? r(t[3] * 255)
      : f[3] > -1 ? r(f[3] * 255)
      : 255) *
        0x1000000 +
      r((t[0] - f[0]) * perc + f[0]) * 0x10000 +
      r((t[1] - f[1]) * perc + f[1]) * 0x100 +
      r((t[2] - f[2]) * perc + f[2])
    )
      .toString(16)
      .slice(f[3] > -1 || t[3] > -1 ? 1 : 3)
  );
}
