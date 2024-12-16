import React from "react";
import { FlexRow } from "../../components/Flex";
import { IconPalette } from "../../components/IconPalette/IconPalette";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select";
import type { LinkSyncItem } from "../Dashboard/dashboardUtils";
import { ColorCircle, ColorPicker } from "../W_Table/ColumnMenu/ColorPicker";
import type { LayerColorPickerProps } from "./LayerColorPicker";

type P = Pick<
  LayerColorPickerProps,
  | "link"
  | "myLinks"
  | "getLinksAndWindows"
  | "tables"
  | "w"
  | "column"
  | "title"
> & {
  linkOptions: Extract<LinkSyncItem["options"], { type: "map" }>;
};
export const MapLayerStyling = ({
  linkOptions: opts,
  myLinks,
  link,
  tables,
  getLinksAndWindows,
  column,
  title,
  w,
}: P) => {
  const otherW = getLinksAndWindows().windows.find(
    (ow) => [link.w1_id, link.w2_id].includes(ow.id) && w.id !== ow.id,
  );
  const table = tables.find(
    (t) => t.name === (opts.localTableName ?? otherW?.table_name),
  );
  const updateLink = (updates: Partial<LinkSyncItem["options"]>) => {
    const thisLink = myLinks.find((l) => l.id === link.id);
    if (thisLink?.options.type !== "map") {
      throw new Error("Invalid map link type");
    }
    thisLink.$update(
      {
        options: {
          ...thisLink.options,
          ...updates,
        },
      },
      { deepMerge: true },
    );
  };

  const linkColor = `rgba(${getLinkColor(link)})`;

  return (
    <PopupMenu
      title={title}
      button={<ColorCircle color={linkColor} />}
      render={(pClose) => (
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
              updateLink({
                mapColorMode: {
                  type: "fixed",
                  colorArr,
                },
                /** Is this used only for timechart? */
                columns: opts.columns.map((c) => ({
                  ...c,
                  colorArr: c.name === column ? colorArr : c.colorArr,
                })),
              });
            }}
          />
          <IconPalette
            label={{ label: "Icon", variant: "normal", className: "mb-p5" }}
            iconName={
              opts.mapIcons?.type === "fixed" ?
                opts.mapIcons.iconPath
              : undefined
            }
            onChange={(iconPath) => {
              updateLink({
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
          {table && (
            <Select
              label={"Labels"}
              value={opts.mapShowText?.columnName}
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
                updateLink({
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

const getLinkColor = (link: LinkSyncItem) => {
  if (link.options.type === "table") return;
  if (link.options.type === "map") {
    if (link.options.mapColorMode?.type === "fixed") {
      return link.options.mapColorMode.colorArr;
    }
    if (link.options.mapColorMode?.type === "scale") {
      return link.options.mapColorMode.minColorArr;
    }
    if (link.options.mapColorMode?.type === "conditional") {
      return link.options.mapColorMode.conditions[0]?.colorArr;
    }
    return link.options.columns[0]?.colorArr;
  } else {
    return link.options.columns[0]?.colorArr;
  }
};
