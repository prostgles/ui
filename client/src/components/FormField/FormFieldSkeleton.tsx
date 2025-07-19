import React, { forwardRef, type Ref } from "react";
import "./FormField.css";

import { isObject } from "prostgles-types";
import type { TestSelectors } from "../../Testing";
import ErrorComponent from "../ErrorComponent";
import { classOverride, FlexRow, type DivProps } from "../Flex";
import { InfoRow } from "../InfoRow";
import { Label } from "../Label";
import type { FormFieldProps } from "./FormField";

const INPUT_WRAPPER_CLASS = "input-wrapper";

type FormFieldSkeletonProps = TestSelectors &
  Pick<DivProps, "onBlur" | "onKeyDown"> &
  Pick<
    FormFieldProps,
    | "className"
    | "title"
    | "label"
    | "labelStyle"
    | "disabledInfo"
    | "error"
    | "hint"
    | "style"
    | "maxWidth"
    | "rightContentAlwaysShow"
    | "rightIcons"
    | "rightContent"
  > & {
    /**
     * Used by the label to identify the input
     */
    id: string;
    warning?: string;
    errorWrapperClassname: string;
    inputWrapperClassname: string;
    children: React.ReactNode;
    rightIconsShowBorder: boolean;
    hintWrapperStyle: React.CSSProperties;
    labelRightContent: React.ReactNode;
    inputWrapperStyle: React.CSSProperties;
    leftIcon: React.ReactNode;
  };

export const FormFieldSkeleton = forwardRef(
  (props: FormFieldSkeletonProps, ref: Ref<HTMLDivElement>) => {
    const {
      id,
      label,
      inputWrapperClassname,
      error,
      hint,
      children,
      className = "",
      style = {},
      inputWrapperStyle,
      warning,
      errorWrapperClassname,
      rightIcons = null,
      rightIconsShowBorder,
      rightContent = null,
      title,
      maxWidth = "400px",
      labelStyle = {},
      labelRightContent,
      disabledInfo,
      rightContentAlwaysShow,
      onBlur,
      onKeyDown,
      hintWrapperStyle,
      leftIcon,
    } = props;

    const refWrapper = React.useRef<HTMLDivElement>(null);

    const labelString = isObject(label) ? label.label : label;

    return (
      <div
        className={`form-field trigger-hover flex-row min-w-0 ${className} ${disabledInfo ? "disabled" : ""}`}
        data-command={props["data-command"]}
        data-label={labelString}
        data-key={props["data-key"]}
        style={style}
        ref={ref}
        onBlur={onBlur}
        title={disabledInfo}
        onKeyDown={onKeyDown}
      >
        {leftIcon}
        <div
          className={`form-field__hint-wrapper trigger-hover flex-col gap-p5`}
          title={title}
          style={{
            ...hintWrapperStyle,
            ...(disabledInfo && { pointerEvents: "none" }),
          }}
        >
          {isObject(label) && !labelRightContent ?
            <Label
              className="mb-p25"
              {...label}
              htmlFor={id}
              variant="normal"
              style={{ zIndex: 1 }}
            />
          : !labelString ?
            undefined
          : <label
              htmlFor={id}
              className={
                "main-label ta-left noselect text-1 flex-row " +
                (id ? " pointer " : " ")
              }
              style={{
                flex: 0.5,
                justifyContent: "space-between",
                ...labelStyle,
              }}
            >
              {labelString}
              {labelRightContent}
            </label>
          }

          <div
            className={
              "form-field__right-content-wrapper flex-row f-0 ai-center min-w-0 gap-p25 "
            }
          >
            <div
              className={`form-field__error-wrapper ${errorWrapperClassname}`}
              style={{
                maxWidth: "100%",
              }}
            >
              <div
                className={classOverride(
                  `${INPUT_WRAPPER_CLASS} h-fit flex-row relative f-0 focus-border w-full ${error ? " error " : ""}`,
                  inputWrapperClassname,
                )}
                ref={refWrapper}
                style={{
                  maxWidth:
                    inputWrapperStyle.maxWidth ??
                    (children ? "w-fit" : undefined) ??
                    maxWidth,
                  ...inputWrapperStyle,
                }}
              >
                {children}

                {Boolean(rightIcons) && (
                  <FlexRow
                    className={
                      `RightIcons ${rightContentAlwaysShow ? "" : "show-on-trigger-hover"} h-fit as-end gap-0 ai-start jc-center ` +
                      (rightIconsShowBorder ? "  bl b-color " : " ")
                    }
                  >
                    {rightIcons}
                  </FlexRow>
                )}
              </div>

              {(error || warning) && (
                <div className={"flex-col jc-center "}>
                  {warning && (
                    <InfoRow
                      variant="naked"
                      className="font-10"
                      iconSize={0.75}
                    >
                      {warning}
                    </InfoRow>
                  )}
                  {Boolean(error) && (
                    <ErrorComponent
                      error={error}
                      style={{ padding: 0 }}
                      findMsg={true}
                    />
                  )}
                </div>
              )}
            </div>
            {Boolean(rightContent) && (
              <FlexRow
                className={`RightContent  ${rightContentAlwaysShow ? "" : "show-on-trigger-hover"} f-0 gap-0`}
                style={{ alignSelf: "center" }} // So it looks better for asJONB=JSONBSchema
              >
                {rightContent}
              </FlexRow>
            )}
          </div>
          {Boolean(hint) && (
            <p className="ta-left text-2 m-0 text-sm noselect ws-pre-line">
              {hint}
            </p>
          )}
        </div>
      </div>
    );
  },
);
