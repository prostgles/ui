import { isDefined } from "@common/filterUtils";
import type { LLMMessage } from "@common/llmUtils";
import { useOnErrorAlert } from "@components/AlertProvider";
import { usePromise } from "prostgles-client";
import { getSerialisableError } from "prostgles-types";
import { useCallback, useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

export const useChatFileUpload = () => {
  const {
    dbs,
    dbsMethods: { getDocumentText, toggleService },
  } = usePrglCore();
  const [files, setFiles] = useState<File[]>([]);

  const filesWithInfo = usePromise(async () => {
    if (!files.length) return [];
    return Promise.all(
      files.map(async (file) => {
        const base64Data = await blobToBase64(file);
        const isDoc = CONVERTABLE_DOCUMENT_TYPES.includes(file.type);
        return {
          file,
          base64Data,
          docFile:
            isDoc ?
              {
                name: file.name,
                type: file.type,
                data: new Blob([file], { type: file.type }),
              }
            : undefined,
        };
      }),
    );
  }, [files]);
  const [convertDocsToMarkdown, _setConvertDocsToMarkdown] = useState(false);
  const setConvertDocsToMarkdown = useCallback(
    async (value: boolean) => {
      if (value) {
        if (!toggleService) {
          throw new Error(
            "Must be admin to toggle services required for document conversion",
          );
        }
        const docsService = await dbs.services.findOne({
          name: "documents",
        });
        if (!docsService) {
          throw new Error("Documents service is not available.");
        }
        if (docsService.status !== "running") {
          await toggleService({ serviceName: "documents", enable: true });
        }
      }
      _setConvertDocsToMarkdown(value);
    },
    [dbs.services, toggleService],
  );
  const [convertingDocumentName, setConvertingDocumentName] =
    useState<string>();

  const onAddFiles = useCallback(
    (newFiles: File[]) => {
      setFiles((prev) => [...prev, ...newFiles]);
    },
    [setFiles],
  );

  const { onErrorAlert } = useOnErrorAlert();
  const getConvertedDocs = useCallback(async () => {
    const docFilesMessages: LLMMessage["message"] = [];
    const otherFiles = filesWithInfo?.filter((f) => !f.docFile) ?? [];
    const docFiles =
      filesWithInfo?.map((f) => f.docFile).filter(isDefined) ?? [];
    if (!convertDocsToMarkdown || !getDocumentText) {
      return { otherFiles: filesWithInfo, docFilesMessages };
    }
    await onErrorAlert(async () => {
      for (const docFile of docFiles) {
        setConvertingDocumentName(docFile.name);
        try {
          const {
            errors,
            document: { md_content },
          } = await getDocumentText({
            files: [docFile],
          });
          if (!md_content || errors.length) {
            console.error(errors);
            throw new Error(
              `Failed to convert document ${docFile.name} to markdown: ${errors[0]?.message || "Unknown error"}`,
            );
          }
          docFilesMessages.push({
            type: "text-document" as const,
            fileName: docFile.name,
            mimeType: "text/markdown",
            text: md_content,
          });
        } catch (e) {
          console.error(e);
          throw new Error(
            `Failed to convert document ${docFile.name} to markdown: ${JSON.stringify(getSerialisableError(e))}`,
          );
        } finally {
          setConvertingDocumentName(undefined);
        }
      }
    });
    return { docFilesMessages, otherFiles };
  }, [convertDocsToMarkdown, filesWithInfo, getDocumentText, onErrorAlert]);

  return {
    files,
    filesWithInfo,
    convertDocsToMarkdown,
    setConvertDocsToMarkdown,
    convertingDocumentName,
    setConvertingDocumentName,
    onAddFiles,
    getConvertedDocs,
    setFiles,
  };
};

function blobToBase64(blob: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // The result includes the data URL prefix (data:audio/ogg;base64,)
      const { result } = reader;
      if (result && typeof result !== "string") {
        reject(new Error("Failed to convert blob to base64 string"));
        return;
      }
      const base64String = result?.toString() || "";
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const CONVERTABLE_DOCUMENT_TYPES = [
  // Documents
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX

  // Images
  // "image/png",
  // "image/jpeg",
  // "image/tiff",
  // "image/bmp",
  // "image/webp",
];
