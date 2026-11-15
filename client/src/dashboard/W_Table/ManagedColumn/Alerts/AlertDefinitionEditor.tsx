import type { AlertQueryDefinition } from "@common/alertQuerySchema";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { FormFieldCodeEditor } from "@components/FormField/FormFieldCodeEditor";
import { isObject } from "prostgles-types";
import React from "react";
import type { DBSchemaTableWJoins } from "../../../Dashboard/dashboardUtils";
import { AlertFilterEditor } from "./AlertFilterEditor";

export const AlertDefinitionEditor = ({
  value,
  onChange,
  tables,
  isCallback,
}: {
  value: unknown;
  onChange: (value: AlertQueryDefinition) => void;
  tables: DBSchemaTableWJoins[];
  isCallback: boolean;
}) => {
  if (isCallback)
    return (
      <div>
        Configured callback. The query and message are managed in the project
        configuration.
      </div>
    );
  const definition = (
    isObject(value) && isObject(value.query) && isObject(value.template) ?
      value
    : {
        query: { table: "", select: [], filter: { $and: [] } },
        template: { title: "", body: "", data: {} },
      }) as AlertQueryDefinition;
  const { query, template, deduplicate } = definition;
  const table = tables.find((table) => table.name === query.table);
  const setQuery = (changes: Partial<AlertQueryDefinition["query"]>) =>
    onChange({ ...definition, query: { ...query, ...changes } });
  return (
    <FlexCol className="gap-1">
      <FormField
        label="Query table"
        value={query.table}
        fullOptions={tables
          .filter((table) => table.columns.some((column) => column.select))
          .map((table) => ({
            key: table.name,
            label: table.label || table.name,
          }))}
        onChange={(table) => setQuery({ table })}
      />
      <FormField
        label="Selected columns"
        value={query.select}
        multiSelect={Array.isArray(query.select)}
        fullOptions={
          Array.isArray(query.select) ?
            table?.columns
              .filter((column) => column.select)
              .map((column) => ({
                key: column.name,
                label: column.label || column.name,
              }))
          : undefined
        }
        asJSON={Array.isArray(query.select) ? undefined : "codeEditor"}
        inputContent={
          !Array.isArray(query.select) && (
            <FormFieldCodeEditor
              asJSON={{ component: "codeEditor" }}
              value={JSON.stringify(query.select, null, 2)}
              onChange={(select) => setQuery({ select })}
            />
          )
        }
        onChange={(select) => setQuery({ select })}
      />
      <AlertFilterEditor
        label="Query conditions"
        filter={query.filter}
        tableName={query.table}
        emptyLabel="All records"
        onChange={(filter) => setQuery({ filter })}
      />
      <FormField
        label="Message title"
        value={template.title}
        onChange={(title) =>
          onChange({ ...definition, template: { ...template, title } })
        }
      />
      <FormField
        label="Message body"
        value={template.body}
        asTextArea={true}
        hint="Use {{rows.length}}, {{rows.0.column}}, {{data.name}}, {{recipientId}} or {{localDate}}."
        onChange={(body) =>
          onChange({ ...definition, template: { ...template, body } })
        }
      />
      <AlertJSONField
        label="Template data"
        value={template.data}
        hint="Named row templates with text, separator and optional nullText."
        onChange={(data) =>
          onChange({ ...definition, template: { ...template, data } })
        }
      />
      {deduplicate ?
        <>
          <FormField
            label="Deduplication columns"
            value={deduplicate.key}
            arrayType={{ tsDataType: "string", udt_name: "text" }}
            onChange={(key) =>
              onChange({ ...definition, deduplicate: { ...deduplicate, key } })
            }
          />
          <FormField
            label="Suppress repeats for"
            value={deduplicate.for}
            placeholder="24h"
            hint="For example: 30m, 24h or 7d."
            onChange={(duration) =>
              onChange({
                ...definition,
                deduplicate: { ...deduplicate, for: duration },
              })
            }
          />
          <Btn
            onClick={() => {
              const { deduplicate: _removed, ...remaining } = definition;
              onChange(remaining);
            }}
          >
            Allow repeat deliveries
          </Btn>
        </>
      : <Btn
          onClick={() =>
            onChange({ ...definition, deduplicate: { key: [], for: "24h" } })
          }
        >
          Suppress repeat deliveries
        </Btn>
      }
    </FlexCol>
  );
};

const AlertJSONField = ({
  label,
  value,
  hint,
  onChange,
}: {
  label: string;
  value: unknown;
  hint: string;
  onChange: (value: any) => void;
}) => (
  <FormField
    label={label}
    asJSON="codeEditor"
    hint={hint}
    inputContent={
      <FormFieldCodeEditor
        asJSON={{ component: "codeEditor" }}
        value={JSON.stringify(value, null, 2)}
        onChange={onChange}
      />
    }
  />
);
