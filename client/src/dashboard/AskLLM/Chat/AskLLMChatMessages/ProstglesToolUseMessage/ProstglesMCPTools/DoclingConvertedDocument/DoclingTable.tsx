import React from "react";
import type { DoclintDocument } from "./DoclintDocument";

type PageType = DoclintDocument["pages"][string];

export const DoclingTable = ({
  tables,
  page,
}: Pick<DoclintDocument, "tables"> & {
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

        const tableRect = toCssRect(tableProv.bbox, page);

        return (
          <React.Fragment key={table.self_ref + ":" + tableIdx}>
            <div
              className="show-on-hover"
              title={"Table " + (tableIdx + 1)}
              style={{
                position: "absolute",
                pointerEvents: "none",
                border: "2px solid rgba(0, 123, 255, 0.9)",
                background: "rgba(0, 123, 255, 0.08)",
                ...tableRect,
              }}
            />
            {table.data.table_cells.map((cell, cellIdx) => {
              const cellRect = toCssRect(cell.bbox, page);
              const widthPx = Math.max(1, Number.parseFloat(cellRect.width));
              const heightPx = Math.max(1, Number.parseFloat(cellRect.height));
              const fontSizePx = getEstimatedFontSizePx(cell.text, {
                widthPx,
                heightPx,
              });

              return (
                <div
                  key={table.self_ref + ":cell:" + cellIdx}
                  title={cell.text}
                  className="show-on-hover bg-warning"
                  style={{
                    position: "absolute",
                    overflow: "hidden",
                    whiteSpace: "pre-wrap",
                    textOverflow: "ellipsis",
                    fontSize: `${fontSizePx}px`,
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

const toCssRect = (
  bbox: {
    l: number;
    t: number;
    r: number;
    b: number;
    coord_origin: "BOTTOMLEFT" | "TOPLEFT";
  },
  page: PageType,
) => {
  const { image, size } = page;
  const scaleX = image.size.width / size.width;
  const scaleY = image.size.height / size.height;

  const leftPx = bbox.l * scaleX;
  const widthPx = (bbox.r - bbox.l) * scaleX;

  const isBottomLeft = bbox.coord_origin === "BOTTOMLEFT";
  const topDoc = isBottomLeft ? size.height - bbox.t : bbox.t;
  const bottomDoc = isBottomLeft ? size.height - bbox.b : bbox.b;

  const topPx = topDoc * scaleY;
  const heightPx = (bottomDoc - topDoc) * scaleY;

  return {
    left: leftPx + "px",
    top: topPx + "px",
    width: widthPx + "px",
    height: heightPx + "px",
  };
};
