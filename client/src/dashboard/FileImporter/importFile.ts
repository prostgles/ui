import { AnyObject, asName, DBHandler } from "prostgles-types";
import { FileImporterState, streamBIGFile } from "./FileImporter";


type ImportProgress = {
  importedRows: number; 
  totalRows: number; 
  tableName: string;
  timeElapsed: string;
  progress: number;
  finished?: boolean;
  errors: any[];
}
type Args = Pick<FileImporterState, 
  "destination" 
  | "selectedFile" 
  | "reCreateTable" 
  | "insertAs" 
  | "streamBatchMb" 
  | "streamColumnDataType" 
  | "streamColDelimiter"
> & {
  db: DBHandler;
  onError: (err: any) => void;
  onProgress: (stats: ImportProgress) => { canContinue: boolean; };
}
export const importFile = async (args: Args) => {
  const { 
    selectedFile, db, destination, streamBatchMb, onError 
  } = args;

  let canceled = false;
  const onProgress: typeof args.onProgress = (stats) => {
    if(stats.finished){
      canceled = true;
    }
    const res = args.onProgress(stats);
    if(!res.canContinue){
      canceled = true;
    }

    return res;
  }


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

    // let insert, tableName, insertQueryPrefix = '';
    // if (destination?.newTable) {
    //   tableName = escapedTableName;
    //   const cols = selectedFile.preview.cols;
    //   // const escapedColnames = cols.map((col, i) => col.escapedName);

    //   insert = async (rows: any[]) => {

    //     if (insertAs === "Single text value") {
    //       return db.sql!(`INSERT INTO ${escapedTableName} ( all_data ) VALUES ($1) `, [rows[0].all_data])
    //     }

    //     const srid = selectedFile?.srid;

    //     if (srid) {
    //       rows = rows.map(_r => {
    //         let r: any = { ..._r };
    //         let f = r;//.feature;
    //         f.geometry.crs = f.geometry.crs || {};
    //         f.geometry.crs.type = f.geometry.crs.type || {};
    //         f.geometry.crs.type.name = f.geometry.crs.type.name || {};
    //         f.geometry.crs.type.name.properties = f.geometry.crs.type.name.properties || {};
    //         f.geometry.crs.type.name.properties.name = srid;
    //         // r.feature = f
    //         r.geometry = f.geometry;
    //         return r;
    //       })
    //     }


    //     // if(insertAs !== "Properties with Geometry"){
    //     //   const q = insertQueryPrefix +  ` ${rows.map((row, i) => " ($" + (i+1) + ") ").join(", ")} `
    //     //   // return this.props.db.sql(q, rows);
    //     //   await this.sendToServer([q], rows);
    //     //   return true
    //     //   // return Promise.all(rows.map(row => {

    //     //   // }));
    //     // }
    //     let rowsObj = {};
    //     const insertedCols = cols.filter(c => c.dataType !== "BIGSERIAL")
    //     rows.forEach((row, ri) => {
    //       return insertedCols.map((c, ci) => {
    //         if (!(c.key in row) || row[c.key] === undefined) {
    //           row[c.key] = null;
    //         } else if (c.dataType === "BIGSERIAL") {
    //           row[c.key] = null;
    //         }
    //         const rkey = `r${ri}`, ckey = `c${ci}`
    //         rowsObj[rkey] = rowsObj[rkey] || {};
    //         rowsObj[rkey][ckey] = row[c.key];
    //       });
    //     })
    //     const rowValues = rows.map((row, ri) => {

    //       return `(${insertedCols.map((c, ci) => {

    //         /** Never use raw colNames for import because any "." within key will be taken as path */
    //         const vkey = "${r" + ri + ".c" + ci + "}";
    //         if (c.dataType === "geometry") {
    //           return ` ST_GeomFromGeoJSON(${vkey}) `;
    //         }
    //         return vkey;
    //       }).join(", ")}) `;

    //     });
    //     if (!rowValues.length) return [];
    //     return db.sql!(insertQueryPrefix + rowValues.join(", "), rowsObj)
    //   };
    // } else if (destination.existingTable) {
    //   tableName = destination.existingTable;
    //   insert = (rows: any[]) => db[destination.existingTable!]?.insert!(rows);
    // }
    
    const { tableName, insertQueryPrefix, columns } = await createTable(args);
    const importing = {
      tableName,
      importedRows: 0,
      totalRows: 0,
      progress: 0,
      errors: [],
      timeElapsed: "",
    }

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
          timeElapsed: [mins, secs - mins * 60].map(v => v.toString().padStart(2, "0")).join(":")
        })


      }, 1000)
    }


    const stepSize = selectedFile.preview.rowsPerBatch ?? 1000;
    let currIdx = 0;
    let batch: any[] = [];
    const errors: any[] = [];
    try {

      const insertRowsObj = (rowsObj: Record<string, any[]>) => {

        return db.sql!(`${insertQueryPrefix} ${Object.keys(rowsObj).map(key => `(\${${key}:csv})`).join(", ")}`, rowsObj);
      }

      if (selectedFile.type === "csv") {
        let rowsImported = 0, importedSize = 0;

        streamBIGFile({
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
                  if(Object.keys(row).length !== columns.length){
                    console.error("Field mismatch: ", row);
                  } else {
                    const rowKey = `r${rowIdx}`;
                    rowsObj[rowKey] = row;
                  }
                });
                if(d.errors.length){
                  errors.push(...d.errors);
                  d.errors.forEach(e => console.error(e));
                }
                await insertRowsObj(rowsObj);
              } catch (error) {
                onError(error)
                console.error(error);
              }

              importedSize = d.meta.cursor;
              rowsImported += d.data.length;
              
              importing.progress = (100 * importedSize / selectedFile.file.size);
              importing.importedRows = rowsImported;

              p.resume();
            }
          }, 
          onError: (error) => {
            console.error(error);
          },
          onDone: () => {

            onProgress({
              ...importing,
              progress: 100,
              importedRows: rowsImported,
              errors,
              finished: true,
            });

          }
        });

      } else {
        const allRows = selectedFile.preview.allRows ?? [];
        importing.totalRows = allRows.length;
        
        do {
          batch = allRows.slice(currIdx, currIdx + stepSize);
          
          const rowsObj = Object.fromEntries(batch.map((r, ri) => {
            return [`r${ri}`, columns.map(c => r[c])]
          }));
          await insertRowsObj(rowsObj);

          importing.importedRows = currIdx + stepSize;
          importing.progress = Math.round(100 * importing.importedRows / allRows.length);

          currIdx += stepSize;

        } while ((!currIdx || (currIdx < allRows.length)) && !(canceled as boolean))

        onProgress({
          ...importing,
          progress: 100,
          importedRows: allRows.length,
          errors,
          finished: true,
        });
      }

    } catch (e) {
      console.log(batch)
      throw {
        startRow: currIdx,
        // batchSize: stepSize,
        err: e
      };
    }
    // this.isImporting = undefined;


  } catch (e) {
    console.error(e);
    canceled = true;
    onError(e);
  }
}

const createTable = async (args: Args): Promise<{ tableName: string, escapedTableName: string, insertQueryPrefix: string; columns: string[]; }> => {
  const { db, selectedFile, destination, reCreateTable, insertAs } = args;

  if(!selectedFile?.preview) {
    throw "selectedFile missing";
  }

  if(!db.sql) {
    throw "Cannot create new table";
  }

  const tableName = destination.newTableName || selectedFile.file.name;//.slice(0, -4);
  const escapedTableName = await db.sql("$1:name", [tableName], { returnType: "statement" });
  if(reCreateTable && db[tableName]){
    await db.sql("DROP TABLE IF EXISTS " + escapedTableName);
  }

  let create = "CREATE TABLE " + escapedTableName + " ( \n";

  const cols = selectedFile.preview.cols;

  if(cols.some(c => c.dataType === "geometry" || c.dataType === "geography")){
    create = `CREATE EXTENSION IF NOT EXISTS postgis;\n${create}`
  }
  
  // if(insertAs !== "Properties with Geometry"){
  //   cols = [{
  //     key: "all_data",
  //     dataType: insertAs === "JSONB Rows"? "jsonb" : "text",
  //     sortable: false,
  //     escapedName: "all_data",
  //     label: "all_data",
  //   }]
  // }

  const columns: typeof cols = insertAs === "Single text value"? [
    { 
      dataType: "TEXT", 
      key: "all_data", 
      escapedName: asName("all_data"),
      label: "All data",
      sortable: false, 
    }
  ] : cols;
  const colTypes = columns.map((col, i) => {
      return col.escapedName + " " + col.dataType;
    }).join(",\n");

  const _q = create + colTypes + " \n);",
    /** No insert into BIGSERIAL */
    escapedColnames = cols.filter(c => c.dataType !== "BIGSERIAL").map((col, i) => col.escapedName),
    insertQueryPrefix = await db.sql(
      "INSERT INTO " + escapedTableName + " (${colTypes:raw}) VALUES ", 
      {  colTypes: escapedColnames.join(", ") }, 
      { returnType: "statement" }
    );

  await db.sql(_q);
  
  return { 
    tableName, 
    escapedTableName, 
    insertQueryPrefix, 
    columns: columns.map(c => c.key.toString()) 
  };

}