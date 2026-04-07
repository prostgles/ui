import type { DBSSchema } from "@common/publishUtils";
import { FILE_EXTENSION_TO_ICON_INFO } from "@components/FileTree/FileIcon";
import { FileTree } from "@components/FileTree/FileTree";
import { FlexRow } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "@components/MonacoEditor/MonacoEditor";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useCallback, useState } from "react";

export const WebAppFileBrowser = ({
  connection,
}: {
  connection: DBSSchema["connections"];
}) => {
  const {
    connectionId,
    dbsMethods: { getWebAppFile },
  } = usePrgl();

  const [currentDirectory, setCurrentDirectory] = useState(
    connection.web_app_directory ?? "",
  );
  const [selectedFilePath, setSelectedFilePath] = useState<string>();
  const [selectedFileContent, setSelectedFileContent] = useState<{
    filePath: string;
    content: string;
    error?: unknown;
  }>();
  const onOpenFile = useCallback(
    (selectedFilePath: string) => {
      setSelectedFilePath(selectedFilePath);
      const relativePath = selectedFilePath.replace(
        connection.web_app_directory + "/",
        "",
      );
      void getWebAppFile?.({
        connectionId,
        relativePath,
      })
        .then((content) => {
          setSelectedFileContent({
            filePath: selectedFilePath,
            content,
          });
        })
        .catch((error) => {
          setSelectedFileContent({
            filePath: selectedFilePath,
            content: "",
            error,
          });
        });
    },
    [connection.web_app_directory, connectionId, getWebAppFile],
  );
  const isLoadingFile = selectedFileContent?.filePath !== selectedFilePath;
  const extension = selectedFilePath?.toLowerCase().split(".").pop() ?? "txt";

  return (
    <FlexRow className="min-w-0 min-h-0 ai-start gap-p25 h-full w-full max-w-full f-1">
      <FileTree
        rootPath={currentDirectory}
        checkBoxes={undefined}
        selectedFilePath={selectedFilePath}
        onFileSelect={(node) => {
          onOpenFile(node.path);
        }}
      />
      <FlexRow className="f-1 w-full h-full ai-start">
        {!isLoadingFile && selectedFileContent && (
          <MonacoEditor
            className="f-1 h-full b b-color-0"
            language={
              FILE_EXTENSION_TO_ICON_INFO[extension]?.label ?? "plaintext"
            }
            loadedSuggestions={undefined}
            value={selectedFileContent.content}
            style={{ width: "min(600px, 100%)", minHeight: "min(400px, 100%)" }}
            onChange={(newValue) => {
              console.warn({ fileName: currentDirectory, content: newValue });
            }}
            options={monacoOptions}
          />
        )}
        {isLoadingFile && <Loading variant="cover" />}
      </FlexRow>
    </FlexRow>
  );
};

const monacoOptions = {
  ...MONACO_READONLY_DEFAULT_OPTIONS,
  // readOnly: false,
  lineNumbers: "on",
} as const;
