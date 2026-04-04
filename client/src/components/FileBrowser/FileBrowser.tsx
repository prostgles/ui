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
  mdiPound,
  mdiReact,
} from "@mdi/js";
import { usePromise } from "prostgles-client";
import React from "react";
import { bytesToSize } from "src/dashboard/BackupAndRestore/BackupsControls";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { FileBrowserCurrentDirectory } from "./FileBrowserCurrentDirectory";
import { FileSystemTree } from "./FileSystemTree";

type P = {
  title?: string;
  path: string | undefined;
  filePath?: string;
  onChange: (filePath: string, isDirectory: boolean) => void;
  mode?: "file" | "directory";
};

export const FileBrowser = ({
  title,
  path: currentPath,
  onChange,
  mode = "directory",
  filePath,
}: P) => {
  const {
    dbsMethods: { glob },
  } = usePrglCore();

  const pathFiles = usePromise(async () => {
    const result = glob ? await glob({ path: currentPath }) : undefined;
    if (!currentPath && result?.path) {
      onChange(result.path, true);
    }
    return result;
  }, [glob, currentPath, onChange]);

  const sortedPathFiles = React.useMemo(() => {
    if (!pathFiles?.result) return;
    return [...pathFiles.result].sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === "directory" ? -1 : 1;
    });
  }, [pathFiles?.result]);

  if (Math.PI && pathFiles) {
    return (
      <FileSystemTree
        rootPath={pathFiles.path}
        glob={glob!}
        onFileSelect={console.warn}
      />
    );
  }
  return (
    <FlexCol className="min-h-0 gap-0 max-h-full" data-command="FileBrowser">
      {title && <Label className="mb-2">{title}</Label>}
      {currentPath !== undefined && mode === "directory" && (
        <FileBrowserCurrentDirectory
          path={currentPath}
          className="mb-p5"
          onChange={(newDir) => onChange(newDir, true)}
          existingFolderNames={
            pathFiles?.result
              .map((p) => (p.type === "directory" ? p.name : undefined))
              .filter(isDefined) ?? []
          }
        />
      )}
      <SearchList
        key={currentPath}
        className="f-1 min-h-0 "
        style={{ maxHeight: "600px" }}
        inputProps={{
          autoFocus: true,
        }}
        placeholder="Search files and folders"
        limit={500}
        /** Directory mode needs file create button */
        noSearchLimit={mode === "directory" ? 0 : 9}
        noResultsContent={<div className="p-1 bg-color-1">No matches</div>}
        items={
          sortedPathFiles?.map((item) => {
            const { type, created, lastModified, name, size } = item;
            const isDirectory = type === "directory";
            const extension = name.toLowerCase().split(".").at(-1);
            return {
              key: item.path,
              label: name,
              rowStyle: { paddingLeft: "0" },
              selected: item.path === filePath,
              contentLeft: (
                <Icon
                  path={
                    isDirectory ? mdiFolderOutline : (
                      FILE_EXTENSION_TO_ICON_INFO[extension ?? ""]?.iconPath ||
                      mdiFileDocument
                    )
                  }
                  className="mx-p5"
                />
              ),
              onPress: () => {
                onChange(item.path, isDirectory);
              },
              disabledInfo:
                isDirectory || mode === "file" ?
                  undefined
                : "Select directories only",
              contentRight: size ? <>{bytesToSize(size)}</> : null,
              subLabel: `${
                lastModified ?
                  new Date(lastModified).toISOString().split("T")[0] +
                  " modified"
                : ""
              } ${created ? new Date(created).toISOString().split("T")[0] + " created" : ""} `,
            };
          }) ?? []
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
  mjs: { iconPath: mdiReact, label: "javascript" },
  cjs: { iconPath: mdiReact, label: "javascript" },
  jsx: { iconPath: mdiReact, label: "javascript" },
  tsx: { iconPath: mdiReact, label: "typescript" },
  js: { iconPath: mdiLanguageJavascript, label: "javascript" },
  py: { iconPath: mdiLanguagePython, label: "python" },
  rb: { iconPath: mdiLanguageRuby, label: "ruby" },
  go: { iconPath: mdiLanguageGo, label: "go" },
  sh: { iconPath: mdiBash, label: "shell" },
  dockerfile: { iconPath: mdiDocker, label: "dockerfile" },
  txt: { label: "plaintext" },
  json: { iconPath: mdiCodeJson, label: "json" },
  yaml: { label: "yaml" },
  css: { iconPath: mdiPound, label: "css" },
  html: { label: "html", iconPath: mdiLanguageHtml5 },
  md: { iconPath: mdiLanguageMarkdown, label: "markdown" },
  sql: { label: "sql" },
  Dockerfile: { iconPath: mdiDocker, label: "dockerfile" },
};
