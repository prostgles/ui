import type { BtnProps } from "@components/Btn";
import { FlexCol, FlexRow, classOverride } from "@components/Flex";
import { FullScreenHeader } from "@components/MonacoLogs/MonacoLogsWithFullscreen";
import { FooterButtons } from "@components/Popup/FooterButtons";
import Popup from "@components/Popup/Popup";
import { useEffectDeep } from "prostgles-client";
import React, { useCallback, useRef, useState } from "react";
import { isDefined } from "../../utils/utils";
import { CodeEditor, type CodeEditorProps } from "./CodeEditor";
import Loading from "@components/Loader/Loading";

type P = {
  label: React.ReactNode;
  onSaveButton?: Pick<BtnProps, "children" | "iconPath" | "color" | "size">;
  onSave?: (value: string) => void | Promise<void>;
  autoSave?: boolean;
  value: string | undefined | null;
  codePlaceholder?: string;
  codeEditorClassName?: string;
  headerButtons?: React.ReactNode;
} & Omit<
  CodeEditorProps,
  "onSave" | "onChange" | "value" | "style" | "className"
>;

export const CodeEditorWithSaveButton = (props: P) => {
  const {
    label,
    onSave,
    onSaveButton,
    value,
    codePlaceholder,
    autoSave,
    codeEditorClassName = "b",
    headerButtons,
    ...codeEditorProps
  } = props;
  const isReadonly = !onSave && !autoSave;
  const localValueRef = useRef<string | null | undefined>(value);
  const propsValueRef = useRef<string | null | undefined>(value);
  propsValueRef.current = value;

  const [error, setError] = useState<unknown>();
  const [fullScreen, setFullScreen] = React.useState(false);
  useEffectDeep(() => {
    if (
      localValueRef.current === undefined &&
      localValueRef.current !== value
    ) {
      localValueRef.current = value;
    }
  }, [value, isReadonly]);

  const [didChange, setDidChange] = React.useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const onSaveMonaco = useCallback(async () => {
    if (!didChange || !onSave) return;
    try {
      setIsSaving(true);
      await onSave(localValueRef.current ?? "");
      setError(undefined);
      setDidChange(false);
    } catch (err) {
      setError(err);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, didChange]);

  const onClickSave = !onSave || autoSave ? undefined : onSaveMonaco;

  const titleNode =
    !label && !headerButtons ?
      null
    : <FullScreenHeader fullscreen={fullScreen} setFullscreen={setFullScreen}>
        {label}
        <FlexRow className="gap-0">{headerButtons}</FlexRow>
      </FullScreenHeader>;

  const footerNode = didChange && onClickSave && (
    <FooterButtons
      error={error}
      className="bg-color-1"
      style={{
        maxHeight: "60%",
        alignItems: "start",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        /** Must appear above minimap but beneath completion suggestions */
        zIndex: 5,
        background: error !== undefined ? "var(--bg-color-0)" : "#dfdfdf5c",
        backdropFilter: error !== undefined ? undefined : "blur(1px)",
      }}
      footerButtons={[
        {
          label: "Cancel",
          className: "mr-auto",
          onClick: () => {
            localValueRef.current = value;
            setDidChange(false);
          },
        },
        error ? undefined : (
          {
            label: "Save (Ctrl + S)",
            color: "action",
            variant: "filled",
            ...onSaveButton,
            loading: isSaving,
            onClickPromise: onClickSave,
          }
        ),
      ]}
    />
  );

  const onChange = useCallback(
    (newValue: string) => {
      if (autoSave) {
        void onSave?.(newValue);
      }
      localValueRef.current = newValue;

      const _didChange =
        isDefined(localValueRef.current) &&
        localValueRef.current !== propsValueRef.current;
      if (!autoSave && _didChange !== didChange) {
        setDidChange(_didChange);
      }
      setError(undefined);
    },
    [onSave, autoSave, didChange],
  );

  const content = (
    <FlexCol
      className={classOverride(
        "SmartCodeEditor gap-0 f-1 ",
        `${fullScreen ? "min-h-0" : ""}`,
      )}
    >
      {fullScreen ? null : titleNode}
      <FlexCol
        className={classOverride(
          "relative f-1 gap-0 ",
          `${fullScreen ? "min-h-0" : ""}`,
        )}
        style={
          codePlaceholder && !value && !localValueRef.current ?
            {
              opacity: 0.5,
            }
          : {}
        }
      >
        {isSaving && <Loading variant="cover" />}
        <CodeEditor
          className={codeEditorClassName}
          {...codeEditorProps}
          value={
            (isReadonly ? value : localValueRef.current) ||
            value ||
            (codePlaceholder ?? "")
          }
          onChange={onChange}
          onSave={onClickSave}
        />
        {footerNode}
      </FlexCol>
    </FlexCol>
  );

  if (!fullScreen) {
    return content;
  }

  return (
    <Popup
      title={titleNode}
      positioning="fullscreen"
      contentStyle={{
        overflow: "hidden",
      }}
      onClose={() => setFullScreen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setFullScreen(false);
        }
      }}
      onClickClose={false}
    >
      {content}
    </Popup>
  );
};
