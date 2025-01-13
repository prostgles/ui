import { mdiAlertCircleOutline, mdiClose, mdiFormatText } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React from "react";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import FormField from "../../components/FormField/FormField";
import Loading from "../../components/Loading";
import Popup from "../../components/Popup/Popup";
import PopupMenu from "../../components/PopupMenu";
import { Table } from "../../components/Table/Table";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { ProstglesColumn } from "../W_SQL/W_SQL";
import { getFileText } from "../W_SQL/W_SQLMenu";
import RTComp from "../RTComp";
import { FileImporterFooter } from "./FileImporterFooter";
import { importFile, type ImportProgress } from "./importFile";
import { setFile } from "./setFile";
const streamColumnDataTypes = ["TEXT", "JSON", "JSONB"] as const;
import type { AnyObject } from "prostgles-types";
import { bytesToSize } from "../Backup/BackupsControls";
import { FlexCol } from "../../components/Flex";
import SearchList from "../../components/SearchList/SearchList";
import { ApplySuggestedDataTypes } from "./checkCSVColumnDataTypes";

type Papa = typeof import("papaparse");
export const getPapa = () =>
  import(/* webpackChunkName: "papaparse" */ "papaparse");
const camel_to_snake = (str) => {
  // str[0].toLowerCase() + str.slice(1, str.length).replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

  let res = "";
  const _s = str.trim();
  const arr = _s.split("");
  arr.map((k, i) => {
    if (
      i &&
      res.slice(-1) !== "_" &&
      (!arr[i - 1].match(/[A-Z]/) || k.match(/[\W_]+/))
    ) {
      res += "_";
    }

    if (!k.match(/[\W_]+/)) {
      res += k.toLowerCase();
    }
  });

  return res;
};

const fix_name = (str) => camel_to_snake(str); //.replace(/[\W_]+/g," ").trim().replace(/\s\s+/g, ' ').replace(/[\W_]+/g,"_"));

export type FileImporterProps = {
  db: DBHandlerClient;
  onClose: Function;
  openTable: (tableName: string) => void;
  style?: object;
  className?: string;
  id?: string;
  button?: Element;
  parentDiv?: Element;
  tables: CommonWindowProps["tables"];
};

type HeaderType = "First row" | "Custom";

const INSERT_AS = [
  "Single text value",
  "JSONB Rows",
  "Properties with Geometry",
] as const;

export type FileImporterState = {
  bytesPerRow?: number;
  json?: AnyObject;

  loadingFileName?: string;

  // file?: File;
  selectedFile?: {
    fileTooBig?: boolean;
    file: File;
    type: "csv" | "json" | "geojson";
    header: boolean;

    /** If geojson */
    srid?: string;

    preview?: {
      rows: Record<string, any>[];
      cols: ({ dataType: string; escapedName: string } & Pick<
        ProstglesColumn,
        "key" | "label" | "sortable" | "width" | "subLabel"
      >)[];

      /** If json/geojson */
      allRows?: Record<string, any>[];

      /**
       * Only used for non-csv (csvs specify the chunk size to the stream reader)
       * Must send less data than maxHttpBufferSize: (1e8 which is 100Mb)
       * 1 char = 4 bytes
       */
      rowsPerBatch?: number;
    };
  };

  destination: {
    newTable?: boolean;
    newTableName?: string;
    existingTable?: string;
  };
  config?: {
    header?: boolean;
    quoteChar?: string;
    newline?: string;

    /**
     * Must send less data than maxHttpBufferSize: (1e8 which is 100Mb)
     * 1 char = 4 bytes
     */
    // rowsPerBatch: number;
  };
  importing?: ImportProgress;
  // {
  //   tableName: string;
  //   importedRows?: number;
  //   progress?: number;
  //   timeElapsed?: string;
  //   finished?: boolean;
  //   errors: any[];
  // }

  open: boolean;
  error?: any;
  reCreateTable?: boolean;
  inferAndApplyDataTypes: boolean;
  headerType: HeaderType;
  customHeaders?: string;
  customHeadersError?: string;
  results?: any;
  colNo?: string;

  /**
   * If true then all data will be inserted as a single text cell
   */
  insertAs?: (typeof INSERT_AS)[number];

  streamColumnDataType: (typeof streamColumnDataTypes)[number];

  streamBatchMb: number;

  multiImport?: {
    fileName: string;
    content: string;
  }[];
  files?: File[];

  streamColDelimiter: string;
};

export default class FileImporter extends RTComp<
  FileImporterProps,
  FileImporterState
> {
  state: FileImporterState = {
    streamColumnDataType: "TEXT",
    streamBatchMb: 10,
    insertAs: "JSONB Rows",
    bytesPerRow: 0,
    config: {
      header: true,
    },
    destination: {
      newTable: true,
      newTableName: undefined,
      existingTable: undefined,
    },
    open: true,
    reCreateTable: false,
    headerType: "First row",
    results: undefined,
    colNo: "",
    streamColDelimiter: "_$_",
    inferAndApplyDataTypes: true,
  };

  getExitMessage = () => {
    return this.isImporting ?
        `Currently importing into table ${this.isImporting.tableName}. Data might be lost`
      : undefined;
  };

  onBeforeUnload = (e) => {
    const confirmationMessage = this.getExitMessage();
    if (confirmationMessage) {
      (e || window.event).returnValue = confirmationMessage; //Gecko + IE
      return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
    }
  };

  isImporting: FileImporterState["importing"];
  onMount() {
    window.addEventListener("beforeunload", this.onBeforeUnload);
  }

  onUnmount() {
    const confirmationMessage = this.getExitMessage();
    if (!confirmationMessage) {
      window.removeEventListener("beforeunload", this.onBeforeUnload);
    } else {
      window.confirm(confirmationMessage);
    }
    window.__prglIsImporting = false;
  }

  onDelta = async (dP, dS, dD) => {
    const { selectedFile } = this.state;
    const delta = { ...dP, ...dS, ...dD };

    window.__prglIsImporting = Boolean(this.state.importing);

    if (selectedFile && delta && (delta.customHeaders || delta.headerType)) {
      // this.setFile(selectedFile.file);
    }
  };

  parseFiles = async (files: File[]) => {
    const multiImport: FileImporterState["multiImport"] = [];
    for (const file of files) {
      this.setState({ loadingFileName: file.name, importing: undefined });
      const content = await getFileText(file);
      multiImport.push({ fileName: file.name, content });
    }
    this.setState({ loadingFileName: undefined });

    return multiImport;
  };

  setFiles = async (files: File[]) => {
    if (files.length > 1) {
      const allowedTypesForMultiImport = ["txt", "svg", "html", "json"];
      const arr = Array.from(files);
      const [firstFile] = arr;
      if (
        firstFile &&
        arr.every(
          (f) =>
            allowedTypesForMultiImport.find((ext) =>
              f.name.toLowerCase().endsWith(`.${ext}`),
            ) && f.size < 1e6,
        )
      ) {
        this.setState({ files });

        const multiImport = await this.parseFiles(arr.slice(0, 40));

        this.setState({
          files: arr,
          multiImport,
          selectedFile: {
            file: firstFile,
            type: "csv",
            header: false,
            preview: {
              cols: [
                {
                  key: "fileName",
                  dataType: "TEXT",
                  escapedName: "fileName",
                  label: "fileName",
                  sortable: false,
                },
                {
                  key: "content",
                  dataType: "TEXT",
                  escapedName: "content",
                  label: "content",
                  sortable: false,
                },
              ],
              rows: multiImport.slice(0, 40),
              // allRows: multiImport,
            },
          },

          loadingFileName: undefined,
        });
      } else {
        alert(
          `Multi import is only allowed for text files (${allowedTypesForMultiImport}) less than 1Mb each`,
        );
      }
    } else if (files.length) {
      this.setFile(files[0]!);
    }
  };

  setFile = setFile.bind(this);

  canceled = false;
  importFile = async () => {
    const onError = (error: any) => {
      if (!this.mounted) return;

      this.setState({ error });
    };
    try {
      await importFile({
        ...this.state,
        db: this.props.db,
        onError,
        onProgress: (importing) => {
          if (!this.mounted) {
            return { canContinue: false };
          }
          this.setState({ importing });
          return { canContinue: true };
        },
      });
    } catch (error) {
      onError(error);
    }
  };

  cancel = async () => {
    this.canceled = true;
    const { onClose, db } = this.props;
    const { importing } = this.state;

    /**
     * Drop table if import is canceled
     */
    if (importing && !importing.finished)
      await db.sql!("DROP TABLE IF EXISTS " + importing.tableName);

    this.setState({
      importing: undefined,
      open: false,
      selectedFile: undefined,
    });
    onClose();
  };

  render() {
    const {
      selectedFile,
      colNo,
      destination,
      importing,
      headerType,
      error,
      open,
      reCreateTable,
      inferAndApplyDataTypes,
      insertAs,
      loadingFileName,
      files,
    } = this.state;

    const { openTable, parentDiv, db } = this.props;
    const { newTableName } = destination;
    let tblName = newTableName;
    if (!newTableName && selectedFile) tblName = selectedFile.file.name; //.slice(0, -4);

    const readonlyName = Boolean(importing);
    return (
      <Popup
        title={
          !selectedFile?.file ? "Import data from file"
          : files ?
            `Import ${files.length} files`
          : `Import ${selectedFile.file.name}`
        }
        onClose={this.cancel}
        clickCatchStyle={{ opacity: 1 }}
        positioning="center"
        contentClassName="p-1"
        footer={
          <FileImporterFooter
            {...this.state}
            openTable={openTable}
            db={db}
            onImport={this.importFile}
            onCancel={this.cancel}
          />
        }
      >
        <div className="flex-col o-auto p-p5">
          {loadingFileName && !error && (
            <div className="flex-row mt-2">
              <Loading className="mr-1" />
              <div className="text-1p5 mt-p5" style={{ fontSize: "1em" }}>
                Loading {loadingFileName}
              </div>
            </div>
          )}

          {(
            (importing && !importing.finished) ||
            loadingFileName ||
            this.state.selectedFile
          ) ?
            null
          : <FormField
              asColumn={true}
              className="mb-1 "
              label="File (csv/txt/json/geojson)"
              type="file"
              inputProps={{
                multiple: true,
              }}
              accept="text/*, .csv, .txt, .json, .geojson, .tsv"
              onChange={(files) => {
                this.setFiles(files);
              }}
            />}

          {selectedFile && (
            <>
              <FormField
                asColumn={true}
                key={"new-table-name"}
                readOnly={readonlyName}
                className="mb-1 "
                label="Table name"
                value={tblName}
                onChange={
                  readonlyName ? undefined : (
                    (newTableName) => {
                      this.setState({
                        destination: { ...destination, newTableName },
                      });
                    }
                  )
                }
                rightIcons={
                  readonlyName ? undefined : (
                    <Btn
                      iconPath={mdiFormatText}
                      onClick={() =>
                        this.setState({
                          destination: {
                            ...destination,
                            newTableName: fix_name(tblName),
                          },
                        })
                      }
                      title="Transform name to snake case"
                    />
                  )
                }
              />

              {!importing?.finished && (
                <>
                  <FormField
                    asColumn={true}
                    readOnly={readonlyName}
                    className="mb-1 "
                    label="Drop table if exists"
                    type="checkbox"
                    value={reCreateTable}
                    onChange={(reCreateTable) => {
                      this.setState({ reCreateTable });
                    }}
                  />
                  <FormField
                    asColumn={true}
                    readOnly={readonlyName}
                    className="mb-1 "
                    label="Try to infer and apply column data types"
                    type="checkbox"
                    value={inferAndApplyDataTypes}
                    onChange={(inferAndApplyDataTypes) => {
                      this.setState({ inferAndApplyDataTypes });
                    }}
                  />

                  {selectedFile.type !== "csv" && (
                    <FormField
                      asColumn={true}
                      className="mb-1 "
                      label="Insert as"
                      value={insertAs}
                      options={INSERT_AS}
                      onChange={(insertAs) => {
                        this.setState({ insertAs });
                      }}
                    />
                  )}

                  {selectedFile.type === "geojson" && (
                    <FormField
                      asColumn={true}
                      type="text"
                      className="mb-1 "
                      label="SRID"
                      value={selectedFile.srid}
                      onChange={(srid) => {
                        this.setState({
                          selectedFile: {
                            ...this.state.selectedFile!,
                            srid,
                          },
                        });
                      }}
                    />
                  )}
                </>
              )}
            </>
          )}

          {selectedFile && !importing && (
            <div
              className="f-1 flex-col"
              style={{ maxHeight: "400px", maxWidth: "900px" }}
            >
              {loadingFileName ?
                <Loading key="preview-loader" />
              : <div className="flex-col f-1 min-w-0 min-h-0">
                  <div className="divider-h"></div>

                  <div className="flex-row gap-1 jc-center">
                    <div className="f-0 mb-1 noselect bold">
                      File size:{" "}
                      {Math.round(
                        selectedFile.file.size / 1e6,
                      ).toLocaleString()}{" "}
                      MB
                    </div>
                    <div className="f-0 mb-1 noselect">
                      Preview ({selectedFile.preview?.allRows?.length} rows)
                    </div>
                  </div>

                  {selectedFile.preview?.rows && (
                    <Table
                      maxCharsPerCell={500}
                      className="f-1 o-auto b-color "
                      {...selectedFile.preview}
                      cols={selectedFile.preview.cols.map(
                        (c) =>
                          ({
                            ...c,
                            filter: false,
                            name: c.key.toString(),
                            tsDataType: "string",
                            udt_name: "text",
                            computed: false,
                          }) satisfies ProstglesColumn,
                      )}
                    />
                  )}
                </div>
              }
            </div>
          )}

          {importing?.finished && (
            <div className="flex-row-wrap gap-1 ai-center">
              {importing.errors.length > 0 && (
                <PopupMenu
                  button={
                    <Btn
                      color="warn"
                      variant="outline"
                      iconPath={mdiAlertCircleOutline}
                    >
                      {importing.errors.length} Error/s
                    </Btn>
                  }
                  title="Import errors (ignored)"
                  onClickClose={true}
                  positioning="fullscreen"
                  render={(pClose) => (
                    <CodeEditor
                      language="json"
                      value={JSON.stringify(importing.errors, null, 2)}
                      className="w-full h-full"
                    />
                  )}
                />
              )}

              <div className="f-1 pre">
                <span className="bold">{importing.importedRows}</span> rows
                imported into
                <span className="text-warning ml-p5">
                  {importing.tableName}
                </span>
              </div>
              {db.sql && (
                <ApplySuggestedDataTypes
                  types={importing.types}
                  onDone={this.cancel}
                  sql={db.sql}
                  tableName={importing.tableName}
                />
              )}
            </div>
          )}

          {!!error && (
            <ErrorComponent
              className="p-1"
              withIcon={true}
              error={error.err_msg || error}
              pre={true}
            />
          )}
        </div>
      </Popup>
    );
  }
}

export function getRowsPerBatch(maxCharsPerRow, bytesPerChar = 4) {
  let rowsPerBatch = 1;
  const bitsPerRow = (maxCharsPerRow + 100) * bytesPerChar;
  if (bitsPerRow > batchMaxBitSize) {
    throw `${bytesToSize(bitsPerRow)} row size limit exceeded (> ${bytesToSize(batchMaxBitSize)} batchMaxBitSize). Cannot send upload data`;
  } else {
    rowsPerBatch = Math.floor(
      Math.min(
        1500, // no more than 1.5k rows

        Math.max(
          preferredBatchBitSize / bitsPerRow,
          batchMaxBitSize / bitsPerRow,
        ),
      ),
    );
  }

  return rowsPerBatch;
}

const batchMaxBitSize = 1e8,
  preferredBatchBitSize = 2e7;
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (preferredBatchBitSize > batchMaxBitSize) {
  throw "preferredBatchBitSize must be less than batchMaxBitSize";
}

type StreamFileArgs = Omit<
  Papa.ParseLocalConfig<string[], Papa.LocalFile>,
  "chunk" | "chunkSize" | "complete"
> & {
  file: File;

  /**
   * Must send less data than maxHttpBufferSize: (1e8 which is 100Mb)
   * 1 char = 4 bytes
   */
  streamBatchMb?: number;
  onChunk: (result: Papa.ParseResult<string[]>, parser: Papa.Parser) => void;
  onDone?: VoidFunction;
  onError?: (error: any) => void;
  papa: Papa;
};

export const streamBIGFile = ({
  file,
  onChunk,
  streamBatchMb = 1,
  onDone = () => {},
  onError,
  papa,
  ...opts
}: StreamFileArgs) => {
  return papa.parse<string[]>(file, {
    ...opts,
    chunkSize: 1024 * 1024 * streamBatchMb,
    chunk: function (results, parser) {
      onChunk(results, parser);
    },
    error: onError,
    complete: onDone,
  });
};

export const getCSVFirstChunk = (
  args: Omit<StreamFileArgs, "onChunk" | "onError">,
): Promise<Papa.ParseResult<string[]>> => {
  return new Promise(async (resolve, reject) => {
    const papa = await getPapa();
    streamBIGFile({
      ...args,
      papa,
      error: reject,
      onChunk: (results, parser) => {
        const { data } = results;
        parser.abort();
        resolve(results);
      },
    });
  });
};

// rowsToJson = (_results: any) => {
//   const { config, headerType, customHeaders = "" } = this.state;

//   const results = { ..._results };
//   const rowArr = results.data;
//   let cols: Required<Required<FileImporterState>["selectedFile"]>["preview"]["cols"] = [], rows = [];
//   if(rowArr && rowArr.length){

//     if(headerType === "Custom"){
//       const firstRowKeys = Object.keys(results.data[0]);
//       const defaultColNames = new Array(firstRowKeys.length).fill(null).map((d, i) => `c${i+1}`).join(", ");
//       if(!customHeaders) this.setState({ customHeaders: defaultColNames })
//       const headers = customHeaders.split(", ").map(d => d.trim());

//       let ns = {
//         colNo: ` (${firstRowKeys.length})`,
//         customHeadersError: ""
//       }

//       if(firstRowKeys.length !== headers.length){
//         ns.customHeadersError = "Extra/missing column names";

//       } else if(Array.from(new Set(headers)).length !== headers.length){
//         ns.customHeadersError = "Duplicate column names";

//       } else {

//         cols = headers.map(key => ({
//           key,
//           label: key,
//           dataType: "text",
//           escapedName: asName(key),
//           sortable: false,
//         }));
//         rows = rowArr.map(row => {
//           let res = {};
//           let vals = Array.isArray(row)? row : Object.values(row);
//           vals.map((r, i) => {
//             res[headers[i]!] = r;
//           })
//           return res;
//         });
//       }
//       this.setState(ns)

//     } else if(headerType === "First row"){
//       cols = results.meta.fields.map(key => ({
//         key,
//         label: key,
//         dataType: "text",
//         escapedName: asName(key),
//         sortable: false,
//       }));
//       rows = results.data;
//     } else {
//       cols = new Array(rowArr[0].length).fill(null).map((d, i) => ({
//         key: `c${i}`,
//         label: `Column ${i}`,
//         dataType: "text",
//         escapedName: asName(`c${i}`),
//         sortable: false,
//       }));
//       rows = rowArr.map(row => {
//         let res = {};
//         row.map((r, i) => {
//           res[`c${i}`] = r;
//         })
//         return res;
//       });
//     }
//   }

//   return { cols, rows };
// }
