import { sliceText } from "@common/utils";
import { Icon } from "@components/Icon/Icon";
import { SvgIcon } from "@components/SvgIcon";
import { mdiTable, mdiTableEdit } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React from "react";

export type SearchMatch = {
  table: string;
  match: (string | string[])[];
};
type P = {
  matchRow: SearchMatch["match"] | null;
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

export const SearchMatchRowWithTable = ({
  icon,
  db,
  match,
}: {
  icon: string | undefined;
  match: SearchMatch;
  db: DBHandlerClient;
}) => {
  return (
    <div className="f-1 flex-row ai-start" title="Open table">
      <div className="flex-col ai-start f-0 text-1">
        {icon ?
          <SvgIcon icon={icon} />
        : <Icon path={db[match.table]?.insert ? mdiTableEdit : mdiTable} />}
      </div>
      <div className="flex-col ai-start f-1">
        <div className="font-18">{match.table}</div>
        <div
          style={{
            fontSize: "16px",
            opacity: 0.7,
            textAlign: "left",
            width: "100%",
            marginTop: ".25em",
          }}
          // className={!mode ? "text-2" : ""}
        >
          <SearchMatchRow matchRow={match.match} />
        </div>
      </div>
    </div>
  );
};
