import type { ProstglesTableColumn } from "./getTableCols";
import { _PG_numbers, includes } from "prostgles-types";

const minColumnWidth = 100;
const maxColumnWidth = 300;

export const getColWidth = <
  T extends Pick<
    ProstglesTableColumn,
    "tsDataType" | "udt_name" | "width" | "nested"
  >,
  K extends keyof T,
>(
  cols: T[],
  data: any[] = [],
  key: K,
  windowWidth?: number,
): (T & { width: number })[] => {
  /** If data AND no existing widths then calculate width based on row content length */
  const someColumnHasWidth = cols.some((c) => Number.isFinite(c.width));
  if (someColumnHasWidth) {
    return cols as (T & { width: number })[];
  }

  const [firstCol] = cols;
  const tableWidth = windowWidth ?? maxColumnWidth;
  if (cols.length === 1 && !includes(_PG_numbers, firstCol?.udt_name)) {
    return cols.map((c) => {
      return {
        ...c,
        width: tableWidth - 10,
      };
    });
  }

  let assignedColumnWidth = 0;
  return cols.map((c, i) => {
    const isLastColumn = i === cols.length - 1;
    let width = 20;

    const udtNameWidths: Partial<Record<typeof c.udt_name, number>> = {
      uuid: 160,
      geography: 160,
      geometry: 160,
      timestamp: 200,
      bool: 100,
    };
    const tsWidths: Partial<Record<typeof c.tsDataType, number>> = {
      number: 100,
    };

    const fixedWidth = udtNameWidths[c.udt_name] ?? tsWidths[c.tsDataType];
    if (fixedWidth) {
      width = fixedWidth;
    } else {
      data.map((r) => {
        const data = r[c[key]];
        const dataIsSingleNestedColumnSoMustExcludePropertyNames =
          c.nested?.columns.filter((nc) => nc.show).length === 1 &&
          !c.nested.chart &&
          Array.isArray(data);
        const dataAsString = JSON.stringify(
          dataIsSingleNestedColumnSoMustExcludePropertyNames ?
            Object.values(data[0] ?? {})
          : data || "",
        );
        const textContentWidth =
          (dataAsString.length -
            (dataIsSingleNestedColumnSoMustExcludePropertyNames ? 0 : 0)) *
          8;

        const existingWidth =
          Number.isFinite(c.width) ? c.width! : textContentWidth;
        /** Must be within 100px and 300px */
        width = Math.min(
          Math.max(width, textContentWidth, minColumnWidth, existingWidth),
          maxColumnWidth,
        );
      });

      /**
       * TODO: should just workout top widest columns andd split free space between them.
       *  If free space AND last column is lengthy then extend last column to fill it
       * */
      if (isLastColumn && !includes(_PG_numbers, c.udt_name)) {
        const remainingWidth = tableWidth - assignedColumnWidth;
        if (remainingWidth > 20) {
          width = remainingWidth;
        }
      }
    }
    width = Math.max(width, minColumnWidth);

    assignedColumnWidth += width;
    return {
      ...c,
      width,
    };
  });
};

// const getColumnWidths = <
//   T extends Pick<ProstglesTableColumn, "tsDataType" | "udt_name" | "width">,
//   K extends keyof T,
// >(
//   colPropertyForData: K,
//   cols: T[],
//   data: any[],
// ): { col: T; width: number; widthSource: "fixed" | "fromData" }[] => {
//   const fixedWidths = new Map<T, number>();
//   const fromDataWidths = new Map<T, number>();
//   cols.forEach((col) => {
//     if (Number.isFinite(col.width)) {
//       fixedWidths.set(col, col.width!);
//     } else {
//       fromDataWidths.set(col, -1);
//     }
//   });
//   data.forEach((r) => {
//     let width = 20;
//     fromDataWidths.forEach((_, c) => {
//       const textContentWidth =
//         JSON.stringify(r[c[colPropertyForData]] || "").length * 8;
//       const existingWidth =
//         Number.isFinite(c.width) ? c.width! : textContentWidth;
//       /** Must be within 100px and 300px */
//       width = Math.min(
//         Math.max(width, textContentWidth, minColumnWidth, existingWidth),
//         maxColumnWidth,
//       );
//       fromDataWidths.set(c, Math.max(fromDataWidths.get(c) ?? 0, width));
//     });
//   });

//   return cols.map((c) => {
//     const fixedWidth = fixedWidths.get(c);
//     if (fixedWidth !== undefined) {
//       return { col: c, width: fixedWidth, widthSource: "fixed" };
//     } else {
//       return {
//         col: c,
//         width: fromDataWidths.get(c) ?? minColumnWidth,
//         widthSource: "fromData",
//       };
//     }
//   });
// };
