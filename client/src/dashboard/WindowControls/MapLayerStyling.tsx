import { FlexRow } from "@components/Flex";
import { IconPalette } from "@components/IconPalette/IconPalette";
import PopupMenu from "@components/PopupMenu";
import { Select } from "@components/Select/Select";
import React from "react";
import type { LinkSyncItem } from "../Dashboard/dashboardUtils";
import { ColorCircle, ColorPicker } from "../W_Table/ColumnMenu/ColorPicker";
import type { LayerColorPickerProps } from "./LayerColorPicker";
import type { ChartLinkOptions } from "./DataLayerManager/DataLayer";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";

type P = Pick<LayerColorPickerProps, "column" | "title"> & {
  linkOptions: Extract<LinkSyncItem["options"], { type: "map" }>;
  onChange: (newOptions: ChartLinkOptions) => void;
};
export const MapLayerStyling = ({
  linkOptions,
  onChange,
  column,
  title,
}: P) => {
  const { tables } = usePrgl();
  const { dataSource } = linkOptions;
  const tableName =
    dataSource?.type === "table" ? dataSource.tableName
    : dataSource?.type === "local-table" ? dataSource.localTableName
    : undefined;
  const table =
    !tableName ? undefined : tables.find((t) => t.name === tableName);

  const linkColor = `rgba(${getLinkColor(linkOptions)})`;

  return (
    <PopupMenu
      title={title}
      button={<ColorCircle color={linkColor} />}
      render={() => (
        <FlexRow>
          <ColorPicker
            style={{ flex: "none" }}
            label={{
              label: "Layer color",
              variant: "normal",
              className: "mb-p5",
            }}
            title={title}
            required={true}
            className="w-fit m-p5 text-2"
            value={linkColor}
            onChange={(__, _, colorArr) => {
              onChange({
                ...linkOptions,
                mapColorMode: {
                  type: "fixed",
                  colorArr,
                },
                /** Is this used only for timechart? */
                columns: linkOptions.columns.map((c) => ({
                  ...c,
                  colorArr: c.name === column ? colorArr : c.colorArr,
                })),
              });
            }}
          />
          <IconPalette
            label={{ label: "Icon", variant: "normal", className: "mb-p5" }}
            iconName={
              linkOptions.mapIcons?.type === "fixed" ?
                linkOptions.mapIcons.iconPath
              : undefined
            }
            onChange={(iconPath) => {
              onChange({
                ...linkOptions,
                mapIcons:
                  !iconPath ? undefined : (
                    {
                      type: "fixed",
                      iconPath,
                    }
                  ),
              });
            }}
          />
          {linkOptions.mapIcons && (
            <Select
              label={"Display"}
              fullOptions={[{ key: "Circle and Icon" }, { key: "Icon" }]}
              value={
                linkOptions.mapIcons.display === "icon" ?
                  "Icon"
                : "Circle and Icon"
              }
              onChange={(v) => {
                onChange({
                  ...linkOptions,
                  mapIcons: {
                    ...linkOptions.mapIcons!,
                    display: v === "Icon" ? "icon" : "icon+circle",
                  },
                });
              }}
            />
          )}
          {table && (
            <Select
              label={"Labels"}
              value={linkOptions.mapShowText?.columnName}
              fullOptions={table.columns.map((c) => ({
                key: c.name,
                subLabel: c.data_type,
                disabledInfo:
                  (
                    ![
                      "text",
                      "int4",
                      "int8",
                      "date",
                      "timestamp",
                      "varchar",
                      "name",
                    ].includes(c.udt_name)
                  ) ?
                    "Only text columns can be used for labels"
                  : undefined,
              }))}
              optional={true}
              onChange={(columnName) => {
                onChange({
                  ...linkOptions,
                  mapShowText:
                    columnName ?
                      {
                        columnName,
                      }
                    : undefined,
                });
              }}
            />
          )}
        </FlexRow>
      )}
    />
  );
};

const getLinkColor = (options: LinkSyncItem["options"]) => {
  if (options.type === "table") {
    return options.colorArr;
  }
  if (options.type === "map") {
    if (options.mapColorMode?.type === "fixed") {
      return options.mapColorMode.colorArr;
    }
    if (options.mapColorMode?.type === "scale") {
      return options.mapColorMode.minColorArr;
    }
    if (options.mapColorMode?.type === "conditional") {
      return options.mapColorMode.conditions[0]?.colorArr;
    }
  }
  return options.columns[0]?.colorArr;
};
