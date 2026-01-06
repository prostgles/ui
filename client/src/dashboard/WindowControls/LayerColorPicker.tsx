import type { BtnProps } from "@components/Btn";
import React from "react";
import { ColorPicker } from "../W_Table/ColumnMenu/ColorPicker";
import type { ChartLinkOptions } from "./DataLayerManager/DataLayer";
import { MapLayerStyling } from "./MapLayerStyling";

export type LayerColorPickerProps = {
  linkOptions: ChartLinkOptions;
  onChange: (newOptions: ChartLinkOptions) => void;
  column: string;
  title?: string;
  btnProps?: BtnProps;
};

export const LayerColorPicker = ({
  linkOptions,
  column,
  title,
  btnProps,
  onChange,
}: LayerColorPickerProps) => {
  const rgba = linkOptions.columns.find((c) => c.name === column)?.colorArr ?? [
    100, 100, 100,
  ];

  if (linkOptions.type === "map") {
    return (
      <MapLayerStyling
        linkOptions={linkOptions}
        onChange={onChange}
        column={column}
        title={title}
      />
    );
  }

  return (
    <ColorPicker
      data-command="LayerColorPicker"
      style={{ flex: "none" }}
      btnProps={btnProps}
      title={title}
      required={true}
      className="w-fit m-p5 text-2"
      value={`rgba(${rgba.join(", ")})`}
      onChange={(colorStr, colorArr) => {
        const updatedColumns = linkOptions.columns.map((c) => ({
          ...c,
          colorArr: c.name === column ? colorArr : c.colorArr,
        }));
        onChange({
          ...linkOptions,
          columns: updatedColumns,
        });
      }}
    />
  );
};

declare global {
  interface Array<T> {
    // Override map to handle union array types better
    map<U>(
      callbackfn: (value: T, index: number, array: T[]) => U,
      thisArg?: any,
    ): U[];
  }
}
