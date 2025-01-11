import React from "react";
import Select from "../components/Select/Select";
import type { DBSMethods } from "./Dashboard/DBS";
import { FlexCol } from "../components/Flex";
import { SQLEditor } from "./SQLEditor/SQLEditor";
import CodeExample from "./CodeExample";
import type { SampleSchema } from "../../../commonTypes/utils";
import { usePromise } from "prostgles-client/dist/react-hooks";

type P = {
  name?: string;
  title?: string;
  dbsMethods: Pick<DBSMethods, "getSampleSchemas">;
  onChange: (schema: SampleSchema) => void;
};
export const SampleSchemas = ({ dbsMethods, onChange, name, title }: P) => {
  const sampleSchemas = usePromise(dbsMethods.getSampleSchemas!);
  const schema = sampleSchemas?.find((s) => s.name === name);
  return (
    <FlexCol>
      <Select
        label={title ?? "Create demo schema (optional)"}
        value={name}
        data-command="ConnectionServer.SampleSchemas"
        fullOptions={sampleSchemas?.map((s) => ({ key: s.name })) ?? []}
        onChange={(name) =>
          onChange(sampleSchemas!.find((s) => s.name === name)!)
        }
      />
      {!schema ?
        null
      : schema.type === "sql" ?
        <SQLEditor
          value={schema.file}
          sqlOptions={{ lineNumbers: "off" }}
          style={{
            minHeight: "200px",
            minWidth: "600px",
          }}
          className="rounded b b-color "
          onChange={() => {}}
        />
      : <CodeExample
          language="typescript"
          value={schema.tableConfigTs + "\n\n" + schema.onMountTs}
        />
      }
    </FlexCol>
  );
};
