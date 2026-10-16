import { FILE_EXTENSION_TO_ICON_INFO } from "@components/FileTree/FILE_EXTENSION_TO_ICON_INFO";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LanguageConfig } from "src/dashboard/CodeEditor/CodeEditor";
import type { editor } from "src/dashboard/W_SQL/monacoEditorTypes";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

type SourcePosition = {
  fileName: string;
  startLineNumber: number;
  endLineNumber: number;
};

export const useProjectCodeEditor = ({
  projectPath,
  sourcePosition,
}: {
  projectPath: string;
  sourcePosition?: SourcePosition;
}) => {
  const {
    dbsMethods: { readFile },
  } = usePrglCore();

  const [activeFile, setActiveFile] = useState<{
    filePath: string;
    content: string;
  }>();

  const [mountedEditor, setMountedEditor] = useState<{
    filePath: string;
    editor: editor.IStandaloneCodeEditor;
  }>();

  const openFile = useCallback(
    (filePath: string) => {
      void readFile?.({ filePath }).then((content) => {
        setActiveFile({ filePath, content });
      });
    },
    [readFile],
  );

  useEffect(() => {
    if (sourcePosition) {
      openFile(sourcePosition.fileName);
    }
  }, [openFile, sourcePosition]);

  useEffect(() => {
    if (
      !sourcePosition ||
      sourcePosition.fileName !== mountedEditor?.filePath
    ) {
      return;
    }
    selectSource(mountedEditor.editor, sourcePosition);
  }, [mountedEditor, sourcePosition]);

  const onEditorMount = useCallback(
    (editor: editor.IStandaloneCodeEditor) => {
      if (!activeFile?.filePath) return;
      setMountedEditor({ filePath: activeFile.filePath, editor });
    },
    [activeFile?.filePath],
  );

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

  return {
    activeFile,
    activeContent,
    extension,
    language,
    onEditorMount,
    openFile,
  };
};

const selectSource = (
  editor: editor.IStandaloneCodeEditor,
  sourcePosition: SourcePosition,
) => {
  const model = editor.getModel();
  if (!model) return;

  const startLineNumber = Math.max(
    1,
    Math.min(sourcePosition.startLineNumber, model.getLineCount()),
  );
  const endLineNumber = Math.max(
    startLineNumber,
    Math.min(sourcePosition.endLineNumber, model.getLineCount()),
  );
  const selection = {
    startLineNumber,
    startColumn: 1,
    endLineNumber,
    endColumn: model.getLineMaxColumn(endLineNumber),
  };
  editor.setSelection(selection);
  editor.revealRangeInCenter(selection);
  editor.focus();
};
