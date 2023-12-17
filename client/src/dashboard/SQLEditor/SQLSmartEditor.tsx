import { mdiPlay } from "@mdi/js";
import { SQLHandler } from "prostgles-types";
import React, { useState } from "react";
import ErrorComponent from "../../components/ErrorComponent";
import { InfoRow } from "../../components/InfoRow";
import Popup from "../../components/Popup/Popup";
import { useIsMounted } from "../Backup/CredentialSelector";
import { DashboardState } from "../Dashboard/Dashboard"; 
import SQLEditor from "./SQLEditor" 
import { FlexCol, FlexRow } from "../../components/Flex";
import Btn, { BtnProps } from "../../components/Btn";

type SQLSmartEditorProps = {
  title: string;
  asPopup?: boolean;
  contentTop?: React.ReactNode;
  query: string;
  sql: SQLHandler;
  hint?: React.ReactNode;
  onSuccess?: VoidFunction;
  onCancel?: VoidFunction;
  suggestions?: DashboardState["suggestions"];
}

export const SQLSmartEditor = ({ query: propsQuery, sql, hint, onSuccess, onCancel, suggestions, title, contentTop, asPopup = true } : SQLSmartEditorProps) => {
  const [error, setError] = useState<any>();
  const [running, setRunning] = useState(false);
  const [query, setQuery] = useState(propsQuery);
  const getIsMounted = useIsMounted(); 
  const onRunQuery = async (q: string = query) => {
    if(!getIsMounted()) return;
    try {
      setRunning(true);
      await sql(query);
      onSuccess?.();
      if(!getIsMounted()) return;
      setError(undefined);
    } catch(err){
      if(!getIsMounted()) return;
      setError(err);
    }
    if(!getIsMounted()) return;
    setRunning(false);
  }


  const cancelBtnProps: BtnProps = { onClick: onCancel, }
  const runBtnProps: BtnProps = {
    variant: "filled", 
    color: "action",
    className: "ml-auto",
    iconPath: mdiPlay, 
    onClick: () => onRunQuery(), 
    title: "Run query",
    'data-command': "SQLSmartEditor.Run",
    style: { alignSelf: "flex-end" },
  }

  const innerFooter = !asPopup? <FlexRow>
    <Btn { ...cancelBtnProps}>Cancel</Btn>
    <Btn { ...runBtnProps}>Run</Btn>
  </FlexRow> : null

  const content = <FlexCol className="f-1 min-h-0">
    {contentTop}
    <SQLEditor
      suggestions={suggestions}
      className="f-1 b b-gray-300 rounded o-hidden mt-1"
      autoFocus={false}
      value={query} 
      style={{
        minHeight: "200px",
        minWidth: "600px"
      }}
      sql={sql}
      onChange={v => {
        if(!getIsMounted()) return;
        setQuery(v);
        setError(undefined);
      }}
      onRun={onRunQuery}
      sqlOptions={{
        executeOptions: "full",
        errorMessageDisplay: "both",
        lineNumbers: "off"
      }}
    />
    {error && <ErrorComponent error={error} className="m-1 f-0" />}
    {!!hint && <InfoRow color="info">{hint}</InfoRow>}
    {innerFooter}
  </FlexCol>;

  if(!asPopup) return content;

  return <Popup onClose={onCancel}
    positioning="center"
    showFullscreenToggle={{}}
    title={title}
    footerButtons={[
      (onCancel? { ...cancelBtnProps, label: "Cancel" } : undefined),
      { ...runBtnProps, label: "Run" }
    ]}
  >
    {content}
  </Popup> 
}