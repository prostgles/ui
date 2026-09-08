import React from "react";
import type { DoclingDocument } from "./DoclingDocument";

type PageType = DoclingDocument["pages"][string];

export const DoclingTable = ({
  tables,
  page,
}: Pick<DoclingDocument, "tables"> & {
  page: PageType;
}) => {
  const pageNo = page.page_no;

  const pageTables = tables.filter((tbl) =>
    tbl.prov.some((p) => p.page_no === pageNo),
  );

  return (
    <>
      {pageTables.map((table, tableIdx) => {
        const tableProv = table.prov.find((p) => p.page_no === pageNo);
        if (!tableProv) return null;

        const tableRect = toCssRect(tableProv.bbox, page, "");
        const { image } = table;
        return (
          <React.Fragment key={table.self_ref + ":" + tableIdx}>
            <div
              className={image ? "show-on-hover " : ""}
              title={"Table " + (tableIdx + 1)}
              style={{
                position: "absolute",
                pointerEvents: "none",
                outline: "2px solid rgba(0, 123, 255, 0.9)",
                background: "rgba(0, 123, 255, 0.08)",
                ...tableRect,
              }}
            />
            {table.data.table_cells.map((cell, cellIdx) => {
              const cellRect = toCssRect(cell.bbox, page, cell.text);

              return (
                <div
                  key={table.self_ref + ":cell:" + cellIdx}
                  title={cell.text}
                  className={
                    (image ? "show-on-hover " : "") + " ta-start bg-warning"
                  }
                  style={{
                    position: "absolute",
                    overflow: "hidden",
                    whiteSpace: "pre-wrap",
                    textOverflow: "ellipsis",
                    lineHeight: 1.2,
                    ...cellRect,
                  }}
                >
                  {cell.text}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};

const getEstimatedFontSizePx = (
  text: string,
  rect: { widthPx: number; heightPx: number },
) => {
  const lines = text.split("\n");
  const lineCount = Math.max(lines.length, 1);
  const longestLine = Math.max(...lines.map((l) => l.length), 1);

  // Rough character width ~= 0.55em, line height ~= 1.2em
  const byWidth = rect.widthPx / (longestLine * 0.55);
  const byHeight = rect.heightPx / (lineCount * 1.2);

  return Math.max(7, Math.min(22, Math.min(byWidth, byHeight)));
};

// const toCssRect = (
//   bbox: {
//     l: number;
//     t: number;
//     r: number;
//     b: number;
//     coord_origin: "BOTTOMLEFT" | "TOPLEFT";
//   },
//   page: PageType,
//   text: string,
// ) => {
//   const { image, size } = page;
//   const displaySize = image?.size ?? size;
//   const scaleX = displaySize.width / size.width;
//   const scaleY = displaySize.height / size.height;

//   const leftPx = bbox.l * scaleX;
//   const widthPx = Math.max(1, (bbox.r - bbox.l) * scaleX);

//   const isBottomLeft = bbox.coord_origin === "BOTTOMLEFT";
//   const topDoc = isBottomLeft ? size.height - bbox.t : bbox.t;
//   const bottomDoc = isBottomLeft ? size.height - bbox.b : bbox.b;

//   const topPx = topDoc * scaleY;
//   const heightPx = Math.max(1, (bottomDoc - topDoc) * scaleY);
//   const fontSizePx = getEstimatedFontSizePx(text, {
//     widthPx,
//     heightPx,
//   });
//   const fontSize = `${fontSizePx}px`;

//   return {
//     left: leftPx + "px",
//     top: topPx + "px",
//     width: widthPx + "px",
//     height: heightPx + "px",
//     fontSize,
//   };
// };

const toCssRect = (
  bbox: {
    l: number;
    t: number;
    r: number;
    b: number;
    coord_origin: "BOTTOMLEFT" | "TOPLEFT";
  },
  page: PageType,
  text: string,
) => {
  const { image, size } = page;
  const displaySize = image?.size ?? size;
  const scaleX = displaySize.width / size.width;
  const scaleY = displaySize.height / size.height;

  const leftPx = bbox.l * scaleX;
  const widthPx = (bbox.r - bbox.l) * scaleX;

  const isBottomLeft = bbox.coord_origin === "BOTTOMLEFT";
  const topDoc = isBottomLeft ? size.height - bbox.t : bbox.t;
  const bottomDoc = isBottomLeft ? size.height - bbox.b : bbox.b;
  const topPx = topDoc * scaleY;
  const heightPx = (bottomDoc - topDoc) * scaleY;

  return {
    left: `${(leftPx * 100) / displaySize.width}%`,
    top: `${(topPx * 100) / displaySize.height}%`,
    width: `${(widthPx * 100) / displaySize.width}%`,
    height: `${(heightPx * 100) / displaySize.height}%`,
    widthPx,
    heightPx,
    fontSize: `${
      (getEstimatedFontSizePx(text, {
        widthPx,
        heightPx,
      }) *
        100) /
      displaySize.width
    }cqw`,
    borderWidth: `${200 / displaySize.width}cqw`,
  };
};
