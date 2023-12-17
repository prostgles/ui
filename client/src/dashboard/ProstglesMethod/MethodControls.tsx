import { mdiChevronDown, mdiPlay } from "@mdi/js";
import { SyncDataItem } from "prostgles-client/dist/SyncedTable";
import { AnyObject, getKeys, JSONB, MethodFullDef } from "prostgles-types";
import React, { useState } from "react";
import { Prgl } from "../../App";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { isCompleteJSONB } from "../../components/JSONBSchema/isCompleteJSONB";
import { JSONBSchema } from "../../components/JSONBSchema/JSONBSchema";
import { SwitchToggle } from "../../components/SwitchToggle";
import { omitKeys } from "../../utils";
import CodeEditor from "../CodeEditor";
import { WindowData } from "../Dashboard/dashboardUtils";
import SmartTable from "../SmartTable";

type P = Pick<Prgl, "db" | "methods" | "tables" | "theme"> & {
  method_name: string;
  state: {
    args?: AnyObject;
    disabledArgs?: string[];
    hiddenArgs?: string[];
  };
  setState: (newState: P["state"]) => void;
  fixedRowArgument?: { 
    row: AnyObject;
    argName: string;
    tableName: string;
  };
  w?: SyncDataItem<Required<WindowData<"method">>, true>
}

export const MethodControls = ({ w, db, tables, methods, method_name, fixedRowArgument, theme, ...otherProps }: P) => {

  const [result, setResult] = useState<AnyObject | void>();
  const [showResults, setShowResults] = useState(true);
  const m: MethodFullDef | undefined = method_name && typeof methods[method_name] !== "function"? methods[method_name] as any : undefined;
  const [error, setError] = useState<any>(!m? `Method named "${method_name}" not found` : undefined); 
  const [expandControls, setExpandControls] = useState(true);
  const [showJSONBErrors, setshowJSONBErrors] = useState(false);


  const [loading, setLoading] = useState(false);

  const argDefaults: AnyObject = {};
  const disabledArgsDefaults: string[] = [];
  if(m){
    getKeys(m.input).map(argName => { 
      const arg = m.input[argName]!;
      const ref = arg.lookup?.type === "data"? arg.lookup : undefined; 
      if((arg as any).optional){
        disabledArgsDefaults.push(argName);
      }
      if(fixedRowArgument?.argName === argName){
        argDefaults[argName] = ref?.isFullRow? fixedRowArgument.row : ref?.column? fixedRowArgument.row[ref.column] : undefined
      } else if(arg.defaultValue !== undefined && !ref?.isFullRow){
        argDefaults[argName] = arg.defaultValue;
      }
    });
  }
  
  const args = otherProps.state.args ?? argDefaults;
  const disabledArgs = otherProps.state.disabledArgs ?? disabledArgsDefaults;
  const hiddenArgs = otherProps.state.hiddenArgs ?? [];
  const setArgs = (newArgs) => { 
    setError(undefined);
    otherProps.setState({ args: newArgs });
  };

  const inputSchema = m?.input ?? {};
  const mArgs = getKeys(inputSchema).reduce((a, k) => {
    const v: keyof typeof inputSchema = k;
    return {
      ...a,
      [v]: inputSchema[v]?.lookup?.type === "data-def"? {
        ...inputSchema[v],
        lookup: {
          ...inputSchema[v]?.lookup,
          type: "data"
        }
      } : inputSchema[v]
    }
  }, {});

  const argSchema: JSONB.JSONBSchema = {
    type: {
      ...omitKeys(mArgs as any, hiddenArgs),
    },
    defaultValue: Object.entries(m?.input ?? {})
      .filter(([k, v]) => v.defaultValue !== undefined)
      .reduce((a, [k, v]) => ({ ...a, [k]: v.defaultValue }), {})
  }

  const hasErrors = !isCompleteJSONB(args, argSchema);

  return <div className="flex-col f-1  min-s-0 o-auto bg-1" style={{ gap: "2px" }}>
    {m && <div className="flex-col gap-1 p-1 shadow bg-0">
      <div className={"flex-row-wrap gap-1 " + (expandControls? "" : " hidden ")}> 
        <JSONBSchema 
          schema={argSchema} 
          value={args as any} 
          onChange={v => {
            setArgs(v as any) as any
          }}
          db={db}
          tables={tables} 
          allowIncomplete={true}
          showErrors={showJSONBErrors}
        />
      </div>
      <div className="flex-row gap-2">
        <Btn  
          loading={loading}
          iconPath={mdiPlay}
          onClick={async () => {
            try {
              const params = omitKeys(args, [...disabledArgs, ...hiddenArgs]); 
              if(hasErrors){
                setshowJSONBErrors(true);
                return;
              }

              setLoading(true); 
              setError(undefined);
              const res = await m.run(params);
              if(w && m.outputTable){
                w.$update({ name: `${method_name} - ${await db[m.outputTable]?.count?.()}` })
              }

              setshowJSONBErrors(false);
              setResult(res); 
            } catch(err: any){
              setError(err);
              setResult(undefined);   
            }
            setLoading(false);
          }}
          color="action"
          variant="filled"
          disabledInfo={(hasErrors && showJSONBErrors)? "Errors/invalid values found" : undefined}
        >Run</Btn>

        <Btn iconPath={mdiChevronDown}
          iconStyle={{ transform: `rotate(${!expandControls? 0 : 180}deg)`, transition: ".3s all" }}
          onClick={() => setExpandControls(v => !v)}
        >
          {!expandControls? "Expand" : "Collapse"} input
        </Btn>

        <SwitchToggle 
          label="Show results" 
          className="ml-auto"
          checked={showResults} 
          onChange={setShowResults} 
          variant="row"
          disabledInfo={(result || m.outputTable)? undefined : "No results to show"}
        />
      </div>
    </div> }

    {showResults && !error && <div className="flex-row f-1">
      {m?.outputTable? <SmartTable
          title="" 
          db={db}
          theme={theme}
          methods={methods}
          tableName={m.outputTable}
          tables={tables}
          realtime={{}}
        /> : 
        result? <CodeEditor 
          style={{ flex: 1 }} //  minHeight: "300px", 
          language="json" 
          value={JSON.stringify(result, null, 2)} 
        /> : null 
      }
      </div>
    }
    
    <ErrorComponent error={error} findMsg={true} className="o-auto min-h-0 m-1 ai-start f-1" />
  </div>
}