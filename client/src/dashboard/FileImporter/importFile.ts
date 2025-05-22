import type { AnyObject, DBHandler } from "prostgles-types";
import { asName } from "prostgles-types";
import type { FileImporterState } from "./FileImporter";
import { getPapa, streamBIGFile } from "./FileImporter";
import {
  applySuggestedDataTypes,
  getTextColumnPotentialDataTypes,
  type SuggestedColumnDataType,
} from "./checkCSVColumnDataTypes";

export type ImportProgress = {
  importedRows: number;
  totalRows: number;
  tableName: string;
  timeElapsed: string;
  progress: number;
  finished?: boolean;
  types?: SuggestedColumnDataType[];
  errors: any[];
};
type Args = Pick<
  FileImporterState,
  | "destination"
  | "selectedFile"
  | "reCreateTable"
  | "insertAs"
  | "streamBatchMb"
  | "streamColumnDataType"
  | "streamColDelimiter"
  | "inferAndApplyDataTypes"
> & {
  db: DBHandler;
  onError: (err: any) => void;
  onProgress: (stats: ImportProgress) => { canContinue: boolean };
};
export const importFile = async (args: Args) => {
  const { selectedFile, db, destination, streamBatchMb, onError } = args;

  let canceled = false;
  const onProgress: typeof args.onProgress = (stats) => {
    if (stats.finished) {
      canceled = true;
    }
    const res = args.onProgress(stats);
    if (!res.canContinue) {
      canceled = true;
    }

    return res;
  };

  onProgress({
    tableName: destination.newTableName ?? destination.existingTable ?? "",
    timeElapsed: "00:00",
    totalRows: 0,
    progress: 0,
    importedRows: 0,
    errors: [],
    finished: false,
  });

  try {
    if (!selectedFile?.file) {
      throw "No file to import";
    }
    if (!selectedFile.preview) {
      throw "Preview missing";
    }

    const { tableName, insertQueryPrefix, columns } = await createTable(args);
    const importing = {
      tableName,
      importedRows: 0,
      totalRows: 0,
      progress: 0,
      errors: [],
      timeElapsed: "",
    };

    /* Elapsed time counter */
    const elapsedCounter = {
      timeStarted: Date.now(),
      interval: setInterval(() => {
        if (canceled || !elapsedCounter.timeStarted) {
          clearInterval(elapsedCounter.interval);
          return;
        }
        const s = elapsedCounter.timeStarted;
        const secs = Math.round((Date.now() - s) / 1000);
        const mins = Math.floor(secs / 60);

        onProgress({
          ...importing,
          timeElapsed: [mins, secs - mins * 60]
            .map((v) => v.toString().padStart(2, "0"))
            .join(":"),
        });
      }, 1000),
    };

    const stepSize = selectedFile.preview.rowsPerBatch ?? 1000;
    let currIdx = 0;
    let batch: any[] = [];
    const errors: any[] = [];
    try {
      const insertRowsObj = (rowsObj: Record<string, any[]>) => {
        return db.sql!(
          `${insertQueryPrefix} ${Object.keys(rowsObj)
            .map((key) => `(\${${key}:csv})`)
            .join(", ")}`,
          rowsObj,
        );
      };

      if (selectedFile.type === "csv") {
        let rowsImported = 0,
          importedSize = 0;

        const papa = await getPapa();
        streamBIGFile({
          papa,
          file: selectedFile.file,
          streamBatchMb,
          header: selectedFile.header,
          onChunk: async (d, p) => {
            if (canceled) {
              p.abort();
            } else {
              p.pause();
              try {
                const rowsObj: AnyObject = {};
                d.data.forEach((row, rowIdx) => {
                  if (Object.keys(row).length !== columns.length) {
                    console.error("Field mismatch: ", row);
                  } else {
                    const rowKey = `r${rowIdx}`;
                    rowsObj[rowKey] = row;
                  }
                });
                if (d.errors.length) {
                  errors.push(...d.errors);
                  d.errors.forEach((e) => console.error(e));
                }
                await insertRowsObj(rowsObj);
              } catch (error) {
                onError(error);
                console.error(error);
              }

              importedSize = d.meta.cursor;
              rowsImported += d.data.length;

              importing.progress =
                (100 * importedSize) / selectedFile.file.size;
              importing.importedRows = rowsImported;

              p.resume();
            }
          },
          onError: (error) => {
            console.error(error);
          },
          onDone: async () => {
            let types = await getTextColumnPotentialDataTypes(db.sql!, {
              tableName,
            });
            if (args.inferAndApplyDataTypes) {
              await applySuggestedDataTypes({ types, sql: db.sql!, tableName });
              types = [];
            }
            onProgress({
              ...importing,
              progress: 100,
              importedRows: rowsImported,
              errors,
              types,
              finished: true,
            });
          },
        });
      } else {
        const allRows = selectedFile.preview.allRows ?? [];
        importing.totalRows = allRows.length;

        do {
          batch = allRows.slice(currIdx, currIdx + stepSize);

          const rowsObj = Object.fromEntries(
            batch.map((r, ri) => {
              return [`r${ri}`, columns.map((c) => r[c])];
            }),
          );
          await insertRowsObj(rowsObj);

          importing.importedRows = currIdx + stepSize;
          importing.progress = Math.round(
            (100 * importing.importedRows) / allRows.length,
          );

          currIdx += stepSize;
        } while (
          (!currIdx || currIdx < allRows.length) &&
          !(canceled as boolean)
        );

        onProgress({
          ...importing,
          progress: 100,
          importedRows: allRows.length,
          errors,
          finished: true,
        });
      }
    } catch (e) {
      console.error(e, batch);
      throw {
        startRow: currIdx,
        // batchSize: stepSize,
        err: e,
      };
    }
    // this.isImporting = undefined;
  } catch (e) {
    console.error(e);
    canceled = true;
    onError(e);
  }
};

const createTable = async (
  args: Args,
): Promise<{
  tableName: string;
  escapedTableName: string;
  insertQueryPrefix: string;
  columns: string[];
}> => {
  const { db, selectedFile, destination, reCreateTable, insertAs } = args;

  if (!selectedFile?.preview) {
    throw "selectedFile missing";
  }

  if (!db.sql) {
    throw "Cannot create new table";
  }

  /** There is a maximum length on table name in postgresql which is 63 characters */
  const tableName = (destination.newTableName || selectedFile.file.name).slice(
    0,
    63,
  );
  const escapedTableName = await db.sql(`SELECT quote_ident($1)`, [tableName], {
    returnType: "value",
  });
  if (reCreateTable && db[tableName]) {
    await db.sql("DROP TABLE IF EXISTS " + escapedTableName);
  }

  let create = "CREATE TABLE " + escapedTableName + " ( \n";

  const cols = selectedFile.preview.cols;

  if (
    cols.some((c) => c.dataType === "geometry" || c.dataType === "geography")
  ) {
    create = `CREATE EXTENSION IF NOT EXISTS postgis;\n${create}`;
  }

  const columns: typeof cols =
    insertAs === "Single text value" ?
      [
        {
          dataType: "TEXT",
          key: "all_data",
          escapedName: asName("all_data"),
          label: "All data",
          sortable: false,
        },
      ]
    : cols;
  const colTypes = columns
    .map((col, i) => {
      return col.escapedName + " " + col.dataType;
    })
    .join(",\n");

  const _q = create + colTypes + " \n);",
    /** No insert into BIGSERIAL */
    escapedColnames = cols
      .filter((c) => c.dataType !== "BIGSERIAL")
      .map((col, i) => col.escapedName),
    insertQueryPrefix = await db.sql(
      "INSERT INTO " + escapedTableName + " (${colTypes:raw}) VALUES ",
      { colTypes: escapedColnames.join(", ") },
      { returnType: "statement" },
    );

  await db.sql(_q);

  return {
    tableName,
    escapedTableName,
    insertQueryPrefix,
    columns: columns.map((c) => c.key.toString()),
  };
};
