import type { TokenInfo } from "./completionUtils/getTokens";

export const getPrevTokensNoParantheses = (
  prevTokens: TokenInfo[],
  excludeParantheses = false,
) => {
  const pt = structuredClone(prevTokens);
  const prevTokensReversed: typeof prevTokens = [];
  let hasParanthese = 0;
  pt.slice(0)
    .reverse()
    .forEach((t: TokenInfo) => {
      const whiteToken: TokenInfo = {
        ...t,
        type: "white.sql",
        text: " ",
        textLC: " ",
      };

      if (excludeParantheses && t.text === "()") {
        prevTokensReversed.push(whiteToken);
        return;
      }

      /** Monaco includes double parantheses: t.text === "))"  */
      const uniqueText = Array.from(new Set(t.text.split(""))).join("");
      const pushCurrentParantheses = () => {
        t.text.split("").map((text, i) => {
          prevTokensReversed.push({
            ...(excludeParantheses ? whiteToken : { ...t, text }),
            offset: t.offset - i,
            end: t.end - i,
          });
        });
      };
      if (uniqueText === "(" && hasParanthese) {
        hasParanthese--;
        if (!hasParanthese) {
          pushCurrentParantheses();
        }
        return;
      }

      if (uniqueText === ")") {
        hasParanthese++;
        if (hasParanthese === 1) {
          pushCurrentParantheses();
        }
        return;
      }

      const willPush = !hasParanthese ? t : whiteToken;
      prevTokensReversed.push(willPush);
    });
  return prevTokensReversed.slice(0).reverse();
};

export const getTokenNesting = (
  rawTokens: TokenInfo[],
): (TokenInfo & {
  nestingId: string;
  nestingFuncToken: TokenInfo | undefined;
})[] => {
  const startNest = "(";
  const endNest = ")";

  /** Separate grouped tokens */
  const tokens = rawTokens.flatMap((t) => {
    const textChars = t.text.split("");

    const uniqueText = Array.from(new Set(textChars));
    const allTextIsParens = uniqueText.every((tokenChar) =>
      [startNest, endNest].some((v) => v === tokenChar),
    );
    if (allTextIsParens) {
      return textChars.map((text, i) => {
        const offset = t.offset + i;
        return {
          ...t,
          text,
          textLC: text,
          offset,
          end: offset + 1,
        };
      });
    }
    return t;
  });

  let nestingGroupId = 0;
  /** 111 */
  let nestingId = "";
  const nestingFuncTokens: Record<string, TokenInfo | undefined> = {};
  const normalTokens = tokens.map((t, i) => {
    const maybeFuncToken = tokens[i - 2];
    const prevToken = tokens[i - 1];
    if (prevToken?.text === startNest) {
      nestingId += "1";
      nestingFuncTokens[nestingId] = maybeFuncToken;
    }

    if (t.text === endNest) {
      nestingId = nestingId.slice(0, -1);
      if (!nestingId) {
        nestingGroupId++;
      }
    }

    return {
      ...t,
      nestingId,
      nestingFuncToken: nestingFuncTokens[nestingId],
    };
  });

  const funcNests = getFuncNesting(normalTokens);

  return funcNests;
};

const getFuncNesting = (tokensWithNestingId: TokenInfo[]) => {
  const withFuncsTokens = getDollarFunctions(tokensWithNestingId);

  let funcNestingId = "";
  type NestEndMatcher = (t: TokenInfo, i: number) => boolean;
  const matchers = {
    end: (t: TokenInfo, i: number) => {
      return t.textLC === "end";
    },
    loop: (t: TokenInfo, i: number) => {
      return (
        t.textLC === "end" && tokensWithNestingId[i + 1]?.textLC === "loop"
      );
    },
  } satisfies Record<string, NestEndMatcher>;
  const nestMatcher = (t: TokenInfo, i: number): NestEndMatcher | undefined => {
    const prevPrevToken = tokensWithNestingId[i - 2];
    const prevToken = tokensWithNestingId[i - 1];
    if (prevToken?.textLC === "begin") {
      return matchers.end;
    } else if (
      prevToken?.textLC === "loop" &&
      prevPrevToken?.textLC !== "end"
    ) {
      return matchers.loop;
    }

    return undefined;
  };

  let nests: NestEndMatcher[] = [];
  return tokensWithNestingId.map((t, i) => {
    const isInsidefunc = withFuncsTokens.find(
      ({ startIdx, endIdx }) => i >= startIdx + 2 && i <= endIdx - 1,
    );

    if (isInsidefunc) {
      const newNest = nestMatcher(t, i);
      if (newNest) {
        nests.push(newNest);
      } else {
        const lastNest = nests.at(-1);
        const ended = lastNest?.(t, i);
        if (ended) {
          nests = nests.slice(0, -1);
        }
      }

      funcNestingId = "1".repeat(nests.length);

      if (plpgKeywords.includes(t.textLC.toUpperCase())) {
        t.type = "keyword.sql";
      }
    } else {
      funcNestingId = "";
    }

    return {
      ...t,
      funcNestingId: isInsidefunc ? "1" + funcNestingId : "",
    };
  });
};

export const getDollarFunctions = (
  tokens: TokenInfo[],
): { startIdx: number; endIdx: number }[] => {
  const plpgPrecedingKeywords = ["function", "do", "procedure"];
  const result: { startIdx: number; endIdx: number }[] = [];
  tokens.forEach((t, i) => {
    const prevToken = tokens[i - 1];
    if (
      !t.nestingId &&
      t.text.startsWith("$") &&
      prevToken &&
      plpgPrecedingKeywords.includes(prevToken.textLC)
    ) {
      const endIdx = tokens.findIndex(
        (et) => et.text === t.text && et.offset > t.offset,
      );
      if (endIdx > -1) {
        result.push({ startIdx: i, endIdx });
      }
    }
  });
  return result;
};

const plpgKeywords = [
  "ALL",
  "BEGIN",
  "BY",
  "CASE",
  "DECLARE",
  "ELSE",
  "END",
  "EXECUTE",
  "FOR",
  "FOREACH",
  "FROM",
  "IF",
  "IN",
  "INTO",
  "LOOP",
  "NOT",
  "NULL",
  "OR",
  "STRICT",
  "THEN",
  "TO",
  "USING",
  "WHEN",
  "WHILE",
];
