import { Select } from "@components/Select/Select";
import { mdiSetCenter, mdiSetNone } from "@mdi/js";
import React from "react";

type P = {
  value: JoinFilterType;
  onChange: (type: JoinFilterType) => void;
  disabled: boolean | undefined;
};

export const JoinFilterTypeToggle = ({ value, disabled, onChange }: P) => {
  const btnColor = disabled ? undefined : "action";
  return (
    <Select
      fullOptions={JOIN_FILTER_TYPES}
      value={value}
      btnProps={{
        color: btnColor,
        variant: "default",
      }}
      showSelected={"icon"}
      onChange={onChange}
    />
  );
};

const JOIN_FILTER_TYPES = [
  {
    key: "$existsJoined",
    label: "Exists",
    subLabel: "At least one matching record exists in the target table",
    iconPath: mdiSetCenter,
  },
  {
    key: "$notExistsJoined",
    label: "Not Exists",
    subLabel: "No matching records exists in the target table",
    iconPath: mdiSetNone,
  },
] as const;

type JoinFilterType = (typeof JOIN_FILTER_TYPES)[number]["key"];
