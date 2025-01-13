import React from "react";
import "./FormField.css";

import ErrorComponent from "../ErrorComponent";
import type { FullOption } from "../Select/Select";
import Select from "../Select/Select";
import Btn, { FileBtn } from "../Btn";
import List from "../List";
import Checkbox from "../Checkbox";
import { mdiAlertCircleOutline, mdiClose, mdiFullscreen } from "@mdi/js";
import { InfoRow } from "../InfoRow";
import type {
  CodeEditorJsonSchema,
  CodeEditorProps,
} from "../../dashboard/CodeEditor/CodeEditor";
import { CodeEditor } from "../../dashboard/CodeEditor/CodeEditor";
import { generateUniqueID } from "../FileInput/FileInput";
import { onFormFieldKeyDown } from "./onFormFieldKeyDown";
import SmartFormField from "../../dashboard/SmartForm/SmartFormField/SmartFormField";
import { ChipArrayEditor } from "../../dashboard/SmartForm/ChipArrayEditor";
import type { ValidatedColumnInfo } from "prostgles-types";
import { isDefined, isObject } from "prostgles-types";
import type { LabelProps } from "../Label";
import { Label } from "../Label";
import type { TestSelectors } from "../../Testing";
import { classOverride } from "../Flex";
import { Icon } from "../Icon/Icon";
import Popup from "../Popup/Popup";
import { FormFieldCodeEditor } from "./FormFieldCodeEditor";

const INPUT_HINT_WRAPPER_CLASS = "input-hint-wrapper";
const INPUT_WRAPPER_CLASS = "input-wrapper";

export type FormFieldProps = TestSelectors & {
  onChange?: (val: string | number | any, e?: any) => void;
  onInput?: (e: React.FormEvent<HTMLInputElement>) => void;
  error?: any;
  type?: string;
  className?: string;
  label?: string | Omit<Extract<LabelProps, { variant: "normal" }>, "variant">;
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
  asColumn?: boolean;
  accept?: string;
  asTextArea?: boolean;
  asJSON?: {
    schemas?: CodeEditorJsonSchema[];
    options?: Omit<CodeEditorProps, "language" | "value">;
  };
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
  labelClass?: string;
  labelStyle?: React.CSSProperties;

  disabledInfo?: string;

  arrayType?: Pick<ValidatedColumnInfo, "udt_name" | "tsDataType">;
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
      const ta = this.rootDiv.querySelector("textarea");
      if (ta) {
        this.textArea = ta;
        ta.addEventListener("input", this.resize, false);
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
      asJSON,
      accept,
      onInput,
      asColumn = true,
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
      labelClass = "",
      labelStyle = {},
      disabledInfo,
      arrayType,
      rightContentAlwaysShow,
    } = this.props;

    this.id ??= this.props.id ?? generateUniqueID();
    const id = this.id;

    const arrayEditor =
      arrayType ?
        <ChipArrayEditor
          elemTsType={arrayType.tsDataType}
          elemUdtName={arrayType.udt_name}
          inputType={SmartFormField.getInputType({
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
      : asJSON ?
        <FormFieldCodeEditor
          asJSON={asJSON}
          value={value}
          disabledInfo={disabledInfo}
          onChange={onChange}
          className={inputProps.className}
          style={inputProps.style}
          readOnly={readOnly}
        />
      : type === "file" ? <FileBtn {...(inputProps as any)} />
      : type === "checkbox" ? <Checkbox {...(inputProps as any)} />
      : readOnly ?
        <div
          className="pr-p5 py-p5 font-16 ta-left o-auto"
          style={{ fontWeight: 500, maxHeight: "30vh" }}
        >
          {SmartFormField.renderValue(undefined, rawValue)}
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

    let rightIcons1, rightIcons2;
    if (rightIcons) {
      rightIcons1 = rightIcons;
    }
    if (
      !readOnly &&
      !disabledInfo &&
      onChange &&
      (nullable || optional) &&
      !hideClearButton
    ) {
      if (nullable && optional) {
        rightIcons2 = (
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
        rightIcons2 = (
          <Btn
            data-command="FormField.clear"
            title="Set to null"
            style={{
              /** To ensure it's centered with the rest of the content */
              height: "100%",
              // background: "var(--input-bg-color)",
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

    const labelString = isObject(label) ? label.label : label;
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
      <div
        className={`form-field trigger-hover min-w-0 ${className} ${disabledInfo ? "disabled" : ""}`}
        data-command={isEditableSelect ? undefined : this.props["data-command"]}
        data-label={labelString}
        data-key={this.props["data-key"]}
        style={style}
        ref={(e) => {
          if (e) this.rootDiv = e;
        }}
        onBlur={() => {
          if (suggestions) {
            this.setState({ suggestions: undefined });
          }
        }}
        title={disabledInfo}
        onKeyDown={(e) => onFormFieldKeyDown.bind(this)(e, selectSuggestion)}
      >
        <div
          className={`trigger-hover ${(type !== "checkbox" && !asColumn ? " ai-center " : " ") + (!asColumn ? " flex-row-wrap " : " flex-col ")}`}
          title={title}
          style={{
            ...(asJSON && { minWidth: "min(400px, 90vw)" }),
            ...(disabledInfo && { pointerEvents: "none" }),
          }}
        >
          {!!label && isObject(label) ?
            <Label
              className="mb-p25"
              {...label}
              htmlFor={id}
              variant="normal"
              style={{ zIndex: 1 }}
            />
          : <label
              htmlFor={id}
              className={
                "main-label ta-left noselect text-1 flex-row ai-center " +
                (id ? " pointer " : " ") +
                labelClass
              }
              style={{
                flex: 0.5,
                justifyContent: "space-between",
                ...labelStyle,
              }}
            >
              {label}
              {asJSON && (
                <Btn
                  title="Click to toggle full screen"
                  className="show-on-trigger-hover"
                  iconPath={mdiFullscreen}
                  onClick={() => {
                    this.setState({ fullScreen: !this.state.fullScreen });
                  }}
                />
              )}
            </label>
          }

          <div className={" flex-row f-1 ai-center min-w-0 gap-p25 "}>
            <div
              className={`${INPUT_HINT_WRAPPER_CLASS} ${type !== "checkbox" ? "flex-col" : "flex-row"} gap-p5 min-w-0 ${isEditableSelect ? "" : "f-1"}`}
              style={{
                maxWidth: "100%",
              }}
            >
              <div
                className={
                  INPUT_WRAPPER_CLASS +
                  (type === "checkbox" ? " ai-center " : "") +
                  (type === "checkbox" ? " " : " focus-border  ") +
                  " h-fit flex-row relative  f-0 " +
                  (options || fullOptions ? "w-fit" : "w-full") +
                  (error ? " error " : "")
                }
                ref={(e) => {
                  if (e) this.refWrapper = e;
                }}
                style={{
                  ...wrapperStyle,
                  ...(type !== "checkbox" && {
                    backgroundColor: "var(--input-bg-color)",
                  }),
                  maxWidth: asTextArea ? "100%" : maxWidth,
                  ...(asJSON && { minHeight: "42px" }),
                  ...(readOnly &&
                    !asJSON && { border: "unset", boxShadow: "unset" }),
                  ...this.props.wrapperStyle,
                }}
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
                    fullOptions={
                      options?.map((key) => ({ key })) ?? fullOptions ?? []
                    }
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

                {Boolean(rightIcons1 || rightIcons2) && (
                  <div
                    className={
                      `RightIcons ${rightContentAlwaysShow ? "" : "show-on-trigger-hover"} flex-row ai-start jc-center ` +
                      (type !== "checkbox" && !asTextArea && !inputContent ?
                        "  bl b-color "
                      : " ")
                    }
                    style={{
                      right: "2px",
                      top: 0,
                      bottom: 0,
                    }}
                  >
                    {rightIcons1}
                    {rightIcons2}
                  </div>
                )}
                {!!error &&
                  !type.toLowerCase().includes("date") && ( // do not show for date types because it occludes the picker drop down trigger
                    <Icon
                      className="text-danger absolute bg-color-0"
                      path={mdiAlertCircleOutline}
                      style={{
                        width: "1.5rem",
                        top: "2px",
                        bottom: "2px",
                        height: "calc(100% - 4px)",
                        right: "6px",
                        pointerEvents: "none",
                      }}
                    />
                  )}
              </div>

              {(hint || error || numLockAlert) && (
                <div className={"flex-col jc-center "}>
                  {numLockAlert && (
                    <InfoRow
                      variant="naked"
                      className="font-10"
                      iconSize={0.75}
                    >
                      NumLock is off
                    </InfoRow>
                  )}
                  {error ?
                    <ErrorComponent
                      error={error}
                      style={{ padding: 0 }}
                      findMsg={true}
                    />
                  : null}
                </div>
              )}
            </div>
            {!rightContent ? null : (
              <div
                className={`RightContent  ${rightContentAlwaysShow ? "" : "show-on-trigger-hover"} f-0 `}
                style={{ alignSelf: "start" }}
              >
                {rightContent}
              </div>
            )}
          </div>
          {hint && (
            <p
              className="ta-left text-2 m-0 text-sm noselect ws-pre-line"
              onClick={(e) => {
                const input = e.currentTarget
                  .closest(`.${INPUT_HINT_WRAPPER_CLASS}`)
                  ?.querySelector<HTMLInputElement>(
                    `.${INPUT_WRAPPER_CLASS} > *`,
                  );
                input?.click();
              }}
            >
              {hint}
            </p>
          )}
        </div>
      </div>
    );
  }
}
