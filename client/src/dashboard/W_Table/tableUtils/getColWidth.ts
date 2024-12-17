import type { ProstglesTableColumn } from "./getTableCols";
import { _PG_numbers } from "prostgles-types";

export const getColWidth = <
  T extends Pick<ProstglesTableColumn, "tsDataType" | "udt_name" | "width">,
  K extends keyof T,
>(
  cols: T[],
  data: any[] = [],
  key: K,
  windowWidth?: number,
): (T & { width: number })[] => {
  const minCW = 100;
  const maxCW = 300;

  /** If data AND no existing widths then calculate width based on row content length */
  if (!cols.some((c) => Number.isFinite(c.width))) {
    const [firstCol] = cols;
    const tableWidth = windowWidth ?? maxCW;
    if (cols.length === 1 && !_PG_numbers.includes(firstCol?.udt_name as any)) {
      return cols.map((c) => {
        return {
          ...c,
          width: tableWidth - 10,
        };
      });
    }

    let totalAssignedWidth = 0,
      maxCols = 0;
    return cols.map((c, i) => {
      const isLastColumn = i === cols.length - 1;
      let width = 20;

      const widths: Partial<Record<typeof c.udt_name, number>> = {
        uuid: 160,
        geography: 160,
        geometry: 160,
        timestamp: 200,
        bool: 100,
      };
      const tsWidths: Partial<Record<typeof c.tsDataType, number>> = {
        number: 100,
      };

      const fixedWidth = widths[c.udt_name] ?? tsWidths[c.tsDataType];
      if (fixedWidth) {
        // isUsingOnRenderColumn &&
        width = fixedWidth;
      } else {
        data.map((r) => {
          const textContentWidth = JSON.stringify(r[c[key]] || "").length * 8;
          const existingWidth =
            Number.isFinite(c.width) ? c.width! : textContentWidth;
          /** Must be within 100px and 300px */
          width = Math.min(
            Math.max(width, textContentWidth, minCW, existingWidth),
            maxCW,
          );
        });
        if (isLastColumn && !_PG_numbers.includes(c.udt_name as any)) {
          const remainingWidth = tableWidth - totalAssignedWidth;
          if (remainingWidth > 20) {
            width = remainingWidth;
          }
        }
      }
      width = Math.max(width, minCW);
      if (width >= maxCW) maxCols++;

      totalAssignedWidth += width;
      return {
        ...c,
        width,
      };
    });

    // if(windowWidth && windowWidth > totalAssignedWidth && res.length > 2){
    //   const extraPx = windowWidth - totalAssignedWidth - 25;
    //   res = res.map(c => {
    //     c.width ??= 20;
    //     if(maxCols){
    //       if(c.width >= maxCW){
    //         c.width += extraPx/maxCols;
    //       }
    //     } else {
    //       c.width += extraPx/res.length;
    //     }

    //     return c;
    //   })
    // }
  }

  /** If free space then extend last column to fill it */
  // if(windowWidth){
  //   let _totalAssignedWidth = 0;
  //   res.forEach(({ width }) => {
  //     _totalAssignedWidth += width ?? 0;
  //   });
  //   if(_totalAssignedWidth < windowWidth && res.length){
  //     const newLastColWidth = windowWidth - 150 - _totalAssignedWidth;
  //     res.at(-1)!.width = Math.max(res.at(-1)!.width ?? 0, newLastColWidth)
  //   }
  // }

  return cols as any;
};
