import { useCallback } from "react";
import { tryCatchV2 } from "../../dashboard/WindowControls/TimeChartLayerOptions";
import { fixIndent } from "../../demo/sqlVideoDemo";

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
        // onSend("", file, file.name, file.type);
        onAddFiles(Array.from(files));
      } else {
        const types = e.clipboardData.types;
        const vsCodeTypes = [
          "application/vnd.code.copymetadata",
          "vscode-editor-data",
        ];
        if (vsCodeTypes.some((vsType) => types.includes(vsType))) {
          const text = e.clipboardData.getData("text/plain");
          const vsData = e.clipboardData.getData("vscode-editor-data");
          const { data: languageRaw = "" } = tryCatchV2(() => {
            const result = JSON.parse(vsData).mode;
            return result as string;
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
            )[languageRaw] ?? languageRaw;

          const codeSnippetText = [
            "```" + language,
            fixIndent(text),
            "```",
          ].join("\n");
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
  let beforeText = textarea.value.substring(0, startPos);
  let afterText = textarea.value.substring(endPos);

  if (beforeText.length) {
    beforeText = beforeText + "\n";
  }
  if (afterText.length) {
    afterText = "\n" + afterText;
  }
  // Set the new value with the pasted text inserted
  textarea.value = beforeText + text + afterText;

  // Move the cursor to after the inserted text
  const newCursorPos = startPos + text.length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);
};
