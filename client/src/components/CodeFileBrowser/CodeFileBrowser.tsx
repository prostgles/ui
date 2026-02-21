import { FILE_EXTENSION_TO_ICON_INFO } from "@components/FileBrowser/FileBrowser";
import { FlexRow } from "@components/Flex";
import { MenuList } from "@components/MenuList";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "@components/MonacoEditor/MonacoEditor";
import { mdiText } from "@mdi/js";
import React, { useState } from "react";

export const CodeFileBrowser = ({
  files,
  onChange,
}: {
  files: Record<string, string>;
  onChange: (newFile: { fileName: string; content: string }) => void;
}) => {
  // ADD REACT TYPES FROM node_modules/@types/react/index.d.ts
  // const { dbsMethods } = usePrglCore();
  // const tsTypes = usePromise(async () => {
  //   if (!dbsMethods.getNodeTypes) return;
  //   return await dbsMethods.getNodeTypes();
  // }, [dbsMethods]);

  const [activeFilePath, setActiveFilePath] = useState(Object.keys(files)[0]);
  const activeContent = activeFilePath ? (files[activeFilePath] ?? "") : "";
  const extension = activeFilePath?.toLowerCase().split(".").at(-1) ?? "txt";

  return (
    <FlexRow className="min-w-0 min-h-0 ai-start gap-0 w-full max-w-full f-1">
      <MenuList
        activeKey={activeFilePath}
        items={Object.keys(files).map((filePath) => {
          const ext = filePath.toLowerCase().split(".").pop() ?? "txt";
          return {
            key: filePath,
            label: filePath,
            leftIconPath: FILE_EXTENSION_TO_ICON_INFO[ext]?.iconPath ?? mdiText,
            iconStyle: { opacity: 0.7 },
            onPress: () => {
              setActiveFilePath(filePath);
            },
          };
        })}
        variant="vertical"
        className="pointer bg-color-1 rounded-none"
        style={{ alignSelf: "stretch", fontSize: 14 }}
      />
      <FlexRow className="o-auto f-1 w-full h-full">
        {activeFilePath && (
          <MonacoEditor
            className="f-1 h-full"
            language={
              FILE_EXTENSION_TO_ICON_INFO[extension]?.label ?? "plaintext"
            }
            loadedSuggestions={undefined}
            value={activeContent}
            style={{ width: "min(600px, 100%)", minHeight: 200 }}
            onChange={(newValue) => {
              onChange({ fileName: activeFilePath, content: newValue });
            }}
            options={monacoOptions}
          />
        )}
      </FlexRow>
    </FlexRow>
  );
};

const monacoOptions = {
  ...MONACO_READONLY_DEFAULT_OPTIONS,
  readOnly: false,
  lineNumbers: "on",
} as const;
