export const getPdfSearchRanges = (
  pageElement: HTMLDivElement,
  normalizedQuery: string,
) => {
  const walker = document.createTreeWalker(pageElement, NodeFilter.SHOW_TEXT);
  const textNodes: { node: Text; start: number; end: number }[] = [];
  let sourceText = "";
  let textNode: Text | null;

  while ((textNode = walker.nextNode() as Text | null)) {
    if (sourceText) {
      sourceText += " ";
    }

    const start = sourceText.length;
    sourceText += textNode.data;

    textNodes.push({
      node: textNode,
      start,
      end: sourceText.length,
    });
  }

  const { text: searchableText, offsets } =
    normalizeTextWithOffsets(sourceText);
  const ranges: Range[] = [];
  let offset = 0;

  while (offset < searchableText.length) {
    const matchStart = searchableText.indexOf(normalizedQuery, offset);

    if (matchStart === -1) {
      break;
    }

    const matchEnd = matchStart + normalizedQuery.length;
    const sourceStart = offsets[matchStart];
    const sourceEnd = offsets[matchEnd - 1];

    if (sourceStart === undefined || sourceEnd === undefined) {
      offset = matchEnd;
      continue;
    }

    const startNode = textNodes.find(
      ({ start, end }) => sourceStart >= start && sourceStart < end,
    );
    const endNode = textNodes.find(
      ({ start, end }) => sourceEnd >= start && sourceEnd < end,
    );

    if (startNode && endNode) {
      const range = document.createRange();
      range.setStart(startNode.node, sourceStart - startNode.start);
      range.setEnd(endNode.node, sourceEnd - endNode.start + 1);
      ranges.push(range);
    }

    offset = matchEnd;
  }

  return ranges;
};

const normalizeTextWithOffsets = (source: string) => {
  let text = "";
  const offsets: number[] = [];
  let whitespaceOffset: number | undefined;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;

    if (/\s/.test(character)) {
      whitespaceOffset ??= index;
      continue;
    }

    if (whitespaceOffset !== undefined && text) {
      text += " ";
      offsets.push(whitespaceOffset);
    }

    whitespaceOffset = undefined;

    const normalizedCharacter = character.toLocaleLowerCase();

    text += normalizedCharacter;
    offsets.push(
      ...Array.from({ length: normalizedCharacter.length }, () => index),
    );
  }

  return { text, offsets };
};
