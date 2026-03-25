import { useCallback } from "react";
import { tryCatchV2 } from "prostgles-types";
import { fixIndent } from "../../demo/scripts/sqlVideoDemo";

export const useChatOnPaste = ({
  onAddFiles,
  textAreaRef,
  setCurrentMessage,
}: {
  textAreaRef: React.RefObject<HTMLTextAreaElement>;
  setCurrentMessage: (msg: string) => void;
  onAddFiles: (files: File[]) => void;
}) => {
  const handleOnPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = e.clipboardData.files;
      if (files.length) {
        e.preventDefault();
        onAddFiles(Array.from(files));
      } else {
        const types = e.clipboardData.types;
        const vsCodeTypes = [
          "application/vnd.code.copymetadata",
          "vscode-editor-data",
        ];
        const isAlreadyInsideCodeBlock = (() => {
          const currentMessage = textAreaRef.current?.value || "";
          const selectionStart = textAreaRef.current?.selectionStart || 0;
          const textBeforeCursor = currentMessage.slice(0, selectionStart);
          const codeBlocksBeforeCursor = textBeforeCursor.match(/```/g) || [];
          return codeBlocksBeforeCursor.length % 2 === 1;
        })();
        if (
          !isAlreadyInsideCodeBlock &&
          vsCodeTypes.some((vsType) => types.includes(vsType))
        ) {
          const text = e.clipboardData.getData("text/plain");
          const vsData = e.clipboardData.getData("vscode-editor-data");
          const { data: languageRaw = "" } = tryCatchV2(() => {
            const result = JSON.parse(vsData).mode as string;
            return result;
          });
          /** Ignore single line of text */
          if (text.trim().split("\n").length < 2) {
            return;
          }
          e.preventDefault();
          const language =
            (
              {
                typescriptreact: "tsx",
              } as const
            )[languageRaw] ??
            (languageRaw || "");

          const codeSnippetText =
            text.trim().startsWith("```") ?
              text
            : ["```" + language, fixIndent(text), "```"].join("\n");
          /** If existing text then place correctly */
          if (textAreaRef.current) {
            insertCodeSnippetAtCursor(textAreaRef.current, codeSnippetText);
          } else {
            setCurrentMessage(codeSnippetText);
          }
        }
      }
    },
    [setCurrentMessage, textAreaRef, onAddFiles],
  );
  return {
    handleOnPaste,
  };
};

// Function to insert text at cursor position
const insertCodeSnippetAtCursor = (
  textarea: HTMLTextAreaElement,
  text: string,
) => {
  const startPos = textarea.selectionStart;
  const endPos = textarea.selectionEnd;

  const prefix = startPos > 0 ? "\n" : "";
  const suffix = endPos < textarea.value.length ? "\n" : "";
  const insertedText = prefix + text + suffix;

  // Although deprecated, this is the standard workaround for preserving Undo history.
  const ok = document.execCommand("insertText", false, insertedText);

  if (!ok) {
    // Fallback
    textarea.setRangeText(insertedText, startPos, endPos, "end");
    textarea.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: insertedText,
      }),
    );
  }
};
