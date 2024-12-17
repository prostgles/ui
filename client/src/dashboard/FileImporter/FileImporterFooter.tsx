import React from "react";
import Btn from "../../components/Btn";
import { ProgressBar } from "../../components/ProgressBar";
import type { FileImporterProps, FileImporterState } from "./FileImporter";

type P = FileImporterState &
  Pick<FileImporterProps, "db" | "openTable"> & {
    onCancel: VoidFunction;
    onImport: VoidFunction;
  };
export const FileImporterFooter = (props: P) => {
  const {
    db,
    selectedFile,
    onImport,
    onCancel,
    importing,
    openTable,
    error,
    customHeadersError,
  } = props;

  const hideOpenTable =
    !importing?.finished || !importing.tableName || !db[importing.tableName];
  return (
    <>
      <div
        className={"ai-center flex-row f-1 gap-1"}
        style={{ justifyContent: "sspace-between" }}
      >
        <Btn
          onClick={onCancel}
          className="mr-auto"
          style={{
            border: "1px solid var(--gray-300)",
            padding: "8px 16px",
          }}
        >
          Cancel
        </Btn>

        {selectedFile && !importing && (
          <Btn
            className="ml-auto"
            onClick={onImport}
            disabledInfo={customHeadersError}
            style={{
              background: "var(--blue-600)",
              color: "white",
              padding: "8px 16px",
            }}
          >
            Import
          </Btn>
        )}

        {hideOpenTable ? null : (
          <Btn
            className="ml-1"
            onClick={async () => {
              openTable(importing!.tableName);
              onCancel();
            }}
            disabledInfo={customHeadersError}
            style={{
              background: "var(--blue-600)",
              color: "white",
              padding: "8px 16px",
            }}
          >
            Open table
          </Btn>
        )}

        {!error && importing && !importing.progress ?
          <div className="flex-row ai-center ml-auto ta-right">
            Loading file ...
          </div>
        : null}

        {!importing || importing.finished || error ? null : (
          <div className="ImportingProgress flex-row ai-center ml-auto ta-right">
            <div
              className={
                "mr-1 flex-col " +
                (!importing.progress && !importing.importedRows ?
                  " hidden "
                : "")
              }
            >
              <div style={{ fontSize: "1.5em" }}>
                {importing.progress?.toFixed(0)}%
              </div>
            </div>
            <div className="flex-col ai-center">
              <ProgressBar
                totalValue={100}
                value={importing.progress || 0}
                message={`${(importing.importedRows || 0).toLocaleString()} rows`}
              />
              <div className="text-1p5 mt-p5" style={{ fontSize: "1em" }}>
                {importing.timeElapsed}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
