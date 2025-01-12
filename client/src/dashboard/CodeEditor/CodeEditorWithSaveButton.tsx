import { mdiFullscreen } from "@mdi/js";
import { useEffectDeep } from "prostgles-client/dist/react-hooks";
import React, { useCallback, useRef } from "react";
import type { BtnProps } from "../../components/Btn";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow, classOverride } from "../../components/Flex";
import { FooterButtons } from "../../components/Popup/FooterButtons";
import Popup from "../../components/Popup/Popup";
import { CodeEditor, type CodeEditorProps } from "./CodeEditor";
import { isDefined } from "../../utils";
import { Label } from "../../components/Label";

type P = {
  label: React.ReactNode;
  onSaveButton?: Pick<BtnProps, "children" | "iconPath" | "color" | "size">;
  onSave?: (value: string) => void;
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
  const localValueRef = useRef<string | null | undefined>(value);
  const propsValueRef = useRef<string | null | undefined>(value);
  propsValueRef.current = value;

  const [error, setError] = React.useState<any>();
  const [fullScreen, setFullScreen] = React.useState(false);
  useEffectDeep(() => {
    if (
      localValueRef.current === undefined &&
      localValueRef.current !== value
    ) {
      localValueRef.current = value;
    }
  }, [value]);

  const [didChange, setDidChange] = React.useState(false);

  const onSaveMonaco = useCallback(async () => {
    if (!didChange || !onSave) return;
    try {
      await onSave(localValueRef.current ?? "");
      setError(undefined);
    } catch (err) {
      setError(err);
    }
  }, [onSave, didChange]);

  const onClickSave = !onSave || autoSave ? undefined : onSaveMonaco;

  const titleNode = (
    <FlexRow className={fullScreen ? "" : "bg-color-1"} style={{ zIndex: 1 }}>
      <Label className=" px-p25 f-1 " variant="normal">
        {label}
      </Label>
      <FlexRow className="gap-0">
        {headerButtons}
        <Btn
          iconPath={mdiFullscreen}
          onClick={() => setFullScreen(!fullScreen)}
        />
      </FlexRow>
    </FlexRow>
  );

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
        zIndex: 122222,
        background: "#dfdfdf5c",
        backdropFilter: "blur(1px)",
      }}
      footerButtons={[
        {
          label: "Cancel",
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
            onClick: onClickSave,
          }
        ),
      ]}
    />
  );

  const onChange = useCallback(
    (newValue: string) => {
      if (autoSave) {
        onSave?.(newValue);
      }
      localValueRef.current = newValue;

      const _didChange =
        isDefined(localValueRef.current) &&
        localValueRef.current !== propsValueRef.current;
      if (!autoSave && _didChange !== didChange) {
        setDidChange(_didChange);
      }
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
      >
        <CodeEditor
          className={codeEditorClassName}
          // style={{
          //   minHeight: "300px",
          //   // ...(!localValue ? { opacity: 0.7 } : {}),
          // }}
          {...codeEditorProps}
          // value={localValue || (codePlaceholder ?? "")}
          value={localValueRef.current || value || (codePlaceholder ?? "")}
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
