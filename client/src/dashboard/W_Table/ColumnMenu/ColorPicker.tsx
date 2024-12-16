import React from "react";
import Btn from "../../../components/Btn";
import type { BtnProps } from "../../../components/Btn";
import {
  FlexCol,
  FlexRow,
  FlexRowWrap,
  classOverride,
} from "../../../components/Flex";
import FormField from "../../../components/FormField/FormField";
import { FormFieldDebounced } from "../../../components/FormField/FormFieldDebounced";
import Popup from "../../../components/Popup/Popup";
import { Label, type LabelProps } from "../../../components/Label";
import { isObject } from "../../../../../commonTypes/publishUtils";
import { mdiPalette } from "@mdi/js";

export type RGBA = [number, number, number, number];
const COLOR_PALETTE = [
  "#F79800",
  "#ff004a",
  "#CB11F0",
  "#7430F0",
  "#ffffff",
  "#174CFA",
  "#0AA1FA",
  "#36E00B",
  "rgb(143 143 143)",
];

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
                <div
                  key={ci}
                  className={"round pointer mr-1 mb-1 shadow"}
                  style={{ width: "24px", height: "24px", backgroundColor: c }}
                  onClick={(e) => {
                    onChange(asHex(c), asRGB(c), asRGB(c, "255"));
                    this.setState({ anchorEl: null });
                  }}
                ></div>
              ))}
            </FlexRowWrap>
            <FlexRow>
              <FormField
                label="Other"
                type="color"
                value={asHex(value)}
                onChange={(c) => this.onChange(c)}
              />
              <FormFieldDebounced
                label="Opacity"
                type="number"
                value={asRGB(value)[3] || 1}
                maxWidth={50}
                inputProps={{
                  step: 0.1,
                  min: 0.1,
                  max: 1,
                }}
                onChange={(opacity: number) => {
                  const [r, g, b] = asRGB(value);
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
        color,
      }}
    />
  );
};

export const asHex = (v: string) => {
  if (v.startsWith("#")) return v;

  const [r, g, b] = asRGB(v);
  return rgbToHex(r, g, b);
};

export const rgbToHex = (r, g, b) =>
  "#" +
  [r, g, b]
    .map((x) => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("");

export const asRGB = (color: string, maxOpacity?: "1" | "255"): RGBA => {
  if (color.toLowerCase().trim().startsWith("rgb")) {
    const rgba = color
      .trim()
      .split("(")[1]
      ?.split(")")[0]
      ?.split(",")
      .map((v) => +v.trim());
    if ((rgba?.length ?? 0) >= 3 && rgba?.every((v) => Number.isFinite(v))) {
      let opacity = rgba[3] || 1;
      if (maxOpacity === "255" && opacity <= 1) {
        opacity = Math.max(1, Math.floor((1 / opacity) * 255));
      }
      const rgb = rgba.slice(0, 3) as [number, number, number];
      return [...rgb, opacity] as RGBA;
    }
    return [100, 100, 100, maxOpacity === "255" ? 255 : 1];
  }

  const r = parseInt(color.substr(1, 2), 16);
  const g = parseInt(color.substr(3, 2), 16);
  const b = parseInt(color.substr(5, 2), 16);
  let a = parseInt(color.substr(7, 2), 16) || 1;

  if (maxOpacity === "255" && a <= 1) {
    a = Math.max(1, Math.floor((1 / a) * 255));
  }
  return [r, g, b, a];
};

function rgba2hex(orig: string) {
  let a;
  const rgb = orig
    .replace(/\s/g, "")
    .match(/^rgba?\((\d+),(\d+),(\d+),?([^,\s)]+)?/i) as string[] | null;
  const alpha = ((rgb && rgb[4]) || "").trim();
  let hex =
    rgb ?
      ((rgb[1] as any | 1) << 8).toString(16).slice(1) +
      ((rgb[2] as any | 1) << 8).toString(16).slice(1) +
      ((rgb[3] as any | 1) << 8).toString(16).slice(1)
    : orig;

  if (alpha !== "") {
    a = alpha;
  } else {
    a = 1;
  }
  // multiply before convert to HEX
  a = ((a * 255) | (1 << 8)).toString(16).slice(1);
  hex = hex + a;

  return `#${hex}`;
}
