import { mdiCodeJson } from "@mdi/js";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import React, { useState } from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import type { Prgl } from "../../../App";
import Btn from "../../../components/Btn";
import { FlexCol } from "../../../components/Flex";
import FormField from "../../../components/FormField/FormField";
import { JSONBSchema } from "../../../components/JSONBSchema/JSONBSchema";
import { Section } from "../../../components/Section";
import CodeEditor from "../../CodeEditor/CodeEditor";
import { SmartCodeEditor } from "../../CodeEditor/SmartCodeEditor";
import {
  useCodeEditorTsTypes,
  useMethodDefinitionTypes,
} from "./useMethodDefinitionTypes";

export type MethodDefinitionProps = {
  onChange: (newMethod: MethodDefinitionProps["method"]) => void;
  method: Partial<DBSSchema["published_methods"]>;
  renderMode?: "Code";
} & Pick<
  Prgl,
  | "tables"
  | "dbsTables"
  | "db"
  | "theme"
  | "connectionId"
  | "dbsMethods"
  | "dbKey"
  | "dbs"
>;

export const MethodDefinition = ({
  onChange,
  method,
  tables,
  dbsTables,
  db,
  connectionId,
  dbsMethods,
  dbKey,
  renderMode,
  dbs,
}: MethodDefinitionProps) => {
  const tsLibraries = useCodeEditorTsTypes({ connectionId, dbsMethods, dbKey });
  const { tsMethodDef } = useMethodDefinitionTypes({ method, tables, dbs });
  const methodsTable = dbsTables.find((t) => t.name === "published_methods");
  const methodArgsCol = methodsTable?.columns.find(
    (c) => c.name === "arguments",
  );

  const [editAsJSON, seteditAsJSON] = useState(false);

  const jsonSchemas = [
    {
      id: "published_methods",
      schema: getJSONBSchemaAsJSONSchema("published_methods", "arguments", {
        type: {
          ...methodsTable?.columns
            .filter((c) => ["arguments"].includes(c.name))
            .reduce(
              (a, v) => ({
                ...a,
                [v.name]: { type: v.tsDataType, nullable: v.is_nullable },
              }),
              {},
            ),
          arguments: methodArgsCol?.jsonbSchema as any,
        },
      }),
    },
  ];

  const renderCode = renderMode === "Code";
  const methodName = method.name;
  const codeEditorNode = (
    <SmartCodeEditor
      key={tsMethodDef}
      label={
        renderCode ? undefined : (
          "Server-side TypeScript function triggered by a button press"
        )
      }
      language={{
        lang: "typescript",
        modelFileName: method.name ?? "myModel",
        tsLibraries: [
          ...tsLibraries,
          { filePath: "file:///ProstglesMethod.ts", content: tsMethodDef },
        ],
      }}
      value={method.run ?? ""}
      options={{
        glyphMargin: false,
        padding: { top: 16, bottom: 0 },
        lineNumbersMinChars: 4,
      }}
      autoSave={!renderCode}
      onSave={(run) => {
        onChange({ ...method, run });
      }}
      codeEditorClassName={renderCode ? "b-none" : ""}
    />
  );

  const { data: clashingMethod } = dbs.published_methods.useFindOne({
    ...(method.id && { id: { $ne: method.id } }),
    name: methodName,
    connection_id: connectionId,
  });

  if (renderCode) return codeEditorNode;

  return (
    <FlexCol className="MethodDefinition f-1 gap-p5">
      <div className="flex-row ai-center gap-1">
        <Btn
          className="ml-auto"
          iconPath={mdiCodeJson}
          color={editAsJSON ? "action" : undefined}
          variant={editAsJSON ? "filled" : undefined}
          onClick={() => {
            seteditAsJSON(!editAsJSON);
          }}
        >
          {!editAsJSON ? "Edit as JSON" : "Edit as form"}
        </Btn>
      </div>
      {editAsJSON ?
        <CodeEditor
          style={{
            minWidth: "600px",
            minHeight: "400px",
          }}
          language={{
            lang: "json",
            jsonSchemas,
          }}
          value={JSON.stringify(method, null, 2)}
          onChange={(val) => {
            try {
              const newMethod = JSON.parse(val);
              onChange(newMethod);
            } catch (err) {
              console.error(err);
            }
          }}
        />
      : <>
          <FlexCol className="p-1">
            <FormField
              id="function_name"
              label="Name"
              value={method.name}
              error={clashingMethod ? "Name already exists" : undefined}
              onChange={(name) => {
                onChange({ ...method, name });
              }}
            />
            <FormField
              id="function_description"
              type="text"
              value={method.description}
              label={"Description"}
              optional={true}
              onChange={(description) => onChange({ ...method, description })}
            />
          </FlexCol>
          {method.name && (
            <FlexCol className="flex-col gap-1 f-1">
              <JSONBSchema
                className="mt-1"
                schema={methodArgsCol!.jsonbSchema!}
                value={method.arguments}
                onChange={(a) => {
                  onChange({ ...method, arguments: a });
                }}
                db={db}
                tables={tables}
              />
              <Section
                className="f-1"
                title="Function definition"
                contentClassName="flex-col gap-1  f-1"
                open={true}
              >
                {codeEditorNode}
              </Section>
              <Section title="Result" contentClassName="flex-col gap-1 p-1 f-1">
                <p className="ta-start m-0">
                  Any returned value will be shown as JSON to the client
                </p>
                <JSONBSchema
                  className="mt-1"
                  schema={{
                    title: "Display table",
                    description:
                      "Table that will be displayed below controls and inputs",
                    optional: true,
                    lookup: {
                      type: "schema",
                      object: "table",
                    },
                  }}
                  value={method.outputTable}
                  onChange={(outputTable) => {
                    onChange({ ...method, outputTable: outputTable ?? null });
                  }}
                  db={db}
                  tables={tables}
                />
              </Section>
            </FlexCol>
          )}
        </>
      }
    </FlexCol>
  );
};
