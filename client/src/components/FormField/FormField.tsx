import React from "react";
import "./FormField.css";

import { mdiClose, mdiFullscreen } from "@mdi/js";
import type { ValidatedColumnInfo } from "prostgles-types";
import { isDefined } from "prostgles-types";
import { ChipArrayEditor } from "../../dashboard/SmartForm/ChipArrayEditor";
import { getInputType } from "../../dashboard/SmartForm/SmartFormField/fieldUtils";
import { RenderValue } from "../../dashboard/SmartForm/SmartFormField/RenderValue";
import type { TestSelectors } from "../../Testing";
import Btn, { FileBtn } from "../Btn";
import Checkbox from "../Checkbox";
import { generateUniqueID } from "../FileInput/FileInput";
import { classOverride } from "../Flex";
import type { LabelProps, LabelPropsNormal } from "../Label";
import List from "../List";
import Popup from "../Popup/Popup";
import type { FullOption } from "../Select/Select";
import Select from "../Select/Select";
import { FormFieldSkeleton } from "./FormFieldSkeleton";
import { onFormFieldKeyDown } from "./onFormFieldKeyDown";
import type { AsJSON } from "../../dashboard/SmartForm/SmartFormField/useSmartFormFieldAsJSON";

export type FormFieldProps = TestSelectors & {
  onChange?: (val: string | number | any, e?: any) => void;
  onInput?: (e: React.FormEvent<HTMLInputElement>) => void;
  error?: any;
  type?: string;
  className?: string;
  label?: string | Omit<LabelPropsNormal, "variant">;
  id?: string;
  readOnly?: boolean;
  /**
   * Passed to the input
   */
  required?: boolean;
  /**
   * If true and value is not null will allow setting value to null
   */
  nullable?: boolean;
  /**
   * If true and value is not undefined will allow setting value to undefined
   */
  optional?: boolean;
  value?: string | number | any;
  rawValue?: any;
  defaultValue?: string | number | any;
  options?: readonly (string | number | null)[];
  fullOptions?: readonly FullOption[];
  autoComplete?: string;
  accept?: string;
  asTextArea?: boolean;
  rightContentAlwaysShow?: boolean;
  rightIcons?: React.ReactNode;
  rightContent?: React.ReactNode;
  inputContent?: React.ReactNode;
  hint?: string;
  placeholder?: string;
  autoResize?: boolean;
  inputClassName?: string;
  style?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  title?: string;
  multiSelect?: boolean;
  labelAsValue?: boolean;
  onSuggest?: (term?: string) => Promise<string[]>;
  name?: string;
  inputProps?: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >;
  hideClearButton?: boolean;
  maxWidth?: React.CSSProperties["maxWidth"];
  labelStyle?: React.CSSProperties;

  disabledInfo?: string;
  asJSON?: AsJSON["component"];
  arrayType?: Pick<ValidatedColumnInfo, "udt_name" | "tsDataType">;
  leftIcon?: React.ReactNode;
};

type FormFieldState = {
  activeSuggestionIdx?: number;
  suggestions?: string[];
  options?: string[];
  numLockAlert?: boolean;
  fullScreen?: boolean;
};
export default class FormField extends React.Component<
  FormFieldProps,
  FormFieldState
> {
  state: FormFieldState = {};

  rootDiv?: HTMLDivElement;
  refWrapper?: HTMLDivElement;

  textArea: any;
  setResizer = () => {
    const { asTextArea, autoResize = true } = this.props;
    if (this.rootDiv && asTextArea && autoResize && !this.textArea) {
      const textArea = this.rootDiv.querySelector("textarea");
      if (textArea) {
        this.textArea = textArea;
        textArea.addEventListener("input", this.resize, false);
        setTimeout(() => {
          this.resize();
        }, 10);
      }
    }
  };

  /** Must autoresize only if it's an increase */
  resize = () => {
    if (this.textArea) {
      const ta = this.textArea;
      const newH = Math.min(100, ta.scrollHeight);
      const newW = ta.scrollWidth; // + 34
      let w = ta.offsetWidth; // Number(ta.style.width.slice(0, -2));
      w = Number.isFinite(w) && w >= ta.offsetWidth ? w : ta.offsetWidth;
      let h = ta.offsetHeight; // Number(ta.style.height.slice(0, -2));
      h = Number.isFinite(h) && h >= ta.offsetWidth ? h : ta.offsetHeight;

      if (w < newW) {
        ta.style.width = "";
        ta.style.width = newW + "px";
      }
      if (h < newH) {
        ta.style.height = "";
        ta.style.height = newH + "px";
      }
    }
  };

  mounted = false;
  componentDidMount() {
    this.mounted = true;
    this.setResizer();
  }

  componentWillUnmount() {
    this.mounted = false;
    if (this.textArea)
      this.textArea.removeEventListener("input", this.resize, false);
  }
  componentDidUpdate(prevProps: FormFieldProps) {
    const err = this.props.error,
      preverr = prevProps.error;
    if (this.rootDiv && (err || preverr) && err !== preverr) {
      if ((this.rootDiv as any).scrollIntoViewIfNeeded) {
        (this.rootDiv as any).scrollIntoViewIfNeeded({
          block: "end",
          behavior: "smooth",
        });
      } else {
        this.rootDiv.scrollIntoView({ block: "end", behavior: "smooth" });
      }
    }
    this.setResizer();
    if (prevProps.value !== this.props.value) {
      this.resize();

      if (
        this.inputRef &&
        /text|password|search|tel|url/.test(this.inputRef.type) &&
        this.cursorPosition !== undefined
      ) {
        this.inputRef.selectionStart = this.cursorPosition;
        this.inputRef.selectionEnd = this.cursorPosition;
      }
    }
  }

  focus = (e) => {};

  blur = (e) => {};

  changing?: {
    value: any;
    timeout: any;
  };

  onChange = (input: HTMLInputElement) => {
    const { onChange, onSuggest } = this.props;

    if (!onChange) return;

    const value =
      input.type === "file" ? input.files
      : input.type === "checkbox" ? input.checked
      : input.value;
    onChange(value);

    if (!onSuggest) return;
    if (this.changing) clearTimeout(this.changing.timeout);
    const delay = this.changing ? 100 : 0;
    this.changing = {
      value,
      timeout: setTimeout(async () => {
        if (this.mounted && this.changing) {
          const { onSuggest } = this.props;
          const { value } = this.changing;
          if (onSuggest) {
            const suggestions = await onSuggest(this.changing.value);
            this.setState({
              suggestions:
                suggestions.length === 1 && suggestions[0] === value ?
                  undefined
                : suggestions,
            });
          }
          this.changing = undefined;
        }
      }, delay),
    };
  };

  cursorPosition?: number = 0;
  inputRef?: HTMLInputElement;
  inputSelStart?: number;
  id?: string;
  render(): React.ReactNode {
    const {
      onChange,
      label,
      value,
      defaultValue,
      required = false,
      type = "text", // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
      autoComplete = "on", // https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete
      error,
      hint,
      placeholder,
      className = "",
      inputClassName = "",
      style = {},
      inputStyle = {},
      asTextArea = false,
      accept,
      onInput,
      rightIcons = null,
      rightContent = null,
      title,
      nullable = false,
      optional = false,
      multiSelect,
      labelAsValue,
      options = this.state.options,
      fullOptions,
      name = this.props.type,
      inputProps: _inputProps = {},
      hideClearButton = false,
      maxWidth = "400px",
      rawValue: rval,
      labelStyle = {},
      disabledInfo,
      arrayType,
      rightContentAlwaysShow,
      asJSON,
      leftIcon,
    } = this.props;

    this.id ??= this.props.id ?? generateUniqueID();
    const id = this.id;

    const arrayEditor =
      arrayType ?
        <ChipArrayEditor
          elemTsType={arrayType.tsDataType}
          elemUdtName={arrayType.udt_name}
          inputType={getInputType({
            name: name ?? "text",
            ...arrayType,
          }).toLowerCase()}
          values={(value as any) || ([] as string[])}
          onChange={onChange as any}
        />
      : null;

    const readOnly = this.props.readOnly ?? false;

    const { suggestions, activeSuggestionIdx = 0, numLockAlert } = this.state;
    const rawValue = [rval, defaultValue, value].find((v) => v !== undefined);

    let wrapperStyle: React.CSSProperties =
      options ?
        {
          width: "fit-content",
          minWidth: 0,
        }
      : {};

    const disablePressStyle: React.CSSProperties = {
      pointerEvents: "none",
      touchAction: "none",
    };

    if (type === "checkbox" && readOnly) {
      wrapperStyle = {
        ...wrapperStyle,
        backgroundColor: "var(--bg-color-2)",
        ...disablePressStyle,
      };
    }

    let valProp: any = {
      value: [undefined, null].includes(value) ? "" : value,
    };

    if (readOnly) valProp = { value };
    if (defaultValue) valProp = { defaultValue };

    let inptClass = " font-semibold ";
    if (type !== "checkbox") {
      wrapperStyle = {
        ...wrapperStyle,
      };
    }

    if (type.startsWith("file")) {
      inptClass += " pointer ";
    }

    let extraInptStyle = {};
    if (type === "color" && value) {
      wrapperStyle = {
        ...wrapperStyle,
        backgroundColor: value || "white",
        cursor: "pointer",
      };
      extraInptStyle = { opacity: 0 };
    }
    if (type === "checkbox") {
      valProp = {
        checked: Boolean(value || defaultValue),
      };
      wrapperStyle = {
        ...wrapperStyle,
        minWidth: 0,
        width: "fit-content",
        border: "none",
        overflow: "visible",
      };
    }
    if (asTextArea || arrayEditor) {
      wrapperStyle = { ...wrapperStyle, border: "none", overflow: "visible" };
    }

    inptClass += " " + inputClassName;

    const inputProps: React.DetailedHTMLProps<
      React.InputHTMLAttributes<HTMLInputElement>,
      HTMLInputElement
    > = {
      id,
      key: id,
      ref: (e) => {
        if (e) {
          this.inputRef = e;
          //@ts-ignore
          e.forceDemoValue = (val: any) => {
            this.props.onChange?.(val);
          };
        }
      },
      required,
      readOnly,
      className: inptClass,
      type,
      accept,
      ...(type !== "file" ? valProp : undefined),
      autoComplete,
      onInput,
      placeholder,
      name,
      /** Why doesn't this happen by default ?! */
      ...{ autoCorrect: "off", autoCapitalize: "off" },
      ..._inputProps,
      style: { ...extraInptStyle, ...inputStyle, ..._inputProps.style },
      onChange: ({ currentTarget }) => {
        this.cursorPosition = currentTarget.selectionStart!;
        return this.onChange(currentTarget);
      },
      onKeyDown:
        type === "number" ?
          (e) => {
            const numLockAlert =
              !e.getModifierState("NumLock") &&
              e.nativeEvent.code.startsWith("Numpad") &&
              e.key !== e.nativeEvent.code.slice(0, "Numpad".length); //(NUMLOCK_KEYS.includes(e.key) || !e.currentTarget.value && ["ArrowRight", "ArrowLeft"].includes(e.key) )
            if (numLockAlert !== this.state.numLockAlert) {
              this.setState({ numLockAlert });
            }
            _inputProps.onKeyDown?.(e);
            const node = e.target as HTMLInputElement;
            if (!node.placeholder && !/^-?\d+$/.test(value)) {
              node.placeholder = "Numbers only";
            }
          }
        : undefined,
      onFocus:
        !_inputProps.onFocus ? undefined : (
          (e) => {
            _inputProps.onFocus?.(e);
          }
        ),
      ...(!type.startsWith("file") ?
        {}
      : {
          onDragOver: (e) => {
            e.currentTarget.classList.toggle("active-drop-target", true);
          },
          onDrop: (e) => {
            e.currentTarget.classList.toggle("active-drop-target", false);
          },
          onDragEnd: (e) => {
            e.currentTarget.classList.toggle("active-drop-target", false);
          },
          onDragExit: (e) => {
            e.currentTarget.classList.toggle("active-drop-target", false);
          },
          onDragLeave: (e) => {
            e.currentTarget.classList.toggle("active-drop-target", false);
          },
        }),
    };

    const selectSuggestion = (key) => {
      onChange?.(key);
      this.setState({ suggestions: undefined });
    };

    const textareaStyle: React.CSSProperties = {
      width: "100%",
      minWidth: "5em",
      minHeight: "2em",
      whiteSpace: "pre-line",
      borderRadius: ".5em",
      ...inputProps.style,
    };

    const inputFinalStyle = {
      ...(inputProps.type !== "file" ?
        {
          padding:
            window.isMobileDevice ? "8px 6px 2px 6px" : ".5em .5em 4px .5em",
        }
      : {
          paddingBottom: "4px",
        }),
      minHeight: window.isLowWidthScreen ? "36px" : "42px",
      ...inputProps.style,
      ...(rval === null && { fontStyle: "italic" }),
    };

    const inputContent = arrayEditor || this.props.inputContent;

    const inputNode =
      inputContent ? inputContent
      : type === "file" ? <FileBtn {...(inputProps as any)} />
      : type === "checkbox" ? <Checkbox {...(inputProps as any)} />
      : readOnly ?
        <div
          className="pr-p5 py-p5 font-16 ta-left o-auto"
          style={{ fontWeight: 500, maxHeight: "30vh" }}
        >
          <RenderValue column={undefined} value={rawValue} />
        </div>
      : asTextArea ?
        <textarea
          {...(inputProps as any)}
          className={classOverride(inputProps.className ?? "", " text-0")}
          style={textareaStyle}
        />
      : <input
          {...inputProps}
          {...(rval === null && { placeholder: "NULL" })}
          style={inputFinalStyle}
        />;

    let extraRightIcons: React.ReactNode = null;
    if (
      !readOnly &&
      !disabledInfo &&
      onChange &&
      (nullable || optional) &&
      !hideClearButton
    ) {
      if (nullable && optional) {
        extraRightIcons = (
          <Select
            btnProps={{
              iconPath: mdiClose,
              children: "",
              style: { background: "transparent" },
            }}
            options={[
              rawValue !== null ? "NULL" : undefined,
              rawValue !== undefined ? "undefined" : undefined,
            ].filter(isDefined)}
            onChange={(v) => {
              onChange(v === "NULL" ? null : undefined);
            }}
          />
        );
      } else if (
        (rawValue !== undefined && optional) ||
        (rawValue !== null && nullable)
      ) {
        extraRightIcons = (
          <Btn
            data-command="FormField.clear"
            title="Set to null"
            style={{
              /** To ensure it's centered with the rest of the content */
              height: "100%",
              ...(type === "checkbox" ? { padding: "0" } : {}),
            }}
            iconPath={mdiClose}
            onClick={(e) => {
              onChange(optional ? undefined : null, e);
            }}
            className="rounded-r"
          />
        );
      }
    }

    const isEditableSelect = !readOnly && Array.isArray(options ?? fullOptions);

    if (this.state.fullScreen && asJSON) {
      return (
        <Popup
          title={typeof label === "string" ? label : undefined}
          positioning="fullscreen"
          onClose={() => {
            this.setState({ fullScreen: false });
          }}
        >
          {inputNode}
        </Popup>
      );
    }

    return (
      <FormFieldSkeleton
        id={id}
        title={title}
        ref={(e) => {
          if (e) this.rootDiv = e;
        }}
        leftIcon={leftIcon}
        data-command={isEditableSelect ? undefined : this.props["data-command"]}
        data-key={this.props["data-key"]}
        className={className}
        disabledInfo={disabledInfo}
        style={style}
        onBlur={() => {
          if (suggestions) {
            this.setState({ suggestions: undefined });
          }
        }}
        onKeyDown={(e) => onFormFieldKeyDown.bind(this)(e, selectSuggestion)}
        hintWrapperStyle={{
          ...(asJSON && { minWidth: "min(400px, 90vw)" }),
        }}
        label={label}
        labelStyle={labelStyle}
        labelRightContent={
          asJSON && (
            <Btn
              title="Click to toggle full screen"
              className="show-on-trigger-hover"
              iconPath={mdiFullscreen}
              size="small"
              style={{ padding: "0" }}
              onClick={() => {
                this.setState({ fullScreen: !this.state.fullScreen });
              }}
            />
          )
        }
        errorWrapperClassname={`${type !== "checkbox" ? "flex-col" : "flex-row"} gap-p5 min-w-0 ${isEditableSelect ? "" : "f-1"}`}
        inputWrapperClassname={
          (type === "checkbox" ? " ai-center " : "") +
          (type === "checkbox" || asJSON === "JSONBSchema" ?
            " focus-border-unset "
          : " ") +
          (options || fullOptions ? "w-fit" : "w-full")
        }
        inputWrapperStyle={{
          ...wrapperStyle,
          ...(type !== "checkbox" && {
            backgroundColor: "var(--input-bg-color)",
          }),
          maxWidth: asTextArea ? "100%" : maxWidth,
          ...(asJSON && { minHeight: "42px" }),
          ...((readOnly || asJSON === "JSONBSchema") && {
            border: "unset",
            boxShadow: "unset",
            /**
             * To ensure focus-border on select controls is visible
             */
            overflow: asJSON === "JSONBSchema" ? "visible" : undefined,
          }),
          ...this.props.wrapperStyle,
        }}
        rightIconsShowBorder={Boolean(
          type !== "checkbox" && !asTextArea && !inputContent,
        )}
        error={error}
        warning={numLockAlert ? "NumLock is off" : undefined}
        rightIcons={
          Boolean(rightIcons || extraRightIcons) && (
            <>
              {rightIcons}
              {extraRightIcons}
            </>
          )
        }
        hint={hint}
        rightContent={rightContent}
        rightContentAlwaysShow={rightContentAlwaysShow}
      >
        {isEditableSelect ?
          <Select
            className="FormField_Select noselect f-1 bg-color-0"
            style={{
              fontSize: "16px",
              fontWeight: 500,
              paddingLeft: "6px",
            }}
            data-command={this.props["data-command"]}
            variant="div"
            fullOptions={options?.map((key) => ({ key })) ?? fullOptions ?? []}
            onChange={
              !onChange ? undefined : (
                (val) => {
                  onChange(val);
                }
              )
            }
            value={rawValue}
            required={required}
            multiSelect={multiSelect}
            labelAsValue={labelAsValue}
            btnProps={{
              id,
            }}
          />
        : inputNode}
        {!this.props.onSuggest || !suggestions ? null : (
          <List
            anchorRef={this.refWrapper}
            selectedValue={suggestions[activeSuggestionIdx]}
            items={suggestions.map((key) => ({
              key,
              node:
                (key as any) === null ? <i>NULL</i>
                : key.trim() === "" ? <i>Empty</i>
                : null,
              onPress: (e) => {
                selectSuggestion(key);
              },
            }))}
            onClose={() => {
              this.setState({ suggestions: undefined });
            }}
          />
        )}
      </FormFieldSkeleton>
    );
  }
}
