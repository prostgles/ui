import type { LineInfo } from "./checkIfInsideDollarFunctionDefinition";

export const checkIfUnfinishedParenthesis = ({
  allLines,
  startLineNumber,
  endLineNumber,
}: {
  startLineNumber: number;
  endLineNumber: number;
  allLines: LineInfo[];
}) => {
  const initialText = allLines
    .filter((l) => l.n >= startLineNumber && l.n <= endLineNumber)
    .map((l) => l.v)
    .join("\n");
  const initialCounts = getCounts(initialText);

  if (initialCounts.diff) {
    let newLineNumber: number | undefined;
    const allowedEmptyLines = 1;
    let emptyLines = 0;
    let { startCount, endCount } = getCounts("");
    const extendStart = initialCounts.extendTo === "start";
    const remainingLines =
      extendStart ?
        allLines.slice(0, startLineNumber).reverse()
      : allLines.slice(endLineNumber);
    remainingLines.forEach((line) => {
      if (emptyLines > allowedEmptyLines) {
        return;
      }
      if (!line.v) {
        emptyLines++;
      }
      const counts = getCounts(line.v);
      startCount += counts.startCount;
      endCount += counts.endCount;
      if (
        extendStart ?
          startCount > 0 && startCount - endCount <= initialCounts.diff
        : endCount > 0 && endCount - startCount <= initialCounts.diff
      ) {
        newLineNumber = line.n;
      }
    });
    if (newLineNumber !== undefined) {
      return extendStart ?
          {
            startLineNumber: newLineNumber,
            endLineNumber,
          }
        : {
            startLineNumber,
            endLineNumber: newLineNumber,
          };
    }
  }

  return undefined;
};

const findEnd = (allLines: LineInfo[]) => {};

const getCounts = (text: string) => {
  const startCount = text.match(/\(/g)?.length ?? 0;
  const endCount = text.match(/\)/g)?.length ?? 0;

  return {
    startCount,
    endCount,
    diff: Math.abs(startCount - endCount),
    extendTo: startCount > endCount ? "end" : "start",
  };
};
