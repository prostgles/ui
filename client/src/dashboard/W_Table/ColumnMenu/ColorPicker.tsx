import { isObject } from "@common/publishUtils";
import type { BtnProps } from "@components/Btn";
import Btn from "@components/Btn";
import { FlexRow, FlexRowWrap, classOverride } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import { type LabelProps } from "@components/Label";
import Popup from "@components/Popup/Popup";
import { mdiPalette } from "@mdi/js";
import React from "react";
import { asHex, asRGB, type RGBA } from "@common/ColumnConfig/colorUtils";
import type { Command } from "../../../Testing";
import { rgba2hex } from "./rgba2hex";
import { COLUMN_COLOR_PALETTE } from "@common/ColumnConfig/chipColors";
import { resolveColor } from "../../../utils/resolveColor";

type S = {
  anchorEl: Element | null;
};

export class ColorPicker extends React.Component<
  {
    style?: React.CSSProperties;
    className?: string;
    value: string;
    palette?: readonly string[];
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
      const resolvedColor = resolveColor(this.color);
      onChange(
        this.color.startsWith("var(") ? this.color : asHex(this.color),
        asRGB(resolvedColor),
        asRGB(resolvedColor, "255"),
      );
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
      palette = COLUMN_COLOR_PALETTE,
    } = this.props;

    const rgba = asRGB(resolveColor(value));
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
        className={classOverride("ColorPicker gap-p5 ai-center ", className)}
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
            title={this.props.title ?? "Layer color"}
            anchorEl={anchorEl}
            positioning="beneath-left"
            onClose={() => this.setState({ anchorEl: null })}
            contentClassName="p-1 flex-col gap-1"
          >
            <FlexRowWrap>
              {palette.map((c, ci) => (
                <Btn
                  key={ci}
                  data-key={c}
                  title={c}
                  className={"pointer shadow"}
                  style={{
                    width: "24px",
                    height: "24px",
                    backgroundColor: c,
                    borderRadius: "1000%",
                  }}
                  onClick={(e) => {
                    const resolvedColor = resolveColor(c);
                    onChange(
                      c.startsWith("var(") ? c : asHex(c),
                      asRGB(resolvedColor),
                      asRGB(resolvedColor, "255"),
                    );
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
  ...buttonProps
}: Pick<BtnProps, "onClick" | "label" | "title" | "disabledInfo"> & {
  color: string;
}) => {
  return (
    <Btn
      {...buttonProps}
      label={label}
      size={"micro"}
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
