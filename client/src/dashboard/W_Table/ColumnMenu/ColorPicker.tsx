import { mdiPalette } from "@mdi/js";
import React from "react";
import { isObject } from "@common/publishUtils";
import type { BtnProps } from "@components/Btn";
import Btn from "@components/Btn";
import { FlexRow, FlexRowWrap, classOverride } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import { type LabelProps } from "@components/Label";
import Popup from "@components/Popup/Popup";
import type { Command } from "../../../Testing";
import { getRandomElement } from "./ColumnStyleControls";
import { rgba2hex } from "./rgba2hex";
import { asHex, asRGB, type RGBA } from "src/utils/colorUtils";

type S = {
  anchorEl: Element | null;
};

export class ColorPicker extends React.Component<
  {
    style?: React.CSSProperties;
    className?: string;
    value: string;
    onChange: (color: string, rgb: RGBA, rgb255Alpha: RGBA) => void;
    btnProps?: BtnProps;
    label?: string | LabelProps;
    required?: boolean;
    title?: string;
    variant?: "legend";
    "data-command"?: Command;
  },
  S
> {
  state: S = {
    anchorEl: null,
  };

  asString = ([r, g, b, a = 1]: RGBA) => {
    return `rgba(${[r, g, b, a]})`;
  };

  color?: string;
  lastChanged = Date.now();
  willChange: any;
  onChange = (c: string) => {
    this.color = c;

    const { onChange } = this.props;
    const thresh = 500;
    const now = Date.now();

    if (this.willChange || now - this.lastChanged < thresh) {
      clearTimeout(this.willChange);
      this.willChange = setTimeout(() => {
        this.willChange = null;
        this.onChange(this.color ?? "");
      }, thresh);
    } else {
      onChange(asHex(this.color), asRGB(this.color), asRGB(this.color, "255"));
      this.lastChanged = now;
    }
  };

  render() {
    const { anchorEl } = this.state;
    const {
      value,
      style = {},
      className = "",
      onChange,
      label,
      variant,
      btnProps,
    } = this.props;

    const rgba = asRGB(value);
    const opacity = rgba[3] <= 1 ? rgba[3] : rgba[3] / 255;

    const labelNode =
      label ?
        isObject(label) ? null
        : <div className=" noselect f-d1">{label}</div>
      : null;
    const colorNode = (
      <ColorCircle
        {...btnProps}
        label={isObject(label) ? label : undefined}
        color={value}
        onClick={(e) => {
          this.setState({ anchorEl: e.currentTarget });
        }}
      />
    );

    return (
      <FlexRow
        data-command={this.props["data-command"]}
        className={classOverride("gap-p5 ai-center ", className)}
        style={style}
      >
        {variant === "legend" ?
          <>
            {colorNode}
            {labelNode}
          </>
        : <>
            {labelNode}
            {colorNode}
          </>
        }
        {anchorEl && (
          <Popup
            title={"Layer color"}
            anchorEl={anchorEl}
            positioning="beneath-left"
            onClose={() => this.setState({ anchorEl: null })}
            contentClassName="p-1 flex-col gap-1"
          >
            <FlexRowWrap>
              {COLOR_PALETTE.map((c, ci) => (
                <Btn
                  key={ci}
                  data-key={c}
                  className={"pointer shadow"}
                  style={{
                    width: "24px",
                    height: "24px",
                    backgroundColor: c,
                    borderRadius: "1000%",
                  }}
                  onClick={(e) => {
                    onChange(asHex(c), asRGB(c), asRGB(c, "255"));
                    this.setState({ anchorEl: null });
                  }}
                />
              ))}
            </FlexRowWrap>
            <FlexRow>
              <FormField
                label="Other"
                type="color"
                value={asHex(`rgb(${rgba.slice(0, -1).join(",")})`)}
                style={{ opacity }}
                onChange={(c) => this.onChange(c)}
              />
              <FormFieldDebounced
                label="Opacity"
                type="number"
                value={rgba[3] || 1}
                maxWidth={50}
                inputProps={{
                  step: 0.1,
                  min: 0.1,
                  max: 1,
                }}
                onChange={(opacity: number) => {
                  const [r, g, b] = rgba;
                  const colorStr = this.asString([r, g, b, opacity]);
                  const hex = rgba2hex(colorStr);
                  this.onChange(hex);
                }}
              />
            </FlexRow>
            {!this.props.required && (
              <Btn
                className="mt-1"
                onClick={() => {
                  this.onChange("");
                }}
              >
                None
              </Btn>
            )}
          </Popup>
        )}
      </FlexRow>
    );
  }
}

export const ColorCircle = ({
  color,
  onClick,
  label,
  size,
}: Pick<BtnProps, "onClick" | "label" | "size"> & { color: string }) => {
  return (
    <Btn
      label={label}
      size={size}
      className={"shadow b b-color f-0"}
      style={{ backgroundColor: color }}
      onClick={onClick}
      iconProps={{
        path: mdiPalette,
        style: {
          /** button has bg which stacks when opacity < 1  */
          opacity: 0,
        },
      }}
    />
  );
};

export const COLORS = {
  "dark blue": "#174CFA",
  blue: "#0AA1FA",
  cyan: "#00D5FF",
  green: "#36E00B",
  orange: "#F79800",
  red: "#ff004a",
  purple: "#CB11F0",
  indigo: "#7430F0",
  gray: "#cecece",
} as const;

export const COLOR_PALETTE = Object.values(COLORS);

export const COLOR_PALETTE_RGB = COLOR_PALETTE.map(
  (c) => asRGB(c).slice(0, 3) as [number, number, number],
);

export const getPaletteRGBColor = (layerIndex: number) => {
  return (
    COLOR_PALETTE_RGB[layerIndex] ?? getRandomElement(COLOR_PALETTE_RGB).elem
  );
};
