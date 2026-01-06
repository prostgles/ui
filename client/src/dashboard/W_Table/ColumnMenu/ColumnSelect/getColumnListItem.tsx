import React from "react";
import { Icon } from "@components/Icon/Icon";
import type { SearchListItem } from "@components/SearchList/SearchList";
import { type ValidatedColumnInfo } from "prostgles-types";
import { getColumnDataColor } from "src/dashboard/SmartForm/SmartFormField/RenderValue";
import type { ColumnConfigWInfo } from "../../W_Table";
import {
  colIs,
  tsDataTypeFromUdtName,
} from "src/dashboard/SmartForm/SmartFormField/fieldUtils";
import {
  mdiCalendar,
  mdiCodeBrackets,
  mdiCodeJson,
  mdiFileQuestion,
  mdiFormatText,
  mdiFunctionVariant,
  mdiKey,
  mdiKeyLink,
  mdiLink,
  mdiMapMarker,
  mdiNumeric,
  mdiShapeOutline,
  mdiTimetable,
  mdiToggleSwitchOutline,
} from "@mdi/js";

export const getColumnListItem = (
  c: Pick<ValidatedColumnInfo, "name"> &
    Partial<
      Pick<
        ValidatedColumnInfo,
        "udt_name" | "tsDataType" | "references" | "is_pkey"
      >
    > & { disabledInfo?: string },
  columnWInfo?: ColumnConfigWInfo,
): Pick<SearchListItem, "data" | "title"> & {
  key: string;
  label: string;
  subLabel?: string;
  contentLeft: React.ReactNode;
  disabledInfo?: string;
} => {
  const subLabel =
    columnWInfo?.nested ?
      columnWInfo.nested.columns.map((c) => c.name).join(", ")
    : columnWInfo ?
      `${columnWInfo.info?.udt_name ?? columnWInfo.computedConfig?.udt_name}      ${columnWInfo.info?.is_nullable ? "nullable" : ""}`
    : c.udt_name;
  return {
    key: c.name,
    label:
      c.name +
      (!c.references ? "" : (
        `    (${c.references.map((r) => r.ftable).join(", ")})`
      )),
    subLabel,
    data: c,
    disabledInfo: c.disabledInfo,
    title: columnWInfo?.nested ? "referenced data" : c.udt_name || "computed",
    contentLeft: (
      <Icon
        className="text-2"
        style={{ color: getColumnDataColor(c, "var(--text-2)") }}
        path={getColumnIconPath(c, columnWInfo)}
      />
    ),
  };
};

export const getColumnIconPath = (
  c: Partial<
    Pick<
      ValidatedColumnInfo,
      "udt_name" | "tsDataType" | "references" | "is_pkey"
    >
  >,
  columnWInfo?: ColumnConfigWInfo,
) => {
  const tsDataType = c.tsDataType ?? tsDataTypeFromUdtName(c.udt_name ?? "");
  return (
    c.is_pkey ? mdiKey
    : c.references ? mdiKeyLink
    : c.udt_name === "date" ? mdiCalendar
    : c.udt_name?.startsWith("timestamp") ? mdiTimetable
    : columnWInfo?.computedConfig ? mdiFunctionVariant
    : colIs(c, "_PG_numbers") ? mdiNumeric
    : colIs(c, "_PG_postgis") ? mdiMapMarker
    : colIs(c, "_PG_geometric") ? mdiShapeOutline
    : colIs(c, "_PG_date") ? mdiCalendar
    : tsDataType === "any" || c.udt_name?.startsWith("json") ? mdiCodeJson
    : tsDataType === "string" ? mdiFormatText
    : tsDataType === "boolean" ? mdiToggleSwitchOutline
    : tsDataType.endsWith("[]") ? mdiCodeBrackets
    : columnWInfo?.nested ? mdiLink
    : mdiFileQuestion
  );
};
