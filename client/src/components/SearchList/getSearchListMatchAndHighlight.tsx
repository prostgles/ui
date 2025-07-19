import React from "react";

export const getSearchListMatchAndHighlight = (args: {
  ranking?: number;
  term: string;
  text: string;
  key?: any;
  subLabel?: string;
  matchCase?: boolean;
  style?: React.CSSProperties;
  subLabelStyle?: React.CSSProperties;
  rootStyle?: React.CSSProperties;
}): { node: React.ReactNode; rank: number } => {
  const getNode = (r: {
    ranking?: number;
    term: string;
    text: string;
    key?: any;
    isSublabel?: boolean;
    matchCase?: boolean;
    style?: React.CSSProperties;
  }) => {
    const { term, text, key, isSublabel = false, matchCase = false } = r;
    const style: React.CSSProperties =
        !isSublabel ?
          {
            fontSize: "18px",
            fontWeight: term ? undefined : 500,
          }
        : {
            fontSize: "14px",
            marginTop: ".25em",
          },
      rootColorClass = isSublabel ? `SubLabel text-1` : `text-0`;

    const rootStyle = { whiteSpace: "normal", ...style, ...r.style };
    let rank = 0,
      label = text || "";
    const noTermLabel =
      isSublabel ? label.split("\n").slice(0, 3).join("\n") : label;
    let node = (
      <span className={rootColorClass + ` text-ellipsis`} style={rootStyle}>
        {noTermLabel}
      </span>
    );
    if (term) {
      const lbl = matchCase ? label : label.toLowerCase(),
        strm = matchCase ? term : term.toLowerCase();
      let idx = lbl.indexOf(strm);

      rank = r.ranking ?? idx;
      if (idx > -1) {
        let prevLines: string[] | undefined;
        let nextLines: string[] | undefined;
        if (isSublabel) {
          const lines = label.split("\n");
          const matchingLineIdx = lines.findIndex((l) =>
            matchCase ?
              l.includes(term)
            : l.toLowerCase().includes(term.toLowerCase()),
          );
          label = lines[matchingLineIdx] ?? "";
          idx =
            matchCase ?
              label.indexOf(term)
            : label.toLowerCase().indexOf(term.toLowerCase());

          if (matchingLineIdx > 2) {
            prevLines = lines.slice(matchingLineIdx - 2, matchingLineIdx - 1);
          }
          nextLines = lines.slice(matchingLineIdx + 1, matchingLineIdx + 2);
        } else {
          /** Join lines into one */
          label = label.split("\n").join(" ");
        }
        const shortenText = label.length > 40;
        node = (
          <div
            className="MatchRoot flex-col  f-1"
            style={rootStyle}
            title={text}
          >
            {prevLines !== undefined && prevLines.length > 0 && (
              <span className="f-0 text-2 text-ellipsis">
                {prevLines.join("\n")}
              </span>
            )}
            <div
              className="MatchRow flex-row f-1"
              style={{ whiteSpace: "normal" }}
            >
              <div
                className={`${shortenText ? "f-1" : "f-0"} search-text-endings text-ellipsis`}
                style={{ maxWidth: "fit-content" }}
              >
                <span>{label.slice(0, idx)}</span>
                <strong className="f-0 search-text-match">
                  {label.slice(idx, idx + strm.length)}
                </strong>
                <span>{label.slice(idx + strm.length)}</span>
              </div>
            </div>
            {nextLines !== undefined && nextLines.length > 0 && (
              <span className="f-0 text-2 text-ellipsis">
                {nextLines.join("\n")}
              </span>
            )}
          </div>
        );
      } else {
        rank = Infinity;
      }
    }

    if (!label) {
      if (key === "") node = <i>[Empty]</i>;
      if (key === null) node = <i>[NULL]</i>;
    }

    return { rank, node };
  };

  const {
    term,
    text,
    key,
    subLabel,
    matchCase,
    style,
    subLabelStyle,
    rootStyle,
    ranking,
  } = args;
  const node1 = getNode({ term, text, key, matchCase, style, ranking });

  const result = node1;
  if (subLabel) {
    const node2 = getNode({
      term,
      text: subLabel,
      key: subLabel,
      isSublabel: true,
      matchCase,
      style: subLabelStyle,
      ranking: 1,
    });
    result.node = (
      <div className="flex-col f-1" style={rootStyle}>
        {node1.node}
        {node2.node}
      </div>
    );
    let rank = Math.min(node1.rank, node2.rank + 5);
    if (node1.rank !== Infinity && node2.rank !== Infinity) {
      rank /= 2;
    }
    result.rank = rank;
  }
  return result;
};
