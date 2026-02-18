import { getProperty } from "@common/utils";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import type { TableHandlerClient } from "prostgles-client";
import type { AnyObject } from "prostgles-types";
import React, { useCallback, useState } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { type Prgl } from "src/App";
import { classOverride, type DivProps } from "../Flex";
import "./Marked.css";
import {
  MonacoCodeInMarkdown,
  type MonacoCodeInMarkdownProps,
} from "./MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import { SmartForm } from "src/dashboard/SmartForm/SmartForm";

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
          className="my-1"
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

  return (
    <ScrollFade
      {...divProps}
      className={classOverride(
        "Marked flex-col o-auto min-w-0 max-w-full",
        divProps.className,
      )}
    >
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
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          pre: React.Fragment,
          code: CodeComponent,
          a: (props) => {
            const { href } = props;
            const tableName = props["data-table-name"] as string | undefined;
            const columnName = props["data-column-name"] as string | undefined;
            const columnValue = props["data-column-value"] as
              | string
              | number
              | undefined;
            if (
              tableName &&
              columnName &&
              columnValue &&
              prgl &&
              Object.hasOwn(prgl.db, tableName) &&
              prgl.db[tableName] &&
              href?.startsWith("#record")
            ) {
              const tableHandler = prgl.db[tableName];
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
      >
        {content}
      </Markdown>
    </ScrollFade>
  );
};
