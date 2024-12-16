import { mdiFileCogOutline, mdiLink } from "@mdi/js";
import { type FileColumnConfig, isEmpty } from "prostgles-types";
import { isDefined } from "prostgles-types";
import React, { useState } from "react";
import Btn from "../../components/Btn";
import { FlexCol } from "../../components/Flex";
import { Icon } from "../../components/Icon/Icon";
import Popup from "../../components/Popup/Popup";
import SearchList from "../../components/SearchList/SearchList";
import { type CommonWindowProps } from "../Dashboard/Dashboard";
import { FileColumnConfigEditor } from "./FileColumnConfigEditor";
import { quickClone } from "../../utils";

export type FileTableConfigReferences = Record<
  string,
  { referenceColumns: Record<string, FileColumnConfig> }
>;

type FileColumnConfigControlsProps = {
  tables: CommonWindowProps["tables"];
  refsConfig?: FileTableConfigReferences | undefined;
  onChange: (newConfig: FileTableConfigReferences) => void;
};
export const FileColumnConfigControls = (
  props: FileColumnConfigControlsProps,
) => {
  const { refsConfig = {}, tables, onChange } = props;
  const linkedTables = tables
    .flatMap((t) => {
      // Exclude mapping/lookup tables
      const isNotLookupTable =
        t.columns.length > 2 || t.columns.some((c) => !c.references?.length);

      const fileColumns = t.columns.filter((c) => c.file);
      const droppedFileColumns = Object.keys(
        refsConfig[t.name]?.referenceColumns ?? {},
      ).filter(
        (colName) =>
          !t.columns.find((c) => c.name === colName) &&
          !fileColumns.find((c) => c.name === colName),
      );
      if (
        (fileColumns.length || droppedFileColumns.length) &&
        isNotLookupTable
      ) {
        return [
          ...fileColumns.map((fileColumn) => {
            return {
              ...t,
              key: `${t.name}.${fileColumn.name}`,
              columnName: fileColumn.name,
              fileColumn,
            };
          }),
          ...droppedFileColumns.map((columnName) => {
            return {
              ...t,
              key: `${t.name}.${columnName}`,
              columnName,
              fileColumn: undefined,
              wasDropped: true,
            };
          }),
        ];
      }
    })
    .filter(isDefined);
  const [editColumn, setEditColumn] = useState<(typeof linkedTables)[number]>();
  const [error, setError] = useState<any>();

  if (!linkedTables.length) return null;

  return (
    <FlexCol className="FileColumnConfigControls w-fit min-h-0 mt-1">
      {editColumn && (
        <Popup
          title={`Configure ${editColumn.name}.${editColumn.columnName}`}
          onClose={() => setEditColumn(undefined)}
          positioning="center"
          persistInitialSize={true}
          contentClassName="pl-2 p-1 pb-2"
          contentStyle={{ paddingBottom: "100px" }}
          footerButtons={[
            {
              label: "Done",
              color: "action",
              variant: "filled",
              onClickClose: true,
            },
          ]}
        >
          <FileColumnConfigEditor
            refsConfig={refsConfig}
            tableName={editColumn.name}
            columnName={editColumn.columnName}
            onChange={onChange}
            onSetError={setError}
          />
        </Popup>
      )}
      <SearchList
        className="b b-color"
        items={linkedTables.map((linkedTable, i) => {
          return {
            key: linkedTable.key,
            rowStyle:
              !linkedTable.fileColumn ? { border: "1px solid var(--danger)" }
              : !i ? undefined
              : { borderTop: `1px solid var(--b-color)` },
            subLabel:
              linkedTable.fileColumn ?
                getFileColumnConfigDescription(linkedTable.fileColumn.file!)
                  .full
              : "Missing from table",
            contentLeft: <Icon path={mdiLink} className="mr-p5" />,
            contentRight:
              linkedTable.fileColumn ?
                <Btn
                  title="Configure allowed file types and limits"
                  color="action"
                  iconPath={mdiFileCogOutline}
                  onClick={() => {
                    setEditColumn(linkedTable);
                  }}
                >
                  Configure
                </Btn>
              : <Btn
                  color="danger"
                  onClickPromise={async () => {
                    const newConfig = quickClone({ ...refsConfig });
                    delete newConfig[linkedTable.name]!.referenceColumns[
                      linkedTable.columnName
                    ];
                    if (
                      isEmpty(newConfig[linkedTable.name]?.referenceColumns)
                    ) {
                      delete newConfig[linkedTable.name];
                    }
                    onChange(newConfig);
                  }}
                >
                  Remove config
                </Btn>,
          };
        })}
      />
    </FlexCol>
  );
};

const getFileColumnConfigDescription = (fc: FileColumnConfig) => {
  const getStrValue = (spec: string[] | Record<string, any>) =>
    Array.isArray(spec) ?
      spec.join(", ")
    : Object.entries(spec)
        .filter(([t, v]) => v)
        .map((e) => e[0])
        .join(", ");

  let contentType = "any file type";
  if (
    "acceptedContent" in fc &&
    fc.acceptedContent &&
    fc.acceptedContent !== "*"
  ) {
    contentType = getStrValue(fc.acceptedContent);
  } else if (
    "acceptedFileTypes" in fc &&
    fc.acceptedFileTypes &&
    fc.acceptedFileTypes !== "*"
  ) {
    contentType = getStrValue(fc.acceptedFileTypes);
  } else if (
    "acceptedContentType" in fc &&
    fc.acceptedContentType &&
    fc.acceptedContentType !== "*"
  ) {
    contentType = getStrValue(fc.acceptedContentType);
  }

  const sizeLimit = `up to ${fc.maxFileSizeMB ?? 100}MB`;
  return {
    sizeLimit,
    contentType,
    full: `${contentType}, ${sizeLimit}`,
  };
};
