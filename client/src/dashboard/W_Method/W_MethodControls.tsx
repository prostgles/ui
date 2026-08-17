import { fromEntries, getEntries } from "@common/utils";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow } from "@components/Flex";
import { isCompleteJSONB } from "@components/JSONBSchema/isCompleteJSONB";
import { JSONBSchema } from "@components/JSONBSchema/JSONBSchema";
import Loading from "@components/Loader/Loading";
import { SwitchToggle } from "@components/SwitchToggle";
import { mdiChevronDown, mdiPlay } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { AnyObject, ClientServerFunction, JSONB } from "prostgles-types";
import { getProperty, isEmpty, omitKeys } from "prostgles-types";
import React, { useState } from "react";
import { type Prgl } from "../../App";
import { MethodDefinition } from "../AccessControl/Methods/MethodDefinition";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import type { WindowData } from "../Dashboard/dashboardUtils";
import SmartTable from "../SmartTable";
import { ProcessLogs } from "../TableConfig/ProcessLogs";
import type { ColumnValue } from "../W_Table/ColumnMenu/ColumnStyleControls/ColumnStyleControls";

type P = Pick<Prgl, "db" | "methods" | "tables"> & {
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
  w:
    | SyncDataItem<Required<WindowData<"method">>, { handlesOnData: true }>
    | undefined;
};

export const W_MethodControls = ({
  w,
  db,
  tables,
  methods,
  method_name,
  fixedRowArgument,
  ...otherProps
}: P) => {
  const prgl = usePrgl();

  const [result, setResult] = useState<unknown>();
  const [showResults, setShowResults] = useState(true);
  const methodFromSchema = getProperty(methods, method_name) as
    ClientServerFunction | undefined;
  const [error, setError] = useState<unknown>(
    !methodFromSchema ? `Method named "${method_name}" not found` : undefined,
  );
  const [expandControls, setExpandControls] = useState(true);
  const [showJSONBErrors, setshowJSONBErrors] = useState(false);
  const { dbs, connectionId, sql } = prgl;
  const { data: methodFullData, isLoading } =
    dbs.published_methods.useSubscribeOne(
      { name: w?.method_name, connection_id: connectionId },
      { limit: w?.method_name ? 1 : 0 },
    );
  const methodFullDataArgs =
    methodFullData &&
    fromEntries(methodFullData.arguments.map((m) => [m.name, m]));

  const [loading, setLoading] = useState(false);

  const argDefaults: Record<string, ColumnValue> = {};
  const optionalArgNames: string[] = [];
  if (methodFromSchema) {
    getEntries(methodFromSchema.input ?? {}).forEach(
      ([argName, stringOrObj]) => {
        const arg =
          typeof stringOrObj === "string" ? { type: stringOrObj } : stringOrObj;
        const isRowLookup = arg.type === "RowLookup";
        const isValueLookup = arg.type === "ValueLookup";
        const argFullDetails = methodFullDataArgs?.[argName];
        if (arg.optional) {
          optionalArgNames.push(argName);
        }
        if (fixedRowArgument?.argName === argName) {
          argDefaults[argName] =
            isRowLookup ? fixedRowArgument.row
            : isValueLookup ? fixedRowArgument.row[arg.column]
            : undefined;
        } else if (
          argFullDetails?.defaultValue !== undefined &&
          !isRowLookup
        ) {
          argDefaults[argName] = argFullDetails.defaultValue;
        }
      },
    );
  }

  const args = otherProps.state.args ?? argDefaults;
  const disabledArgs =
    otherProps.state.disabledArgs ??
    optionalArgNames.filter((argName) => args[argName] === undefined);
  const hiddenArgs = otherProps.state.hiddenArgs ?? [];
  const setArgs = (newArgs) => {
    setError(undefined);
    otherProps.setState({ args: newArgs });
  };

  const inputSchema = methodFromSchema?.input ?? {};
  const argSchema: JSONB.JSONBSchema = {
    type: {
      ...omitKeys(inputSchema, hiddenArgs),
    },
    defaultValue: Object.entries(methodFromSchema?.input ?? {})
      .filter(
        ([argName]) =>
          methodFullDataArgs?.[argName]?.defaultValue !== undefined,
      )
      .reduce(
        (a, [argName]) => ({
          ...a,
          [argName]: methodFullDataArgs?.[argName]?.defaultValue,
        }),
        {},
      ),
  };

  const hasErrors = !isCompleteJSONB(args, argSchema);

  const outputTableInfo =
    methodFullData?.outputTable ?
      tables.find((t) => t.name === methodFullData.outputTable)
    : undefined;
  const { showCode = false, showLogs } = w?.options ?? {};

  if (isLoading) {
    return <Loading />;
  }

  return (
    <FlexCol
      data-command="W_MethodControls"
      className="W_MethodControls f-1  min-s-0 o-auto bg-color-2"
      style={{ gap: "2px" }}
    >
      {showCode ?
        !methodFullData ?
          <ErrorComponent
            title="Cannot display method definition"
            error={"Could not find method data"}
          />
        : <MethodDefinition
            renderMode="Code"
            {...prgl}
            db={db}
            tables={tables}
            method={methodFullData}
            onChange={(code) => {
              void dbs.published_methods.update(
                { id: methodFullData.id },
                { run: code.run },
              );
            }}
          />

      : null}
      {methodFromSchema && (
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
              value={args}
              onChange={(v) => {
                setArgs(v);
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
                  const res = await methodFromSchema.run(
                    !methodFullData?.arguments.length ? undefined : params,
                  );
                  if (outputTableInfo) {
                    w?.$update({
                      name: `${method_name} - ${await db[outputTableInfo.name]?.count?.()}`,
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
              <>
                <SwitchToggle
                  label="Show code"
                  className="ml-auto"
                  checked={!!showCode}
                  onChange={(showCode) => {
                    w.$update({ options: { showCode } }, { deepMerge: true });
                  }}
                  variant="row"
                />
                <SwitchToggle
                  label="Show logs"
                  checked={!!showLogs}
                  onChange={(showLogs) => {
                    w.$update({ options: { showLogs } }, { deepMerge: true });
                  }}
                  variant="row"
                />
              </>
            )}

            <SwitchToggle
              label="Show results"
              checked={showResults}
              onChange={setShowResults}
              variant="row"
              disabledInfo={
                result || outputTableInfo ? undefined : "No results to show"
              }
            />
          </FlexRow>
        </div>
      )}
      {methodFullData?.outputTable && !outputTableInfo && (
        <ErrorComponent
          error={`Results table ( ${methodFullData.outputTable} ) missing or not allowed`}
          className="m-1"
        />
      )}
      {showResults && !error && result !== undefined && (
        <div className="flex-row f-1">
          {outputTableInfo ?
            <SmartTable
              title=""
              db={db}
              sql={sql}
              methods={methods}
              tableName={outputTableInfo.name}
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
      {showLogs && <ProcessLogs type="methods" />}
      <ErrorComponent
        error={error}
        findMsg={true}
        className="o-auto min-h-0 m-1 ai-start f-1"
      />
    </FlexCol>
  );
};
