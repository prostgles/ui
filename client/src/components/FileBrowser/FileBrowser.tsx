import { isDefined } from "@common/filterUtils";
import { FlexCol } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { Label } from "@components/Label";
import { SearchList } from "@components/SearchList/SearchList";
import {
  mdiBash,
  mdiCodeJson,
  mdiDocker,
  mdiFileDocument,
  mdiFolderOutline,
  mdiLanguageGo,
  mdiLanguageHtml5,
  mdiLanguageJavascript,
  mdiLanguageMarkdown,
  mdiLanguagePython,
  mdiLanguageRuby,
  mdiLanguageTypescript,
} from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { usePromise } from "prostgles-client";
import React from "react";
import { bytesToSize } from "src/dashboard/BackupAndRestore/BackupsControls";
import { FileBrowserCurrentDirectory } from "./FileBrowserCurrentDirectory";

type P = {
  title?: string;
  path: string | undefined;
  onChange: (filePath: string) => void;
};

export const FileBrowser = ({ title, path, onChange }: P) => {
  const {
    dbsMethods: { glob },
  } = usePrgl();

  const pathFiles = usePromise(async () => {
    const result = glob ? await glob(path) : undefined;
    if (!path && result?.path) {
      onChange(result.path);
    }
    return result;
  }, [glob, path, onChange]);

  const sortedPathFiles = React.useMemo(() => {
    if (!pathFiles?.result) return;
    return [...pathFiles.result].sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === "directory" ? -1 : 1;
    });
  }, [pathFiles?.result]);

  return (
    <FlexCol className="min-h-0 gap-0">
      {title && <Label className="mb-2">{title}</Label>}
      {path !== undefined && (
        <FileBrowserCurrentDirectory
          path={path}
          onChange={onChange}
          existingFolderNames={
            pathFiles?.result
              .map((p) => (p.type === "directory" ? p.name : undefined))
              .filter(isDefined) ?? []
          }
        />
      )}
      <SearchList
        key={path}
        className="f-1 min-h-0 mt-p5"
        style={{ maxHeight: "600px" }}
        inputProps={{
          autoFocus: true,
        }}
        placeholder="Search files and folders"
        limit={500}
        noSearchLimit={0}
        noResultsContent={<div className="p-1 bg-color-1">Empty folder</div>}
        items={
          sortedPathFiles?.map(
            ({ path, type, created, lastModified, name, size }) => {
              const extension = name.toLowerCase().split(".").at(-1);
              return {
                key: path,
                label: name,
                rowStyle: { paddingLeft: "0" },
                contentLeft: (
                  <Icon
                    path={
                      type === "directory" ? mdiFolderOutline : (
                        FILE_EXTENSION_TO_ICON_INFO[extension ?? ""]
                          ?.iconPath || mdiFileDocument
                      )
                    }
                    className="mr-p5"
                  />
                ),
                onPress: () => {
                  onChange(path);
                },
                disabledInfo:
                  type === "directory" ? undefined : "Select directories only",
                contentRight: size ? <>{bytesToSize(size)}</> : null,
                subLabel: `${
                  lastModified ?
                    new Date(lastModified).toISOString().split("T")[0] +
                    " modified"
                  : ""
                } ${created ? new Date(created).toISOString().split("T")[0] + " created" : ""} `,
              };
            },
          ) ?? []
        }
      />
    </FlexCol>
  );
};

export const FILE_EXTENSION_TO_ICON_INFO: Record<
  string,
  { label: string; iconPath?: string }
> = {
  ts: { iconPath: mdiLanguageTypescript, label: "typescript" },
  js: { iconPath: mdiLanguageJavascript, label: "javascript" },
  py: { iconPath: mdiLanguagePython, label: "python" },
  rb: { iconPath: mdiLanguageRuby, label: "ruby" },
  go: { iconPath: mdiLanguageGo, label: "go" },
  sh: { iconPath: mdiBash, label: "shell" },
  dockerfile: { iconPath: mdiDocker, label: "dockerfile" },
  txt: { label: "plaintext" },
  json: { iconPath: mdiCodeJson, label: "json" },
  yaml: { label: "yaml" },
  css: { label: "css" },
  html: { label: "html", iconPath: mdiLanguageHtml5 },
  md: { iconPath: mdiLanguageMarkdown, label: "markdown" },
  sql: { label: "sql" },
  Dockerfile: { iconPath: mdiDocker, label: "dockerfile" },
};
