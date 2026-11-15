/* Match the first occurrence and keep 30 surrounding characters, like $term_highlight. */
export const getSearchHighlight = (
  value: string,
  term: string,
  matchCase: boolean,
): (string | string[])[] => {
  const matchIndex = (matchCase ? value : value.toLowerCase()).indexOf(
    matchCase ? term : term.toLowerCase(),
  );
  if (!term || matchIndex < 0) return [value];
  const matchEnd = matchIndex + term.length;
  return [
    value.slice(Math.max(0, matchIndex - 30), matchIndex),
    [value.slice(matchIndex, matchEnd)],
    value.slice(matchEnd, matchEnd + 30),
  ];
};
