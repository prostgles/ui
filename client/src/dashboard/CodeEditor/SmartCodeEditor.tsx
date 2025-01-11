import { mdiFullscreen } from "@mdi/js";
import { useEffectDeep } from "prostgles-client/dist/react-hooks";
import React, { useCallback } from "react";
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

export const SmartCodeEditor = ({
  label,
  onSave,
  onSaveButton,
  value,
  codePlaceholder,
  autoSave,
  codeEditorClassName = "b",
  headerButtons,
  ...codeEditorProps
}: P) => {
  const [_localValue, setLocalValue] = React.useState<
    string | null | undefined
  >();
  const localValue = _localValue ?? value;
  const [error, setError] = React.useState<any>();
  const [fullScreen, setFullScreen] = React.useState(false);
  useEffectDeep(() => {
    if (localValue === undefined && value !== localValue) {
      setLocalValue(value);
    }
  }, [localValue, value]);

  const didChange = isDefined(localValue) && localValue !== value;

  const onSaveMonaco = useCallback(async () => {
    if (!didChange || !onSave) return;
    try {
      await onSave(localValue ?? "");
      setError(undefined);
    } catch (err) {
      setError(err);
    }
  }, [onSave, localValue, didChange]);

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
            setLocalValue(value);
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
      setLocalValue(newValue);
    },
    [onSave, autoSave],
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
          style={{
            minHeight: "300px",
            ...(!localValue ? { opacity: 0.7 } : {}),
          }}
          {...codeEditorProps}
          value={localValue || (codePlaceholder ?? "")}
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
