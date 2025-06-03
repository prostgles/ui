import { mdiClose, mdiMenuDown, mdiPencil } from "@mdi/js";
import React from "react";
import { RenderValue } from "../../dashboard/SmartForm/SmartFormField/RenderValue";
import Btn from "../Btn";
import type { FullOption, OptionKey, SelectProps, SelectState } from "./Select";
import { getCommandElemSelector } from "../../Testing";

type P<
  O extends OptionKey,
  Multi extends boolean = false,
  Optional extends boolean = false,
> = Omit<SelectProps<O, Multi, Optional>, "fullOptions" | "onOpen"> & {
  fullOptions: FullOption<string>[];
  multiSelection: any[] | undefined;
  selectStyle: React.CSSProperties;
  fixedBtnWidth: number | undefined;
  chipMode: boolean;
  selectClass: string;
  popupAnchor: HTMLElement | null;
  onPress: (btn: HTMLButtonElement, defaultSearch: string | undefined) => void;
  setRef: (ref: HTMLButtonElement) => void;
  btnLabel: string | undefined;
  selectedFullOptions: FullOption<string>[];
};
export const SelectTriggerButton = <
  O extends OptionKey,
  Multi extends boolean = false,
  Optional extends boolean = false,
>(
  props: P<O, Multi, Optional>,
) => {
  const {
    onChange,
    className = "",
    title,
    value: _value,
    label,
    labelAsValue,
    emptyLabel = "Select...",
    iconPath,
    buttonClassName = "",
    size,
    btnProps,
    disabledInfo,
    optional = false,
    showIconOnly,
    fullOptions,
    multiSelection,
    fixedBtnWidth,
    selectStyle,
    chipMode,
    selectClass,
    popupAnchor,
    onPress,
    setRef,
    btnLabel,
    selectedFullOptions,
  } = props;

  const value = multiSelection ?? _value;
  const options: OptionKey[] = fullOptions.map(({ key }) => key);
  const noOtherOption =
    !options.length || (options.length === 1 && value === options[0]);

  if (!onChange) return null;

  const showSelectedIcon =
    showIconOnly ? selectedFullOptions[0]?.iconPath : undefined;

  const triggerButton = (
    <Btn
      title={title}
      style={{
        borderRadius: "6px",
        position: "relative",
        /* Ensure the dropdown end icon is aligned with end when no value is selected */
        justifyContent: "space-between",
        minHeight: "32px",

        ...selectStyle,
        ...(fixedBtnWidth && { width: `${fixedBtnWidth}px` }),
      }}
      /** Use "data-command" for content when button not needed anymore */
      data-command={popupAnchor ? undefined : props["data-command"]}
      className={`${label ? "  " : className} Select w-fit f-0 select-button ${selectClass} ${buttonClassName}`}
      size={size}
      variant={chipMode ? "icon" : "faded"}
      color={chipMode ? "action" : "default"}
      iconPath={
        showSelectedIcon ?? iconPath ?? (chipMode ? mdiPencil : mdiMenuDown)
      }
      iconPosition={!btnProps?.iconPath ? "right" : "left"}
      iconClassname={
        btnProps?.iconPath || showSelectedIcon ? ""
        : chipMode ?
          undefined
        : "text-2"
      }
      disabledInfo={
        disabledInfo ?? (noOtherOption ? "No other option" : undefined)
      }
      disabledVariant={noOtherOption ? "no-fade" : undefined}
      {...btnProps}
      onClick={
        noOtherOption ? undefined : (
          (e) => {
            onPress(e.currentTarget, undefined);
          }
        )
      }
      //@ts-ignore
      _ref={(r) => {
        if (r) {
          setRef(r);
        }
      }}
      onKeyDown={
        noOtherOption ? undefined : (
          (e) => {
            const { key, currentTarget } = e;
            const isFocused = document.activeElement === currentTarget;
            if (!isFocused) return;
            const isAlphanumeric = key.match(/^[a-z0-9]$/i);
            if (isAlphanumeric && !popupAnchor) {
              onPress(e.currentTarget, key);
            } else if (["Enter", " "].includes(key) && !popupAnchor) {
              e.preventDefault();
              e.stopPropagation();
              onPress(e.currentTarget, undefined);
            } else if (["ArrowUp", "ArrowDown"].includes(key)) {
              const selectOpt = document.querySelector<HTMLUListElement>(
                getCommandElemSelector("Popup.content") +
                  " ul > li:first-child",
              );
              if (selectOpt) {
                selectOpt.focus();
                return;
              }
              const increm = key === "ArrowUp" ? -1 : 1;
              let selIdx = options.indexOf(value) + increm;
              if (selIdx < 0) selIdx = options.length - 1;
              else if (selIdx > options.length - 1) selIdx = 0;
              onChange(options[selIdx] as any, e, fullOptions[selIdx] as any);

              e.preventDefault();
            }
          }
        )
      }
      children={
        chipMode || showSelectedIcon ? null
        : iconPath || btnProps?.children !== undefined ?
          (btnProps?.children ?? null)
        : <>
            <div
              className={
                " text-ellipsis " +
                (value !== undefined ? "text-color-0" : "text-1")
              }
              style={{ lineHeight: "18px" }}
            >
              {!labelAsValue ?
                (btnLabel ?? emptyLabel)
              : <RenderValue
                  column={undefined}
                  value={btnLabel}
                  showTitle={!noOtherOption}
                  maxLength={150}
                />
              }
            </div>
          </>

      }
    />
  );

  const trigger =
    !optional ? triggerButton : (
      <div
        className={`${label ? "  " : className} flex-row gap-p5 ai-center ${selectClass} `}
      >
        {triggerButton}
        {![undefined, null].includes(value) && (
          <Btn
            iconPath={mdiClose}
            title="Reset selection"
            onClick={(e) => onChange(undefined as any, e, undefined)}
          />
        )}
      </div>
    );

  return trigger;
};
