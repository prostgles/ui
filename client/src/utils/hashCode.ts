// MurmurHash3 (32-bit) — production-grade, handles large inputs safely
export const hashCode = (str: string, seed = 0) => {
  let h = seed >>> 0;
  let k,
    i = 0;
  const len = str.length;
  const remainder = len & 3;
  const bytes = len - remainder;

  while (i < bytes) {
    k =
      (str.charCodeAt(i) & 0xff) |
      ((str.charCodeAt(i + 1) & 0xff) << 8) |
      ((str.charCodeAt(i + 2) & 0xff) << 16) |
      ((str.charCodeAt(i + 3) & 0xff) << 24);

    k = Math.imul(k, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, 0x1b873593);

    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) >>> 0;

    i += 4;
  }

  k = 0;
  switch (remainder) {
    case 3:
      k ^= (str.charCodeAt(i + 2) & 0xff) << 16;
    /* falls through */
    case 2:
      k ^= (str.charCodeAt(i + 1) & 0xff) << 8;
    /* falls through */
    case 1:
      k ^= str.charCodeAt(i) & 0xff;
      k = Math.imul(k, 0xcc9e2d51);
      k = (k << 15) | (k >>> 17);
      k = Math.imul(k, 0x1b873593);
      h ^= k;
  }

  h ^= len;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;

  return h >>> 0; // unsigned 32-bit integer
};
