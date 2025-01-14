import { isEqual } from "prostgles-types";
import React, { useCallback, useMemo, useRef } from "react";
import { CodeEditorWithSaveButton } from "../../CodeEditor/CodeEditorWithSaveButton";
import type { MethodDefinitionProps } from "./MethodDefinition";
import { useCodeEditorTsTypes } from "./useMethodDefinitionTypes";

export const MethodFunctionDefinition = (props: MethodDefinitionProps) => {
  const {
    onChange,
    method,
    tables,
    connectionId,
    dbsMethods,
    dbKey,
    renderMode,
    dbs,
  } = props;

  const languageObj = useCodeEditorTsTypes({
    connectionId,
    dbsMethods,
    dbKey,
    method,
    tables,
    dbs,
  });

  const onSave = useCallbackDeep(
    (run: string) => {
      onChange({ ...method, run });
    },
    [method, onChange],
  );

  const options = useMemo(() => {
    return {
      glyphMargin: false,
      padding: { top: 16, bottom: 0 },
      lineNumbersMinChars: 4,
    };
  }, []);

  const renderCode = renderMode === "Code";
  if (!languageObj) return null;
  return (
    <CodeEditorWithSaveButton
      label={
        renderCode ? undefined : (
          "Server-side TypeScript function triggered by a button press"
        )
      }
      language={languageObj}
      value={method.run ?? ""}
      options={options}
      autoSave={!renderCode}
      onSave={onSave}
      codeEditorClassName={renderCode ? "b-none" : ""}
    />
  );
};

function useCallbackDeep<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: any[],
): T {
  const ref = useRef<{
    deps: any[];
    cb: T;
    wrapper: T;
  }>();

  if (!ref.current) {
    ref.current = {
      deps: dependencies,
      cb: callback,
      wrapper: callback as T,
    };
  }

  // Update stored callback if it changes
  ref.current.cb = callback;

  const memoizedCallback = useCallback(
    (...args: any[]) => ref.current!.cb(...args),
    [ref],
  );

  if (!isEqual(dependencies, ref.current.deps)) {
    ref.current.deps = dependencies;
    ref.current.wrapper = memoizedCallback as T;
  }

  return ref.current.wrapper;
}
