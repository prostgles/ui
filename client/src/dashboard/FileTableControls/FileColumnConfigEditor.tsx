import type { FieldFilter, FileColumnConfig } from "prostgles-types";
import {
  CONTENT_TYPE_TO_EXT,
  getKeys,
  isDefined,
  isObject,
} from "prostgles-types";
import React, { useEffect } from "react";
import ButtonGroup from "../../components/ButtonGroup";
import { FlexCol } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { InfoRow } from "../../components/InfoRow";
import SearchList from "../../components/SearchList/SearchList";
import type { FileTableConfigReferences } from "./FileColumnConfigControls";

const CONTENT_MODES = [
  { key: "By basic content type", subLabel: "image, video, audio ..." },
  { key: "By content type", subLabel: "image/jpeg, text/plain ..." },
  { key: "By extension type", subLabel: ".pdf, .svg, .mp4 ..." },
] as const;

type FileColumnConfigProps = {
  tableName: string;
  columnName: string;
  refsConfig: FileTableConfigReferences;
  onChange: (newConfig: FileTableConfigReferences) => void;
  onSetError: (error?: any) => void;
};
export const FileColumnConfigEditor = ({
  tableName,
  columnName,
  refsConfig,
  onChange,
  onSetError,
}: FileColumnConfigProps) => {
  let contentMode: (typeof CONTENT_MODES)[number]["key"] = CONTENT_MODES[0].key;

  const isChecked = (col: string, fieldFilter: FieldFilter): boolean => {
    return (
      fieldFilter === "*" ||
      (Array.isArray(fieldFilter) && fieldFilter.includes(col)) ||
      (isObject(fieldFilter) && fieldFilter[col])
    );
  };
  const colConfig: FileColumnConfig = refsConfig[tableName]?.referenceColumns[
    columnName
  ] ?? { acceptedContent: "*" };

  let fullOptions: readonly { key: string; checked: boolean }[] = [];

  const updateMergeColConfig = (colConfig: FileColumnConfig) => {
    const newConfig = getMergedRefFileColConfig({
      colConfig,
      columnName,
      tableName,
      refsConfig,
    });
    onChange(newConfig);
  };

  let onChangeOpts = (opts: string[]) => {};
  if (
    getKeys(colConfig).every((k) => (k as any) === "maxFileSizeMB") ||
    ("acceptedContent" in colConfig && colConfig.acceptedContent)
  ) {
    contentMode = "By basic content type";
    const CONTENT_OPTIONS = [
      "audio",
      "video",
      "image",
      "text",
      "application",
    ] as const;
    fullOptions = CONTENT_OPTIONS.map((key) => ({
      key,
      checked: isChecked(
        key,
        "acceptedContent" in colConfig ? colConfig.acceptedContent : "*",
      ),
    }));
    onChangeOpts = (opts) => {
      updateMergeColConfig({
        acceptedContent: opts.length === fullOptions.length ? "*" : opts,
        //@ts-ignore
        acceptedFileTypes: undefined,
        acceptedContentType: undefined,
      });
    };
  } else if (
    "acceptedContentType" in colConfig &&
    colConfig.acceptedContentType
  ) {
    contentMode = "By content type";
    fullOptions = getKeys(CONTENT_TYPE_TO_EXT).map((key) => ({
      key,
      checked: isChecked(key, colConfig.acceptedContentType),
    }));
    onChangeOpts = (opts) => {
      const acceptedContentType: Extract<
        FileColumnConfig,
        { acceptedContentType: any }
      > = {
        acceptedContentType:
          opts.length === fullOptions.length ? "*" : (opts as any),
      };
      updateMergeColConfig({
        acceptedContentType,
        acceptedContent: undefined,
        //@ts-ignore
        acceptedFileTypes: undefined,
      });
    };
  } else if ("acceptedFileTypes" in colConfig && colConfig.acceptedFileTypes) {
    contentMode = "By extension type";
    fullOptions = Object.values(CONTENT_TYPE_TO_EXT)
      .flat()
      .flatMap((key) => ({
        key,
        subLabel: getKeys(CONTENT_TYPE_TO_EXT).find((cType) =>
          CONTENT_TYPE_TO_EXT[cType].includes(key as never),
        ),
        checked: isChecked(key, colConfig.acceptedFileTypes),
      }));
    onChangeOpts = (opts) => {
      updateMergeColConfig({
        //@ts-ignore
        acceptedFileTypes: opts.length === fullOptions.length ? "*" : opts,
        acceptedContent: undefined,
        acceptedContentType: undefined,
      });
    };
  }

  const selectedOpts = fullOptions.filter((o) => o.checked);

  const error =
    fullOptions.length && fullOptions.every((v) => !v.checked) ?
      "Must select at least one option"
    : undefined;
  useEffect(() => {
    onSetError(error);
  }, [error, onSetError]);

  return (
    <FlexCol className="f-1 min-h-0 gap-2">
      <FormField
        asColumn={true}
        type="number"
        label="Maximum file size in megabytes"
        value={colConfig.maxFileSizeMB ?? 1}
        onChange={(e) => {
          updateMergeColConfig({ ...colConfig, maxFileSizeMB: +e });
        }}
      />
      <ButtonGroup
        label={"Content filter mode"}
        options={CONTENT_MODES.map((cm) => cm.key)}
        value={contentMode}
        onChange={(newMode) => {
          updateMergeColConfig(
            newMode === "By basic content type" ?
              {
                acceptedContent: "*",
                acceptedFileTypes: undefined,
                acceptedContentType: undefined,
              }
            : newMode === "By content type" ?
              {
                acceptedContentType: "*",
                acceptedFileTypes: undefined,
                acceptedContent: undefined,
              }
            : {
                acceptedFileTypes: "*",
                acceptedContent: undefined,
                acceptedContentType: undefined,
              },
          );
        }}
      />
      <SearchList
        label={`Allowed types (${selectedOpts.length}/${fullOptions.length})`}
        className="w-fit f-1 min-h-0"
        style={{ maxHeight: "30vh", minHeight: "300px" }}
        items={fullOptions.map((o) => ({
          ...o,
          onPress: () => {
            const newItems = fullOptions
              .filter((d) => (d.key === o.key ? !d.checked : d.checked))
              .map((d) => d.key)
              .filter(isDefined);
            onChangeOpts(newItems);
          },
        }))}
        onMultiToggle={(items) => {
          const newItems = items
            .filter((d) => d.checked)
            .map((d) => d.key)
            .filter(isDefined);
          onChangeOpts(newItems as string[]);
        }}
      />
      {error && (
        <InfoRow variant="filled" color="danger">
          {error}
        </InfoRow>
      )}
    </FlexCol>
  );
};

export const getMergedRefFileColConfig = ({
  colConfig,
  columnName,
  refsConfig,
  tableName,
}: {
  refsConfig: FileTableConfigReferences;
  tableName: string;
  columnName: string;
  colConfig: FileColumnConfig;
}) => {
  const _refTableConfig = refsConfig[tableName];
  const refTableConfig: {
    referenceColumns: Record<string, FileColumnConfig>;
  } = isObject(_refTableConfig) ? _refTableConfig : { referenceColumns: {} };

  return {
    ...refsConfig,
    [tableName]: {
      ...refTableConfig,
      referenceColumns: {
        ...refTableConfig.referenceColumns,
        [columnName]: {
          ...(refTableConfig.referenceColumns[columnName] ?? {}),
          ...colConfig,
        },
      },
    },
  };
};
