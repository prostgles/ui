import React from "react";
import "./Select.css";
import { sliceText } from "@common/utils";
import type { TestSelectors } from "../../Testing";
import RTComp from "../../dashboard/RTComp";
import type { BtnProps } from "../Btn";
import Chip from "../Chip";
import { generateUniqueID } from "../FileInput/FileInput";
import { FlexCol, FlexRow } from "../Flex";
import { Icon } from "../Icon/Icon";
import type { LabelProps } from "../Label";
import { Label } from "../Label";
import Popup from "../Popup/Popup";
import type { SearchListItem, SearchListProps } from "../SearchList/SearchList";
import { SearchList } from "../SearchList/SearchList";
import { SelectTriggerButton } from "./SelectTriggerButton";
import Btn from "../Btn";

export type OptionKey = string | number | boolean | Date | null | undefined;
export type FullOption<O extends OptionKey = string> = Pick<
  SearchListItem,
  "ranking" | "parentLabels"
> & {
  key: O;
  label?: string | React.ReactElement;
  subLabel?: string;
  checked?: boolean;
  disabledInfo?: string;
  rightContent?: React.ReactNode;
} & TestSelectors &
  (
    | {
        iconPath?: string;
        leftContent?: undefined;
      }
    | {
        iconPath?: undefined;
        leftContent?: React.ReactNode;
      }
  );

type E =
  | React.MouseEvent<HTMLDivElement, MouseEvent>
  | React.MouseEvent<HTMLButtonElement, MouseEvent>
  | React.MouseEvent<HTMLLIElement, MouseEvent>
  | React.KeyboardEvent<HTMLLIElement>
  | React.KeyboardEvent<HTMLButtonElement>
  | React.ChangeEvent<HTMLInputElement>
  | React.ChangeEvent<HTMLSelectElement>
  | React.KeyboardEvent
  | React.ChangeEvent
  | KeyboardEvent;

// type P<O extends FullOption, Multi extends boolean = false> = {
export type SelectProps<
  O extends OptionKey,
  Multi extends boolean = false,
  Optional extends boolean = false,
> = TestSelectors & {
  onChange?: (
    val: Multi extends true ? O[]
    : O | Optional extends true ? undefined
    : O,
    e: E,
    option: FullOption<O> | undefined,
  ) => void;
  onSearch?: (term: string) => void;
  onOpen?: (buttonAnchorEl: HTMLButtonElement) => void;
  onClose?: VoidFunction;
  name?: string;
  value?: any;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  required?: boolean;
  label?: string | Pick<LabelProps, "label" | "info">;
  /**
   * If true then will show the selected option sublabel underneath
   */
  showSelectedSublabel?: boolean;
  showIconOnly?: boolean;
  title?: string;
  placeholder?: string;
  variant?:
    | "search-list-only"
    | "div"
    | "chips-lg"
    | "button-group"
    | "button-group-vertical";
  multiSelect?: Multi;
  labelAsValue?: boolean;
  emptyLabel?: string;
  asRow?: boolean;
  iconPath?: string;
  size?: "small";
  btnProps?: BtnProps<void>;
  /**
   * Number of rows to slice from result
   */
  limit?: number;
  noSearchLimit?: number;

  showTop?: number;
  sliceMax?: number;

  disabledInfo?: string;
  optional?: Optional;
  nullable?: boolean;
  endOfResultsContent?: SearchListProps["endOfResultsContent"];
} & (
    | {
        options: readonly O[];
      }
    | {
        fullOptions: readonly FullOption<O>[];
      }
  );

export type SelectState = {
  popupAnchor: HTMLElement | null;
  defaultSearch?: string;

  /**
   * To prevent things moving around during multi selection
   *    we will fire onChange after the popup is closed
   */
  multiSelection?: any[];
  fixedBtnWidth?: number;
};

export class Select<
  O extends OptionKey,
  Multi extends boolean = false,
  Optional extends boolean = false,
> extends RTComp<SelectProps<O, Multi, Optional>, SelectState> {
  state: SelectState = {
    popupAnchor: null,
    defaultSearch: undefined,
  };

  btnRef?: HTMLButtonElement;

  id = generateUniqueID();

  render() {
    const {
      onChange: _onChange,
      className = "",
      title,
      value: _value,
      id = this.id,
      style = {},
      required,
      label,
      variant = "div",
      onSearch,
      noSearchLimit = 15,
      endOfResultsContent,
      multiSelect,
      asRow,
      limit,
      showTop = 3,
      sliceMax = 150,
      disabledInfo,
      optional = false,
      showSelectedSublabel = false,
      placeholder = "Search...",
    } = this.props;

    const value = this.state.multiSelection ?? _value;

    let fullOptions: FullOption[] = [];

    if ("options" in this.props) {
      fullOptions = (this.props.options as any).map((key) => ({
        key,
        label: key,
        ...(multiSelect ?
          {
            checked: Boolean(value && (value as string[]).includes(key)),
          }
        : {}),
      }));
    } else {
      if (
        this.props.value &&
        this.props.fullOptions.some((d) => typeof d.checked === "boolean")
      ) {
        console.warn(
          "fullOptions checked AND value provided to Select",
          this.props.fullOptions,
        );
      }
      fullOptions = (this.props.fullOptions as any as FullOption[]).map(
        (o) => ({
          ...o,
          label: o.label ?? (o.key as OptionKey)?.toString(),
          ...(multiSelect && !("checked" in o) ?
            {
              checked: Boolean(value && (value as OptionKey[]).includes(o.key)),
            }
          : {}),
        }),
      );
    }

    fullOptions = fullOptions.map((o) => ({
      ...o,
      label: o.label ?? ((o.label as any) === null ? "NULL" : ""),
    }));

    const selectStyle: React.CSSProperties =
      !label ?
        {
          ...style,
        }
      : {};
    const selectClass =
      !label ?
        disabledInfo ? " disabled "
        : ""
      : "";
    let selectedFullOptions: typeof fullOptions = [];

    const onChange: typeof _onChange = (newValue, e: E) => {
      if (JSON.stringify(value) === JSON.stringify(newValue)) {
        return;
      }

      if (Array.isArray(newValue) && this.state.popupAnchor) {
        this.setState({ multiSelection: newValue });
      } else {
        _onChange?.(
          newValue,
          e,
          Array.isArray(newValue) ? undefined : (
            (fullOptions.find((fo) => fo.key === newValue) as
              | FullOption<O>
              | undefined)
          ),
        );
      }
    };
    const toggleOne = (key: string, e: E) => {
      if (multiSelect) {
        const selected = fullOptions.filter((d) => d.checked).map((d) => d.key);
        if (selected.includes(key)) {
          onChange(
            selected.filter((k) => k !== key) as Multi extends true ? O[]
            : O | Optional extends true ? undefined
            : O,
            e,
            undefined,
          );
        } else {
          onChange(
            [...selected, key] as Multi extends true ? O[]
            : O | Optional extends true ? undefined
            : O,
            e,
            undefined,
          );
        }
      } else {
        onChange(
          key as any,
          e,
          fullOptions.find((fo) => fo.key === key) as FullOption<O> | undefined,
        );
      }
    };

    let select: React.ReactNode = null;
    const { popupAnchor, defaultSearch, fixedBtnWidth } = this.state;

    const closeDropDown = (e: E) => {
      this.props.onSearch?.("");
      if (this.state.multiSelection && _onChange) {
        _onChange(this.state.multiSelection as any, e, undefined);
      }
      this.setState({
        popupAnchor: null,
        multiSelection: undefined,
        fixedBtnWidth: undefined,
        defaultSearch: "",
      });
      /** Maintain the same form element focused for convenience */
      setTimeout(() => {
        if (document.activeElement !== document.body) {
          this.btnRef?.focus();
        }
      }, 2);
    };

    let btnLabel: string | undefined = "Select...";
    if (Array.isArray(value)) {
      if (value.length) {
        selectedFullOptions = fullOptions.filter((o) => value.includes(o.key));
        const labels = selectedFullOptions.map(
          (o) => (o.label as string) || (o.key as OptionKey),
        );
        const firstValues = labels
          .map((v) =>
            sliceText((v === null ? "NULL" : v)?.toString(), sliceMax),
          )
          .slice(0, showTop)
          .join(", ");
        btnLabel =
          firstValues +
          (labels.length > showTop ? ` + ${labels.length - showTop}` : "");
      }
    } else {
      selectedFullOptions = fullOptions.filter((o) => o.key === value);
      btnLabel = fullOptions.find((o) => o.key === value)?.label ?? value;
    }

    const chipMode = variant === "chips-lg";
    const trigger = (
      <SelectTriggerButton
        {...this.props}
        setRef={(r) => {
          this.btnRef = r;
        }}
        selectedFullOptions={selectedFullOptions}
        onChange={onChange}
        optional={optional}
        selectClass={selectClass}
        chipMode={chipMode}
        fixedBtnWidth={fixedBtnWidth}
        fullOptions={fullOptions}
        selectStyle={selectStyle}
        multiSelection={this.state.multiSelection}
        popupAnchor={popupAnchor}
        onPress={(btn, defaultSearch) => {
          const maxBtnWidth = btn.getBoundingClientRect().width;
          this.props.onOpen?.(btn);
          this.setState({
            popupAnchor: btn,
            defaultSearch,
            fixedBtnWidth: maxBtnWidth,
          });
        }}
        btnLabel={btnLabel}
      />
    );
    let chips: React.ReactNode = null;
    if (chipMode) {
      const chipValues =
        multiSelect && popupAnchor ?
          fullOptions.filter((v) => {
            return this.props.value.includes(v.key);
          })
        : selectedFullOptions;
      chips = (
        <div
          className={"Select_Chips flex-row-wrap gap-p5 ai-center " + className}
          style={style}
        >
          {chipValues.map(({ key, label }) => (
            <Chip
              key={key}
              color="blue"
              style={{
                fontSize: "18px",
              }}
              onDelete={(e) => {
                toggleOne(key, e);
              }}
            >
              {label ?? key}
            </Chip>
          ))}
          {trigger}
        </div>
      );
    }

    const searchList = (
      <SearchList
        id={id}
        style={{
          maxHeight: "500px",
          ...(variant === "button-group-vertical" && {
            border: "1px solid var(--b-color)",
            borderRadius: "var(--rounded)",
          }),
        }}
        searchStyle={variant === "search-list-only" ? {} : { margin: "0.5em" }}
        placeholder={placeholder}
        defaultSearch={defaultSearch}
        noSearchLimit={noSearchLimit}
        data-command={this.props["data-command"]}
        data-key={this.props["data-key"]}
        autoFocus={true}
        // noSearch={!onSearch && options.length < 15}
        endOfResultsContent={endOfResultsContent}
        onSearch={onSearch}
        onMultiToggle={
          multiSelect ?
            (items, e) => {
              onChange(
                items
                  .filter((d) => d.checked)
                  .map((d) => d.key) as Multi extends true ? O[]
                : O | Optional extends true ? undefined
                : O,
                e,
                undefined,
              );
            }
          : undefined
        }
        onChange={multiSelect ? undefined : (onChange as any)}
        limit={limit}
        items={fullOptions.map(
          ({
            key,
            label,
            subLabel,
            checked,
            disabledInfo,
            ranking,
            iconPath,
            leftContent,
            rightContent,
            ...selectorProps
          }) => {
            return {
              key: key as OptionKey,
              label,
              subLabel,
              ranking,
              contentLeft:
                leftContent ? leftContent
                : iconPath ? <Icon path={iconPath} className="text-1" />
                : undefined,
              contentRight: rightContent,
              styles: {
                subLabel: {
                  whiteSpace: "pre-wrap",
                },
              },
              onPress: (e) => {
                toggleOne(key, e);
                if (!multiSelect) {
                  closeDropDown(e);
                }
              },
              selected: key === value,
              checked,
              disabledInfo,
              ...selectorProps,
            };
          },
        )}
      />
    );

    if (variant === "search-list-only") {
      return searchList;
    }

    const labelNode =
      typeof label === "string" ?
        <label
          htmlFor={id}
          className={
            "noselect f-0 text-1 ta-left " + (asRow ? " mr-p5 " : " mb-p5 ")
          }
        >
          {label}
        </label>
      : <Label {...label} variant="normal" className={"mb-p5"} />;
    if (variant === "button-group-vertical") {
      return (
        <FlexCol className="gap-p25">
          {labelNode}
          {searchList}
        </FlexCol>
      );
    }
    if (variant === "button-group") {
      select = (
        <FlexRow className="rounded gap-0 b b-color">
          {fullOptions.map((fullOption, index) => {
            const hasPrevItem = index > 0;
            const hasNextItem = index < fullOptions.length - 1;
            const { key, label, disabledInfo, ...otherProps } = fullOption;
            return (
              <Btn
                key={key}
                data-key={otherProps["data-key"] ?? key}
                style={{
                  ...(hasPrevItem && {
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                  }),
                  ...(hasNextItem && {
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                  }),
                }}
                color="default"
                size={this.props.size}
                variant={value === key ? "faded" : undefined}
                disabledInfo={disabledInfo}
                onClick={(e) => {
                  //@ts-ignore
                  onChange(key, e, fullOption);
                }}
                value={key.toString()}
              >
                {label ?? key}
              </Btn>
            );
          })}
        </FlexRow>
      );
    } else {
      select = (
        <>
          {chips || trigger}
          {popupAnchor && (
            <Popup
              rootStyle={{
                padding: 0,
                maxWidth: "min(99vw, 600px)",
                boxSizing: "border-box",
              }}
              anchorEl={popupAnchor}
              positioning="beneath-left-minfill"
              clickCatchStyle={{ opacity: 0 }}
              onClose={closeDropDown}
              contentClassName="rounded p-0"
              persistInitialSize={true}
            >
              {searchList}
            </Popup>
          )}
        </>
      );
    }

    const [selectedFullOption] = selectedFullOptions;
    if (!label) {
      return select;
    }

    return (
      <div
        className={
          "Select w-fit " +
          (asRow ? " flex-row ai-center " : " flex-col ") +
          className
        }
        style={style}
      >
        {labelNode}
        {select}
        {showSelectedSublabel &&
          selectedFullOption &&
          !!selectedFullOption.subLabel?.length && (
            <FlexRow className="w-fit p-p5 text-1p5 gap-p5 font-14">
              {!!selectedFullOption.iconPath && (
                <Icon path={selectedFullOption.iconPath} size={1} />
              )}
              {selectedFullOption.subLabel}
            </FlexRow>
          )}
      </div>
    );
  }
}
