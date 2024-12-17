import type { AnyObject } from "prostgles-types";
import { asName } from "prostgles-types";
import { getStringFormat } from "../../utils";
import type { FileImporterState } from "./FileImporter";
import { getCSVFirstChunk, getPapa } from "./FileImporter";

export type Col = { key: string; dataType: string; escapedName: string };

export async function parseCSVFile(
  file: File,
  config: FileImporterState["config"],
): Promise<{
  rows: AnyObject[];
  cols: Col[];
  header: boolean;
}> {
  const hasHeaders = async (dataPreview: string[][]) => {
    /** check if headers are in first row */
    const [r0, r1] = dataPreview;

    if (!dataPreview.length || !r0) {
      throw "File is empty or could not be parsed";
    }
    const header = r0.some((firstRowValue, i) => {
      if (!r1) return false;
      const secondRowValue = r1[i];
      const f0 = getStringFormat(firstRowValue)
        .map((f) => f.type)
        .join();
      const f1 = getStringFormat(secondRowValue)
        .map((f) => f.type)
        .join();
      return firstRowValue && f0 !== f1;
    });

    return header;
  };
  const papa = await getPapa();
  const { data } = await getCSVFirstChunk({
    file,
    preview: 4,
    skipEmptyLines: true,
    papa,
  });

  const header = await hasHeaders(data);

  const results = await getCSVFirstChunk({
    file,
    preview: 50,
    header,
    papa,
  });

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  let rows = results.data || [];
  const [firstRow] = rows;

  /** Filter out rows with a column number less than the first row */
  if (firstRow) {
    const badRows: { row_number: number; row_value: any }[] = [];
    const colLen = firstRow.length;
    rows = rows.filter((r, i) => {
      if (r.length !== colLen) {
        badRows.push({ row_number: i, row_value: r });
        return false;
      }
      return true;
    });

    if (badRows.length) {
      console.error(
        "Some rows have been ommited due to the number of columns not coinciding with first row:",
        badRows,
      );
    }
  }

  let cols: Col[] = [];
  let rowArr: AnyObject[] = [];

  if (!header) {
    const [firstRow] = rows;
    if (!firstRow) {
      throw "Could not import: No data to import";
    } else {
      cols = firstRow.map((_d, i) => ({
        key: `c${i + 1}`,
        dataType: "text",
        escapedName: asName(`c${i + 1}`),
      }));
      rowArr = rows.map((r) =>
        cols.reduce(
          (a, c, i) => ({
            ...a,
            [c.key]: r[i],
          }),
          {},
        ),
      );
    }
  } else {
    cols = (results.meta.fields ?? [])
      .map((v) => v.trim())
      .map((key) => ({
        key,
        dataType: "text",
        escapedName: asName(key),
      }));
    rowArr = rows;
  }

  let maxCharsPerRow = 0;
  rows.map((r) => {
    maxCharsPerRow = Math.max(maxCharsPerRow, JSON.stringify(r).length);
  });

  return {
    rows: rowArr,
    cols,
    header,
  };
}
