import React from "react";
import type { DoclintDocument } from "./DoclintDocument";

export const DoclingText = ({
  texts,
  page: { page_no, image, size },
}: Pick<DoclintDocument, "texts"> & {
  page: DoclintDocument["pages"][string];
}) => {
  const pageTextItems = texts.filter((t) =>
    t.prov.find((p) => p.page_no === page_no),
  );
  return (
    <>
      {pageTextItems.map((textItem, idx) => {
        const prov = textItem.prov.find((p) => p.page_no === page_no);
        if (!prov) return null;
        const { l, t, r, b, coord_origin } = prov.bbox;
        const scaleX = image.size.width / size.width;
        const scaleY = image.size.height / size.height;

        const left = `${l * scaleX}px`;
        const width = `${(r - l) * scaleX}px`;

        const isBottomLeft = coord_origin === "BOTTOMLEFT";

        // Convert document-space top/bottom into CSS top-origin space
        const topDoc = isBottomLeft ? size.height - t : t;
        const bottomDoc = isBottomLeft ? size.height - b : b;

        const top = `${topDoc * scaleY}px`;
        const height = `${(bottomDoc - topDoc) * scaleY}px`;

        const widthPx = (r - l) * scaleX;
        const heightPx = (bottomDoc - topDoc) * scaleY;
        const fontSizePx = getEstimatedFontSizePx(
          textItem.text,
          Math.max(1, widthPx),
          Math.max(1, heightPx),
        );
        return (
          <div
            key={idx}
            title={textItem.orig}
            className="show-on-hover bg-warning text-ellipsis"
            style={{
              whiteSpace: "pre-wrap",
              position: "absolute",
              top,
              left,
              width,
              height,
              fontSize: fontSizePx + "px",
              lineHeight: 1.2,
            }}
          >
            {textItem.text}
          </div>
        );
      })}
    </>
  );
};

const getEstimatedFontSizePx = (
  text: string,
  widthPx: number,
  heightPx: number,
) => {
  const lines = text.split("\n");
  const lineCount = Math.max(lines.length, 1);
  const longestLine = Math.max(...lines.map((l) => l.length), 1);

  const byWidth = widthPx / (longestLine * 0.55);
  const byHeight = heightPx / (lineCount * 1.2);

  return Math.max(7, Math.min(22, Math.min(byWidth, byHeight)));
};
