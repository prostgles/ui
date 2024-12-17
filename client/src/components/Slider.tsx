import React from "react";
import { isDefined } from "../utils";
import { FlexCol, classOverride } from "./Flex";
import { Label } from "./Label";
import "./Slider.css";

type P = {
  style?: React.CSSProperties;
  className?: string;

  onChange: (
    val: number,
    event?: Parameters<React.ChangeEventHandler<HTMLInputElement>>[0],
  ) => void;
  min: number;
  max: number;
  step?: number;
  value?: number;

  defaultValue?: number;
  label?: string;
};

export const Slider = (props: P) => {
  const {
    style = {},
    className = "",
    min,
    max,
    value,
    label,
    onChange,
    step,
    defaultValue,
  } = props;

  const percentage =
    !isDefined(value) ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <FlexCol
      className={classOverride("slidecontainer gap-p25", className)}
      style={style}
      onDoubleClick={
        !Number.isFinite(defaultValue) ?
          undefined
        : () => {
            onChange(defaultValue!);
          }
      }
    >
      {label && <Label label={label} variant="normal" />}
      <input
        type="range"
        min={min}
        max={max}
        value={value ?? min}
        step={Math.min(1, step ?? Math.abs(min - max) / 60)}
        className="slider pointer"
        style={{
          background: `linear-gradient(to right, var(--action) ${percentage}%, var(--bg-color-3) ${percentage}%)`,
        }}
        onChange={(e) => onChange(+e.target.value, e)}
      />
    </FlexCol>
  );
};
