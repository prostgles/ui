import { sliceText } from "@common/utils";
import React from "react";

export type SearchMatch = {
  table: string;
  match: (string | string[])[];
};
type P = {
  matchRow: SearchMatch["match"] | any;
};
export const SearchMatchRow = ({ matchRow }: P) => {
  if (!(matchRow && Array.isArray(matchRow))) {
    return null;
  }

  return (
    <div className="flex-row ws-pre f-1 ">
      {matchRow.map((r, i) => {
        if (typeof r === "string") {
          /** No highlight. Show full row */
          // mxaxWidth: "40%", -> to center the term
          const noRightText = !matchRow[2];
          const style: React.CSSProperties =
            i ?
              { flex: 1 }
            : {
                display: "flex",
                flex: noRightText ? undefined : 1,
                justifyContent: noRightText ? "start" : "end",
              };
          if (matchRow.length === 1) {
            delete style.maxWidth;
            r = sliceText(r.split("\n").join(" "), 25);
          }
          return (
            <span
              key={i}
              style={{
                ...style,
                maxWidth: "fit-content",
              }}
              className={
                "fs-1 min-w-0 text-1 text-ellipsis" + (!i ? " " : " ta-left")
              }
            >
              {r}
            </span>
          );
        } else if (Array.isArray(r) && typeof r[0] === "string") {
          /** Highlight. Show bolded */
          return (
            <strong key={i} className="f-0">
              {r[0]}
            </strong>
          );
        } else {
          console.warn("Unexpected $term_highlight item", r);

          return null;
        }
      })}
    </div>
  );
};
