import { mdiClose } from "@mdi/js";
import React from "react";
import type { ArgDef } from "../../../../../commonTypes/publishUtils";
import Btn from "../../../components/Btn";
import FormField from "../../../components/FormField/FormField";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import { ReferencesDefinition } from "./ReferencesDefinition";

export type ArgumentDefinitionProps = ArgDef & {
  onChange: (newArg: ArgDef | undefined) => void;
} & Pick<CommonWindowProps, "tables">;
export const ArgumentDefinition = (props: ArgumentDefinitionProps) => {
  const { onChange, ...arg } = props;

  return (
    <div className="flex-row ai-start gap-p5">
      <FormField
        label="Name"
        value={arg.name}
        onChange={(name) => {
          onChange({ ...arg, name });
        }}
      />
      <FormField
        label="Type"
        disabledInfo={arg.references ? "Must remove reference" : undefined}
        options={["string", "number", "Date"]}
        value={arg.type}
        onChange={(type) => {
          onChange({ ...arg, type });
        }}
      />
      <FormField
        label="Default value"
        type="text"
        name={arg.name}
        value={arg.defaultValue}
        onChange={(defaultValue) => {
          onChange({ ...arg, defaultValue });
        }}
      />
      <FormField
        label="Optional"
        type="checkbox"
        value={arg.optional}
        onChange={(optional) => {
          onChange({ ...arg, optional });
        }}
      />

      <ReferencesDefinition {...props} />

      <Btn
        title="Remove argument"
        color="danger"
        variant="faded"
        className="show-on-parent-hover as-end"
        iconPath={mdiClose}
        onClick={() => onChange(undefined)}
      />
    </div>
  );
};
