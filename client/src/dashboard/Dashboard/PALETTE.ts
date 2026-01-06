import { fromEntries, getEntries } from "@common/utils";

const getRandomElement = <Arr>(
  items: Arr[],
): { elem: Arr | undefined; index: number } => {
  const randomIndex = Math.floor(Math.random() * items.length);
  return { elem: items[randomIndex], index: randomIndex };
};

export const PALETTE = fromEntries(
  getEntries({
    c1: [0, 129, 167],
    c2: [240, 113, 103],
    c3: [58, 134, 255],
    c4: [131, 56, 236],
    c5: [203, 149, 0],
  } satisfies Record<string, [number, number, number]>).map(([key, rgb]) => [
    key,
    {
      getStr: (opacity = 1) => `rgba(${[...rgb, opacity].join(", ")})`,
      getDeckRGBA: (opacity = 1) =>
        [...rgb, Math.round(opacity * 255)] as [number, number, number, number],
    },
  ]),
);

export const getRandomColor = (
  opacity = 1,
  usedColors?: number[][],
): number[] => {
  const results = Object.values(PALETTE).map((p) => p.getDeckRGBA(opacity));
  const nonUsedColors = results.filter(
    (c) => !usedColors?.some((uc) => uc.join() === c.join()),
  );
  return getRandomElement(nonUsedColors).elem ?? results[0]!;
};
