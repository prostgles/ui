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
  mdiFileDocumentOutline,
  mdiFilePdfBox,
  mdiFolderOutline,
  mdiImage,
  mdiLanguageGo,
  mdiLanguageHtml5,
  mdiLanguageJavascript,
  mdiLanguagePython,
  mdiLanguageRuby,
  mdiLanguageTypescript,
  mdiMicrosoftWord,
  mdiPound,
  mdiReact,
} from "@mdi/js";
import { usePromise } from "prostgles-client";
import React, { useState } from "react";
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
    const result = glob ? await glob({ cwd: currentPath }) : undefined;
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

  const [selectedFolders, setSelectedFolders] = useState<string[]>();
  if (Math.PI && pathFiles) {
    console.log(selectedFolders);
    return (
      <FileSystemTree
        rootPath={pathFiles.path}
        onFileSelect={console.warn}
        checkBoxes={{
          type: "all",
          checkedItems: selectedFolders,
          onCheckedChange: setSelectedFolders,
        }}
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
  { label: string; iconPath?: string; color?: string }
> = {
  ts: {
    iconPath: mdiLanguageTypescript,
    label: "typescript",
    color: "#3178c6",
  },
  mjs: { iconPath: mdiReact, label: "javascript", color: "#cbb60b" },
  cjs: { iconPath: mdiReact, label: "javascript", color: "#cbb60b" },
  jsx: { iconPath: mdiReact, label: "javascript", color: "#34bee4" },
  tsx: { iconPath: mdiReact, label: "typescript", color: "#34bee4" },
  js: {
    iconPath: mdiLanguageJavascript,
    label: "javascript",
    color: "#cbb60b",
  },
  py: { iconPath: mdiLanguagePython, label: "python", color: "#3776ab" },
  rb: { iconPath: mdiLanguageRuby, label: "ruby", color: "#cc342d" },
  go: { iconPath: mdiLanguageGo, label: "go", color: "#00add8" },
  sh: { iconPath: mdiBash, label: "shell", color: "#4fa816" },
  dockerfile: { iconPath: mdiDocker, label: "dockerfile", color: "#2496ed" },
  txt: { label: "plaintext" },
  json: { iconPath: mdiCodeJson, label: "json", color: "#c69b19" },
  yaml: { label: "yaml", color: "#cb171e" },
  css: { iconPath: mdiPound, label: "css", color: "#1572b6" },
  html: { label: "html", iconPath: mdiLanguageHtml5, color: "#e34f26" },
  md: { iconPath: mdiFileDocumentOutline, label: "markdown", color: "#083fa1" },
  pdf: { iconPath: mdiFilePdfBox, label: "pdf", color: "#f40f02" },
  doc: { iconPath: mdiMicrosoftWord, label: "doc", color: "#2b579a" },
  docx: { iconPath: mdiMicrosoftWord, label: "docx", color: "#2b579a" },
  png: { iconPath: mdiImage, label: "png", color: "#af4c99" },
  jpg: { iconPath: mdiImage, label: "jpg", color: "#af4c99" },
  sql: { label: "sql", color: "#336791" },
  Dockerfile: { iconPath: mdiDocker, label: "dockerfile", color: "#2496ed" },
};
