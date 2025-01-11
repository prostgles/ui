import { mdiChevronDown, mdiPlay } from "@mdi/js";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { AnyObject, JSONB, MethodFullDef } from "prostgles-types";
import { isEmpty } from "prostgles-types";
import { getKeys } from "prostgles-types";
import React, { useState } from "react";
import { useReactiveState, type Prgl } from "../../App";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { isCompleteJSONB } from "../../components/JSONBSchema/isCompleteJSONB";
import { JSONBSchema } from "../../components/JSONBSchema/JSONBSchema";
import { SwitchToggle } from "../../components/SwitchToggle";
import { omitKeys } from "prostgles-types";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import type { WindowData } from "../Dashboard/dashboardUtils";
import SmartTable from "../SmartTable";
import { FlexCol, FlexRow } from "../../components/Flex";
import { MethodDefinition } from "../AccessControl/Methods/MethodDefinition";
import { prgl_R } from "../../WithPrgl";

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
  w: SyncDataItem<Required<WindowData<"method">>, true> | undefined;
};

export const W_MethodControls = ({
  w,
  db,
  tables,
  methods,
  method_name,
  fixedRowArgument,
  theme,
  ...otherProps
}: P) => {
  const { state: prgl } = useReactiveState(prgl_R);

  const [result, setResult] = useState<AnyObject | void>();
  const [showResults, setShowResults] = useState(true);
  const m: MethodFullDef | undefined =
    method_name && typeof methods[method_name] !== "function" ?
      (methods[method_name] as any)
    : undefined;
  const [error, setError] = useState<any>(
    !m ? `Method named "${method_name}" not found` : undefined,
  );
  const [expandControls, setExpandControls] = useState(true);
  const [showJSONBErrors, setshowJSONBErrors] = useState(false);
  const { dbs, connectionId } = prgl!;
  const { data: method } = dbs.published_methods.useSubscribeOne(
    { name: w?.method_name, connection_id: connectionId },
    { limit: w?.method_name ? 1 : 0 },
  );

  const [loading, setLoading] = useState(false);

  const argDefaults: AnyObject = {};
  const disabledArgsDefaults: string[] = [];
  if (m) {
    getKeys(m.input).map((argName) => {
      const arg = m.input[argName]!;
      const ref = arg.lookup?.type === "data" ? arg.lookup : undefined;
      if ((arg as any).optional) {
        disabledArgsDefaults.push(argName);
      }
      if (fixedRowArgument?.argName === argName) {
        argDefaults[argName] =
          ref?.isFullRow ? fixedRowArgument.row
          : ref?.column ? fixedRowArgument.row[ref.column]
          : undefined;
      } else if (arg.defaultValue !== undefined && !ref?.isFullRow) {
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
      [v]:
        inputSchema[v]?.lookup?.type === "data-def" ?
          {
            ...inputSchema[v],
            lookup: {
              ...inputSchema[v].lookup,
              type: "data",
            },
          }
        : inputSchema[v],
    };
  }, {});

  const argSchema: JSONB.JSONBSchema = {
    type: {
      ...omitKeys(mArgs as any, hiddenArgs),
    },
    defaultValue: Object.entries(m?.input ?? {})
      .filter(([k, v]) => v.defaultValue !== undefined)
      .reduce((a, [k, v]) => ({ ...a, [k]: v.defaultValue }), {}),
  };

  const hasErrors = !isCompleteJSONB(args, argSchema);

  const outputTableInfo =
    m?.outputTable ? tables.find((t) => t.name === m.outputTable) : undefined;
  const { showCode = true } = w?.options ?? {};

  if (!prgl) {
    return <>prgl missing</>;
  }
  return (
    <FlexCol
      className="W_MethodControls f-1  min-s-0 o-auto bg-color-2"
      style={{ gap: "2px" }}
    >
      {showCode && method && (
        <MethodDefinition
          renderMode="Code"
          {...prgl}
          db={db}
          tables={tables}
          method={method}
          theme={theme}
          onChange={(code) => {
            dbs.published_methods.update({ id: method.id }, { run: code.run });
          }}
        />
      )}
      {m && (
        <div
          className="flex-col gap-1 p-1 shadow bg-color-0"
          style={{
            /** Used to ensure the "Show code" minimap is beneath clickcatch when typing method arguments autocomplete */
            zIndex: 5,
          }}
        >
          <div
            className={
              "flex-row-wrap gap-1 " + (expandControls ? "" : " hidden ")
            }
          >
            <JSONBSchema
              schema={argSchema}
              value={args as any}
              onChange={(v) => {
                setArgs(v as any) as any;
              }}
              db={db}
              tables={tables}
              allowIncomplete={true}
              showErrors={showJSONBErrors}
            />
          </div>
          <FlexRow className="gap-2">
            <Btn
              loading={loading}
              iconPath={mdiPlay}
              onClick={async () => {
                try {
                  const params = omitKeys(args, [
                    ...disabledArgs,
                    ...hiddenArgs,
                  ]);
                  if (hasErrors) {
                    setshowJSONBErrors(true);
                    return;
                  }

                  setLoading(true);
                  setError(undefined);
                  const res = await m.run(params);
                  if (m.outputTable) {
                    w?.$update({
                      name: `${method_name} - ${await db[m.outputTable]?.count?.()}`,
                    });
                  }

                  setshowJSONBErrors(false);
                  setResult(res);
                } catch (err: any) {
                  setError(err);
                  setResult(undefined);
                }
                setLoading(false);
              }}
              color="action"
              variant="filled"
              disabledInfo={
                hasErrors && showJSONBErrors ?
                  "Errors/invalid values found"
                : undefined
              }
            >
              Run
            </Btn>

            {!isEmpty(inputSchema) && (
              <Btn
                iconPath={mdiChevronDown}
                iconStyle={{
                  transform: `rotate(${!expandControls ? 0 : 180}deg)`,
                  transition: ".3s all",
                }}
                onClick={() => setExpandControls((v) => !v)}
              >
                {!expandControls ? "Expand" : "Collapse"} input
              </Btn>
            )}

            {w && (
              <SwitchToggle
                label="Show code"
                className="ml-auto"
                checked={!!showCode}
                onChange={(showCode) => {
                  w.$update({ options: { showCode } }, { deepMerge: true });
                }}
                variant="row"
              />
            )}

            <SwitchToggle
              label="Show results"
              checked={showResults}
              onChange={setShowResults}
              variant="row"
              disabledInfo={
                result || m.outputTable ? undefined : "No results to show"
              }
            />
          </FlexRow>
        </div>
      )}
      {m?.outputTable && !outputTableInfo && (
        <ErrorComponent
          error={`Results table ( ${m.outputTable} ) missing or not allowed`}
          className="m-1"
        />
      )}
      {showResults && !error && (
        <div className="flex-row f-1">
          {m?.outputTable && outputTableInfo ?
            <SmartTable
              title=""
              db={db}
              theme={theme}
              methods={methods}
              tableName={m.outputTable}
              tables={tables}
              realtime={{}}
            />
          : result ?
            <CodeEditor
              className="b-unset"
              style={{ flex: 1 }}
              language="json"
              value={JSON.stringify(result, null, 2)}
            />
          : null}
        </div>
      )}

      <ErrorComponent
        error={error}
        findMsg={true}
        className="o-auto min-h-0 m-1 ai-start f-1"
      />
    </FlexCol>
  );
};
