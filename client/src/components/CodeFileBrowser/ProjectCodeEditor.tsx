import { FileTree } from "@components/FileTree/FileTree";
import { FlexRow } from "@components/Flex";
import { FullscreenWrapper } from "@components/FullscreenWrapper/FullscreenWrapper";
import { MONACO_READONLY_DEFAULT_OPTIONS } from "@components/MonacoEditor/MonacoEditor";
import React from "react";
import { CodeEditorWithSaveButton } from "src/dashboard/CodeEditor/CodeEditorWithSaveButton";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { useProjectCodeEditor } from "./useProjectCodeEditor";

type SourcePosition = {
  fileName: string;
  startLineNumber: number;
  endLineNumber: number;
};

export const ProjectCodeEditor = ({
  projectPath,
  sourcePosition,
  title,
}: {
  projectPath: string;
  sourcePosition?: SourcePosition;
  title: React.ReactNode;
}) => {
  const {
    dbsMethods: { saveFile },
  } = usePrglCore();

  const { activeFile, activeContent, language, onEditorMount, openFile } =
    useProjectCodeEditor({
      projectPath,
      sourcePosition,
    });

  return (
    <FullscreenWrapper title={title}>
      <FlexRow className="min-w-0 min-h-0 ai-start gap-0 w-full max-w-full f-1">
        <FileTree
          rootPath={projectPath}
          mode={"explorer"}
          selectedFilePath={activeFile?.filePath}
          onFileSelect={(node) => {
            openFile(node.path);
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
              style={{ width: "min(600px, 100%)", minHeight: 200 }}
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
              onMount={onEditorMount}
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
