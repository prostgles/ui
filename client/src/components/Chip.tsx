import { mdiClose } from "@mdi/js";
import React from "react";
import "./Animations.css";
import "./Chip.css";
import Btn from "./Btn";
import { FlexCol, classOverride } from "./Flex";
import { Icon } from "./Icon/Icon";
import type { TestSelectors } from "../Testing";

type ChipProps = TestSelectors &
  Omit<
    React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLDivElement>,
      HTMLDivElement
    >,
    "children" | "color"
  > & {
    label?: string;
    subValues?: (string | number)[];
    variant?: "naked" | "header" | "outline" | "default";
    color?: "blue" | "yellow" | "red" | "green" | "gray";
    onDelete?: React.MouseEventHandler<HTMLButtonElement>;
    leftIcon?: {
      path: string;
      onClick?: React.MouseEventHandler<HTMLButtonElement>;
      style?: React.CSSProperties;
      className?: string;
    };
  } & (
    | { value?: string | number; children?: undefined }
    | { children: React.ReactNode }
  );

export default class Chip extends React.Component<ChipProps> {
  render() {
    const {
      className = "",
      subValues,
      label,
      variant = "default",
      onDelete,
      leftIcon,
      color = "gray",
      ...divProps
    } = this.props;

    const asHeader = variant === "header";
    const labelNode =
      typeof label !== "string" ? null : (
        <span
          className={"text-1 "}
          style={
            asHeader ?
              { fontSize: "14px", fontWeight: 400 }
            : { fontWeight: 400 }
          }
        >
          {label}:{" "}
        </span>
      );
    return (
      <div
        {...divProps}
        style={{
          ...(!asHeader && {
            padding: "6px",
            ...(onDelete && {
              paddingLeft: "12px",
            }),
          }),
          ...this.props.style,
        }}
        className={classOverride(
          `chip-component flex-row ws-pre-wrap ai-center chip lg ${color} variant-${variant}  ${asHeader ? "text-ellipsis" : ""}`,
          className,
        )}
      >
        {leftIcon ?
          leftIcon.onClick ?
            <Btn
              iconPath={leftIcon.path}
              onClick={leftIcon.onClick}
              className={classOverride("mr-p5 round", leftIcon.className)}
              size="medium"
              style={{
                padding: 0,
                background: "transparent",
                color: "black",
                ...leftIcon.style,
              }}
              variant="filled"
            />
          : <Icon
              path={leftIcon.path}
              className={classOverride("mr-p5 round", leftIcon.className)}
              size={1}
              style={leftIcon.style}
            />

        : null}

        {!asHeader && labelNode}

        <FlexCol className={`gap-p25 `}>
          {asHeader && labelNode}
          {"value" in this.props && this.props.value ?
            <span
              className="font-medium f-1 text-ellipsis"
              style={{ padding: "2px" }}
            >
              {this.props.value}
            </span>
          : asHeader ?
            <div className="text-ellipsis">{this.props.children}</div>
          : this.props.children}
          {!!subValues?.length &&
            subValues.map((subValue, i) => (
              <span
                key={i}
                className=" f-1 text-ellipsis"
                style={{ opacity: 0.7, padding: "2px" }}
              >
                {subValue}
              </span>
            ))}
        </FlexCol>

        {onDelete && (
          <Btn
            iconPath={mdiClose}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDelete(e);
            }}
            className="Chip_DeleteBtn ml-p5 round as-start text-1"
            size="medium"
            style={{
              padding: 0,
              borderRadius: "1000%",
              background: "transparent",
            }}
            color="action"
          />
        )}
      </div>
    );
  }
}
