import { getCommandElemSelector } from "../../Testing";
import { tout } from "../../pages/ElectronSetup";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { triggerCharacters } from "../SQLEditor/SQLCompletion/registerSuggestions";
import type { SQLEditorRef } from "../SQLEditor/SQLEditor";
import type { SQLHandler } from "prostgles-types";

export type TypeOpts = {
  msPerChar?: number;
  triggerMode?: "off" | "firstChar";
  newLinePress?: boolean;
};
export type TypeAutoOpts = {
  /**
   * Which suggestion to accept. -1 to not accept any
   */
  nth?: number;
  /**
   * If true then will not accept any suggestion. Used for demos where we want to cycle through suggestions
   */
  dontAccept?: boolean;
  /**
   * Wait after accepting and before resolving the promise
   */
  wait?: number;
  /**
   * Wait after triggering the suggestions
   */
  waitAccept?: number;
  /**
   * Wait before accepting the selected option
   */
  waitBeforeAccept?: number;
  onEnd?: VoidFunction;
} & TypeOpts;

export const runDbSQL: SQLHandler = async (...args: any[]) => {
  try {
    return await (window as any).db?.sql(...args);
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export type DemoUtils = ReturnType<typeof getDemoUtils>;
export type DemoScript = (utils: DemoUtils) => Promise<void>;
export const getDemoUtils = (w: Pick<WindowSyncItem<"sql">, "id">) => {
  const getEditors = () => {
    const editors = document.querySelectorAll<HTMLDivElement>(
      `[data-box-id=${JSON.stringify(w.id)}] .ProstglesSQL`,
    );
    if (!editors.length) throw "Editor not found";
    if (editors.length > 1) throw "Multiple editors found";
    return Array.from(editors);
  };
  const getEditor = () => {
    const editor = getEditors()[0];
    if (!editor) throw "Editor not found";
    const e = ((editor as any).sqlRef as SQLEditorRef).editor;
    return { editor, e };
  };

  const getTriggerFor = (action: string) => {
    return async (times = 1, delay = 20) => {
      for (let i = times; i > 0; i--) {
        getEditor().e.trigger("demo", action, {});
        await tout(delay);
      }
    };
  };
  const moveCursor = {
    left: getTriggerFor("cursorLeft"),
    down: getTriggerFor("cursorDown"),
    right: getTriggerFor("cursorRight"),
    up: getTriggerFor("cursorUp"),
    lineEnd: getTriggerFor("cursorLineEnd"),
    lineStart: getTriggerFor("cursorLineStart"),
    pageUp: getTriggerFor("cursorPageUp"),
    pageDown: getTriggerFor("cursorPageDown"),
    setPosition: (line: number, column: number) =>
      getEditor().e.setPosition({ lineNumber: line, column }),
  };
  const triggerSuggest = () => {
    if (window.getSelection()?.toString()) {
      return;
    }
    getEditor().e.trigger("demo", "editor.action.triggerSuggest", {});
  };
  const triggerParamHints = () =>
    getEditor().e.trigger("demo", "editor.action.triggerParameterHints", {});
  const acceptSelectedSuggestion = () =>
    getEditor().e.trigger("demo", "acceptSelectedSuggestion", {});

  const newLine = (n = 1) => {
    getEditor().e.trigger("", "editor.action.insertLineAfter", {});
    const remaining = n - 1;
    if (remaining > 0) {
      newLine(remaining);
    }
  };
  const typeText = (
    v: string,
    onEnd?: (triggeredSuggest: boolean) => void,
    opts?: TypeOpts,
  ) => {
    const { msPerChar = 80, triggerMode, newLinePress } = opts ?? {};
    const chars = v.split("");
    let triggered = 0;
    const press = async () => {
      const char = chars.shift();
      if (newLinePress && char === "\n") {
        // disabled cause it affects inline constraint indentation
        newLine();
      } else {
        getEditor().e.trigger("keyboard", "type", { text: char });
        if (
          (!triggered &&
            !triggerMode &&
            triggerCharacters.includes(char as any)) ||
          (!triggered &&
            triggerMode === "firstChar" &&
            char?.match(/^[a-z0-9]+$/i))
        ) {
          triggered++;
          // triggerSuggest();
          await tout(500);
        }
      }

      if (chars.length) {
        setTimeout(press, msPerChar);
      } else {
        onEnd?.(triggered > 0);
      }
    };
    press();
  };

  const typeAuto = (text: string, opts?: TypeAutoOpts) => {
    const {
      nth = 0,
      wait = 0,
      waitAccept = 600,
      waitBeforeAccept = 0,
      dontAccept,
      onEnd,
      ...typeOpts
    } = opts ?? {};
    return new Promise((resolve, reject) => {
      typeText(
        text,
        (triggeredSuggest) => {
          if (nth > -1 && !triggeredSuggest) {
            triggerSuggest();
          }
          setTimeout(async () => {
            if (nth > -1) {
              for (let n = 0; n < nth; n++) {
                await tout(100);
                getEditor().e.trigger("demo", "selectNextSuggestion", {});
                await tout(500);
              }
              if (!dontAccept) {
                if (waitBeforeAccept) await tout(waitBeforeAccept);
                getEditor().e.trigger("demo", "acceptSelectedSuggestion", {});
              }
            }
            setTimeout(async () => {
              if (wait) await tout(wait);
              await onEnd?.();
              resolve(1);
            }, 10);
          }, waitAccept);
        },
        typeOpts,
      );
    });
  };

  const goToNextSnipPos = () => {
    //@ts-ignore
    getEditor().e.getContribution("snippetController2")?.next();
  };
  const goToNextLine = () => {
    moveCursor.down();
  };
  const sqlAction = async (type: "kill-query" | "stop-listen" | "run") => {
    await tout(50);
    const selector =
      type === "stop-listen" ? "dashboard.window.stopListen"
      : type === "kill-query" ? "dashboard.window.cancelQuery"
      : "dashboard.window.runQuery";
    const button = getEditor().editor.querySelector<HTMLButtonElement>(
      getCommandElemSelector(selector),
    );
    if (!button) throw type + " button not found";
    button.click();
    await tout(1300);
  };
  const runSQL = async () => sqlAction("run");
  const fromBeginning = (withNewline = true, text?: string) => {
    const editorOpts = getEditor();
    editorOpts.e.setValue(text ?? "");
    if (text) {
      moveCursor.pageDown();
    }
    if (withNewline) {
      newLine();
    }
  };

  const testResult = (expected: string, editorValue?: string): void => {
    const model = getEditor().e.getModel();
    const actual =
      editorValue ?? model?.getValue()?.replaceAll(model.getEOL(), "\n") ?? "";
    if (!expected) {
      throw "empty expected value";
    }
    if (!expected.includes(actual.trim())) {
      const error = `Script\n\n${expected} \n\ndoes not match the editor value. Editor value: \n\n${actual.trim()}`;
      console.error("Expected: \n", expected);
      console.error("Actual: \n", actual);
      confirm(error);
      throw error;
    }
  };

  const selectCodeBlock = () => getEditor().e.trigger("demo", "select2CB", {});
  const getCodeBlockValue = async () => {
    await selectCodeBlock();
    await tout(500);
    const value = window.getSelection()?.toString();
    return value;
  };
  const actions = {
    selectCodeBlock,
    getCodeBlockValue,
  };

  return {
    runSQL,
    fromBeginning,
    typeText,
    typeAuto,
    goToNextSnipPos,
    goToNextLine,
    sqlAction,
    runDbSQL,
    triggerSuggest,
    acceptSelectedSuggestion,
    triggerParamHints,
    newLine,
    moveCursor,
    triggerCharacters,
    testResult,
    getEditor,
    getEditors,
    actions,
  };
};
