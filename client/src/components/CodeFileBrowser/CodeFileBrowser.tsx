import { FILE_EXTENSION_TO_ICON_INFO } from "@components/FileTree/FILE_EXTENSION_TO_ICON_INFO";
import { FlexRow } from "@components/Flex";
import { MenuList } from "@components/MenuList";
import { MONACO_READONLY_DEFAULT_OPTIONS } from "@components/MonacoEditor/MonacoEditor";
import { mdiText } from "@mdi/js";
import React, { useMemo, useState } from "react";
import { CodeEditorWithSaveButton } from "src/dashboard/CodeEditor/CodeEditorWithSaveButton";

export const CodeFileBrowser = ({
  files,
  onChange,
}: {
  files: Record<string, string>;
  onChange: (newFile: {
    fileName: string;
    content: string;
  }) => void | Promise<void>;
}) => {
  const [activeFilePath, setActiveFilePath] = useState(Object.keys(files)[0]);
  const activeContent = activeFilePath ? (files[activeFilePath] ?? "") : "";
  const extension = activeFilePath?.toLowerCase().split(".").at(-1) ?? "txt";
  const language = useMemo(() => {
    if (extension === "ts") {
      return {
        lang: "typescript",
        environment: "nodejs",
        modelFileName: activeFilePath ?? "file.ts",
      } as const;
    }
    return FILE_EXTENSION_TO_ICON_INFO[extension]?.label ?? "plaintext";
  }, [activeFilePath, extension]);
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
      <FlexRow className="o-auto f-1 w-full h-full ai-start">
        {activeFilePath && (
          <CodeEditorWithSaveButton
            key={activeFilePath}
            className="f-1 h-full"
            language={language}
            label=""
            value={activeContent}
            // style={{ width: "min(600px, 100%)", minHeight: 200 }}
            onSave={async (newValue) => {
              await onChange({ fileName: activeFilePath, content: newValue });
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
