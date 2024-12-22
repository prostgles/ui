import React from "react";
import { isObject } from "../../../commonTypes/publishUtils";
import Btn from "./Btn";
import { FlexCol } from "./Flex";
import type { LabelProps } from "./Label";
import { Label } from "./Label";
import type { FullOption } from "./Select/Select";
import Select from "./Select/Select";
import { pickKeys } from "prostgles-types";

type P<Option extends string = never> = {
  onChange: (val: Option, e: any) => void;
  value?: Option;
  style?: object;
  className?: string;
  id?: string;
  variant?: "dense" | "select";
  size?: "small";
  label?: string | LabelProps;
} & (
  | {
      options: readonly Option[];
    }
  | {
      fullOptions: readonly FullOption<Option>[];
    }
);

export default class ButtonGroup<Option extends string> extends React.Component<
  P<Option>,
  any
> {
  render() {
    const {
      onChange,
      className = "",
      value,
      id = "",
      style = {},
      size,
      variant,
      label,
    } = this.props;
    const br = ".375rem";

    const fullOptions: readonly FullOption[] =
      "fullOptions" in this.props ?
        this.props.fullOptions
      : this.props.options.map((key) => ({ key, label: key }));
    const getStyle = (i: number, isActive = false) => {
      const nb: React.CSSProperties = {
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        fontWeight: 500,
      };

      if (!i)
        return {
          ...nb,
          borderTopLeftRadius: br,
          borderBottomLeftRadius: br,
          marginRight: "-1px",
        };
      if (i < fullOptions.length - 1) {
        return {
          ...nb,
          marginRight: "-1px",
        };
      }
      return {
        ...nb,
        borderTopRightRadius: br,
        borderBottomRightRadius: br,
      };
    };

    if (variant === "select") {
      return (
        <Select
          btnProps={{ color: "default", variant: "faded" }}
          className="shadow"
          fullOptions={fullOptions}
          value={value}
          onChange={(val, e) => onChange(val as any, e)}
        />
      );
    }

    const buttons = (
      <div className={"bbutton-group flex-row o-auto  rounded-md w-fit "}>
        {fullOptions.map(({ key, label, disabledInfo, ...otherProps }, i) => (
          <Btn
            key={key}
            data-key={otherProps["data-key"] ?? key}
            color="action"
            size={size}
            style={{ ...getStyle(i, value === key) }}
            variant={value === key ? "filled" : "outline"}
            disabledInfo={disabledInfo}
            onClick={(e) =>
              key === value ? undefined : onChange(key as any, e)
            }
            value={key.toString()}
            {...pickKeys(otherProps, ["data-command", "id"])}
          >
            {label ?? key}
          </Btn>
        ))}
      </div>
    );

    return (
      <FlexCol style={{ gap: ".5em", ...style }} className={className}>
        {label !== undefined && (
          <Label
            label={typeof label === "string" ? label : undefined}
            {...(isObject(label) ? label : {})}
          />
        )}
        {buttons}
      </FlexCol>
    );
  }
}
