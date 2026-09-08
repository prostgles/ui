import { FILE_EXTENSION_TO_ICON_INFO } from "@components/FileTree/FILE_EXTENSION_TO_ICON_INFO";
import { FileTree } from "@components/FileTree/FileTree";
import { FlexRow } from "@components/Flex";
import { FullscreenWrapper } from "@components/FullscreenWrapper/FullscreenWrapper";
import { MONACO_READONLY_DEFAULT_OPTIONS } from "@components/MonacoEditor/MonacoEditor";
import React, { useMemo, useState } from "react";
import type { LanguageConfig } from "src/dashboard/CodeEditor/CodeEditor";
import { CodeEditorWithSaveButton } from "src/dashboard/CodeEditor/CodeEditorWithSaveButton";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

export const ProjectCodeEditor = ({
  projectPath,
  title,
}: {
  projectPath: string;
  title: React.ReactNode;
}) => {
  const {
    dbsMethods: { readFile, saveFile },
  } = usePrglCore();

  const [activeFile, setActiveFile] = useState<{
    filePath: string;
    content: string;
  }>();
  const activeContent = activeFile?.content ?? "";
  const extension =
    activeFile?.filePath.toLowerCase().split(".").at(-1) ?? "txt";
  const language = useMemo(() => {
    if (extension === "ts") {
      return {
        lang: "typescript",
        environment: "nodejs",
        modelFileName: activeFile?.filePath ?? "file.ts",
        projectPath,
      } as const satisfies LanguageConfig;
    }
    return FILE_EXTENSION_TO_ICON_INFO[extension]?.label ?? "plaintext";
  }, [activeFile, extension, projectPath]);
  return (
    <FullscreenWrapper title={title}>
      <FlexRow className="min-w-0 min-h-0 ai-start gap-0 w-full max-w-full f-1">
        <FileTree
          rootPath={projectPath}
          mode={"explorer"}
          selectedFilePath={activeFile?.filePath}
          onFileSelect={(node) => {
            void readFile?.({ filePath: node.path }).then((content) => {
              setActiveFile({
                filePath: node.path,
                content,
              });
            });
          }}
        />
        <FlexRow className="o-auto f-1 w-full h-full ai-start">
          {activeFile && (
            <CodeEditorWithSaveButton
              key={activeFile.filePath}
              className="f-1 h-full"
              codeEditorClassName={"bl"}
              language={language}
              label=""
              value={activeContent}
              // style={{ width: "min(600px, 100%)", minHeight: 200 }}
              onSave={
                !saveFile ? undefined : (
                  async (newValue) => {
                    await saveFile({
                      filePath: activeFile.filePath,
                      content: newValue,
                    });
                  }
                )
              }
              options={monacoOptions}
            />
          )}
        </FlexRow>
      </FlexRow>
    </FullscreenWrapper>
  );
};

const monacoOptions = {
  ...MONACO_READONLY_DEFAULT_OPTIONS,
  readOnly: false,
  lineNumbers: "on",
} as const;
