import { getProperty } from "@common/utils";
import { MarkdownWithPlugins } from "@components/MarkdownWithPlugins/MarkdownWithPlugins";
import type { TableHandlerClient } from "prostgles-client";
import { tryCatchV2, type AnyObject } from "prostgles-types";
import React, { useCallback, useState } from "react";
import { type Prgl } from "src/App";
import { SmartForm } from "src/dashboard/SmartForm/SmartForm";
import { type DivProps } from "../Flex";
import {
  MonacoCodeInMarkdown,
  type MonacoCodeInMarkdownProps,
} from "./MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import SmartTable from "src/dashboard/SmartTable";
import { useOnErrorAlert } from "@components/AlertProvider";
import type { DetailedFilter } from "@common/filterUtils";

export type MarkedProps = DivProps &
  Pick<
    MonacoCodeInMarkdownProps,
    "codeHeader" | "sqlHandler" | "loadedSuggestions"
  > & {
    content: string;
    prgl: Prgl | undefined;
  };

export const Marked = (props: MarkedProps) => {
  const {
    content,
    codeHeader,
    sqlHandler,
    loadedSuggestions,
    prgl,
    ...divProps
  } = props;

  const [showTableRow, setShowTableRow] = useState<
    | undefined
    | {
        tableName: string;
        columnName: string;
        columnValue: string | number;
        tableHandler: Partial<TableHandlerClient<AnyObject, void>>;
      }
  >();
  const [showTableRecords, setShowTableRecords] = useState<
    | undefined
    | {
        tableName: string;
        filter: AnyObject;
        tableHandler: Partial<TableHandlerClient<AnyObject, void>>;
      }
  >();

  const CodeComponent = useCallback(
    ({
      node,
      className,
      ...props
    }: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & { node?: any }) => {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const codeString = props.children?.toString() ?? "";

      if (!codeString || !className || !language || language === "markdown") {
        const isSingleWord =
          !codeString.includes("\n") && !codeString.includes(" ");

        if (isSingleWord) {
          <code {...props} />;
        }
        return (
          <code {...props} style={{ ...props.style, whiteSpace: "pre-line" }} />
        );
      }

      const shortenedMap = {
        tsx: "typescript",
        ts: "typescript",
        js: "javascript",
        py: "python",
      };

      return (
        <MonacoCodeInMarkdown
          key={codeString}
          codeHeader={codeHeader}
          language={getProperty(shortenedMap, language) ?? language}
          codeString={codeString}
          sqlHandler={sqlHandler}
          loadedSuggestions={loadedSuggestions}
        />
      );
    },
    [codeHeader, sqlHandler, loadedSuggestions],
  );

  const { onErrorAlert } = useOnErrorAlert();

  return (
    <>
      {showTableRow && prgl && (
        <SmartForm
          asPopup={true}
          confirmUpdates={true}
          db={prgl.db}
          sql={prgl.sql}
          methods={prgl.methods}
          tables={prgl.tables}
          tableName={showTableRow.tableName}
          rowFilter={[
            {
              fieldName: showTableRow.columnName,
              value: showTableRow.columnValue,
            },
          ]}
          onClose={() => setShowTableRow(undefined)}
        />
      )}
      {showTableRecords && prgl && (
        <SmartTable
          onClosePopup={() => setShowTableRecords(undefined)}
          db={prgl.db}
          sql={prgl.sql}
          methods={prgl.methods}
          tables={prgl.tables}
          tableName={showTableRecords.tableName}
          filter={showTableRecords.filter as DetailedFilter[]}
        />
      )}
      <MarkdownWithPlugins
        {...divProps}
        components={{
          code: CodeComponent,
          a: ({ node, ...props }) => {
            const { href } = props;
            const tableNameRaw = props[JOINED_RECORD_PROP_NAMES.tableName] as
              string | undefined;
            const filterRaw = props[JOINED_RECORDS_PROP_NAMES.filter] as
              string | undefined;
            const columnName = props[JOINED_RECORD_PROP_NAMES.columnName] as
              string | undefined;
            const columnValue = props[JOINED_RECORD_PROP_NAMES.columnValue] as
              string | number | undefined;

            /** It messes it up frequently */
            const getTableHandler = (name: string, isEscaped = false) => {
              if (!prgl) return undefined;
              const tableName = !isEscaped ? name : JSON.stringify(name);
              if (!Object.hasOwn(prgl.db, tableName)) {
                if (!isEscaped) {
                  return getTableHandler(tableName, true);
                }
                return undefined;
              }
              const tableHandler = prgl.db[tableName] as
                TableHandlerClient | undefined;
              if (!tableHandler) return undefined;
              return { tableName, tableHandler };
            };

            const dbTable =
              tableNameRaw ? getTableHandler(tableNameRaw) : undefined;
            if (
              dbTable &&
              columnName &&
              columnValue &&
              href ===
                ("#record" satisfies keyof typeof JOINED_RECORD_PROP_NAMES)
            ) {
              const { tableHandler, tableName } = dbTable;
              return (
                <a
                  {...props}
                  className="link"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTableRow({
                      tableName,
                      columnName,
                      columnValue,
                      tableHandler,
                    });
                  }}
                />
              );
            }

            if (
              dbTable &&
              filterRaw &&
              href ===
                ("#records" satisfies keyof typeof JOINED_RECORDS_PROP_NAMES)
            ) {
              const { tableHandler, tableName } = dbTable;
              const filterValidation = tryCatchV2(() => ({
                filter: JSON.parse(filterRaw),
              }));

              return (
                <a
                  {...props}
                  className="link"
                  style={
                    filterValidation.error ? { color: "var(--danger)" } : {}
                  }
                  onClick={async (e) => {
                    e.preventDefault();

                    await onErrorAlert(async () => {
                      if (!filterValidation.data) {
                        throw new Error(`Invalid JSON filter`);
                      }
                      await tableHandler.find(filterValidation.data.filter, {
                        limit: 0,
                        select: [],
                      });
                      setShowTableRecords({
                        tableName,
                        tableHandler,
                        filter: filterValidation.data.filter,
                      });
                    });
                  }}
                />
              );
            }
            return (
              <a
                {...props}
                className="link"
                target={props.href?.startsWith("#") ? undefined : "_blank"}
                rel={props.href?.startsWith("#") ? undefined : "noreferrer"}
              />
            );
          },
        }}
        content={content}
      />
    </>
  );
};

export const JOINED_RECORD_PROP_NAMES = {
  "#record": "href",
  tableName: "data-table-name",
  columnName: "data-column-name",
  columnValue: "data-column-value",
} as const;

export const JOINED_RECORDS_PROP_NAMES = {
  "#records": "href",
  tableName: "data-table-name",
  filter: "data-filter",
} as const;
