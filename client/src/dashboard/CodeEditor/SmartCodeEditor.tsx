import { mdiFullscreen } from "@mdi/js";
import { useEffectDeep } from "prostgles-client/dist/react-hooks";
import React from "react";
import type { BtnProps } from "../../components/Btn";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow, classOverride } from "../../components/Flex";
import { FooterButtons } from "../../components/Popup/FooterButtons";
import Popup from "../../components/Popup/Popup";
import CodeEditor, { type CodeEditorProps } from "./CodeEditor";
import { isDefined } from "../../utils";

type P = {
  label: React.ReactNode;
  onSaveButton?: Pick<BtnProps, "children" | "iconPath" | "color" | "size">;
  onSave?: (value: string) => void;
  autoSave?: boolean;
  value: string | undefined | null;
  codePlaceholder?: string;
  codeEditorClassName?: string;
} & Omit<CodeEditorProps, "onSave" | "onChange" | "value" | "style" | "className">;

export const SmartCodeEditor = ({ label, onSave, onSaveButton, value, codePlaceholder, autoSave, codeEditorClassName = "b", ...codeEditorProps }: P) => {
  const [_localValue, setLocalValue] = React.useState<string | null | undefined>();
  const localValue = _localValue ?? value;
  const [error, setError] = React.useState<any>();
  const [fullScreen, setFullScreen] = React.useState(false);
  useEffectDeep(() => {
    if(localValue === undefined && value !== localValue){
      setLocalValue(value);
    }
  }, [localValue, value]);
 
  const didChange = isDefined(localValue) && localValue !== value;
  const onClickSave = (!onSave || autoSave)? undefined : async () => {
    if(!didChange) return;
    try {
      await onSave(localValue ?? "");
      setError(undefined);
    } catch(err) {
      setError(err)
    }
  }

  const titleNode = (
    <FlexRow className={fullScreen? "" : "shadow"} style={{ zIndex: 1 }}>
      {<div className="m-0 py-1 f-1">
        {label}
      </div>}
      <Btn iconPath={mdiFullscreen} onClick={() => setFullScreen(!fullScreen) } />
    </FlexRow>
  );

  const footerNode = didChange && onClickSave && 
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
        backdropFilter: "blur(1px)"
      }}
      footerButtons={[
        {
          label: "Cancel",
          onClick: () => {
            setLocalValue(value);
          }
        },
        error? undefined : {
          label: "Save (Ctrl + S)",
          color: "action",
          variant: "filled",
          ...onSaveButton,
          onClick: onClickSave
        }
      ]}
    />

  const content = <FlexCol 
    className={classOverride("SmartCodeEditor gap-0 f-1 ", `${fullScreen? "min-h-0" : ""}`)}
  >
    {fullScreen? null : titleNode}
    <FlexCol className={classOverride("relative f-1 gap-0 ", `${fullScreen? "min-h-0" : ""}`)}>
      <CodeEditor 
        className={codeEditorClassName}
        style={{
          minHeight: "300px",
          ...(!localValue? { opacity: .7 } : {})
        }}
        { ...codeEditorProps }
        value={localValue || (codePlaceholder ?? "")}
        onChange={newValue => {
          if(autoSave){
            onSave?.(newValue);
          }
          setLocalValue(newValue);
        }}
        onSave={onClickSave}
      />
      {footerNode}
    </FlexCol>
  </FlexCol>;

  if(fullScreen){
    return <Popup
      title={titleNode}
      positioning="fullscreen"
      contentStyle={{
        overflow: "hidden"
      }}
      onClose={() => setFullScreen(false)}
      onKeyDown={(e) => {
        if(e.key === "Escape"){
          setFullScreen(false);
        }        
      }}
      onClickClose={false}
    >
      {content}
    </Popup>
  }

  return content;
}