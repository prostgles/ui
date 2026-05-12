import type { SearchListItem } from "@components/SearchList/SearchList";
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
import { type ValidatedColumnInfo } from "prostgles-types";
import {
  colIs,
  tsDataTypeFromUdtName,
} from "src/dashboard/SmartForm/SmartFormField/fieldUtils";
import { getColumnDataColor } from "src/dashboard/SmartForm/SmartFormField/RenderValue";
import type { ColumnConfigWInfo } from "../../W_Table";

export const getColumnListItem = (
  c: Pick<ValidatedColumnInfo, "name"> &
    Partial<
      Pick<
        ValidatedColumnInfo,
        "udt_name" | "tsDataType" | "references" | "is_pkey"
      >
    > & { disabledInfo?: string },
  columnWInfo?: ColumnConfigWInfo,
): Pick<
  SearchListItem,
  "data" | "title" | "subLabel" | "iconLeft" | "disabledInfo"
> & {
  key: string;
  label: string;
} => {
  const subLabel =
    columnWInfo?.nested ?
      columnWInfo.nested.columns
        .filter((c) => c.show)
        .map((c) => c.name)
        .join(", ")
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
    iconLeft: {
      type: "Icon",
      style: { color: getColumnDataColor(c, "var(--text-2)") },
      path: getColumnIconPath(c, columnWInfo),
    },
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
