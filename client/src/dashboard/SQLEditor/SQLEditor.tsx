import React from "react";
import "./SQLEditor.css";

import ReactDOM from "react-dom";
import type { MonacoSuggestion } from "./SQLCompletion/registerSuggestions";
import { registerSuggestions } from "./SQLCompletion/registerSuggestions";

export const LANG = "sql";
/**
 * This option seems to start downloading monaco (870.js) from the start: webpackPrefetch: true
 */
export const getMonaco = async () => {
  const monaco = await import(
    /* webpackChunkName: "monaco_editorr" */ /*  webpackPrefetchNot */ "monaco-editor/esm/vs/editor/editor.api.js"
  );
  return monaco;
};

export const SUGGESTION_TYPES = [
  "table",
  "view",
  "mview",
  "column",
  "function",
  "dataType",
  "extension",
  "keyword",
  "schema",
  "setting",
  "role",
  "database",
  "folder",
  "file",
  "snippet",
  "policy",
  "publication",
  "subscription",
  "index",
  "operator",
  "constraint",
  "trigger",
  "eventTrigger",
  "rule",
  "user",
] as const;

export const SUGGESTION_TYPE_DOCS: Record<
  (typeof SUGGESTION_TYPES)[number],
  string
> = {
  column:
    "A set of data values of a particular type. Is part of a table or a view",
  constraint: "A way to limit the kind of data that can be stored in a table",
  table: `A table is a collection of related data held in a table format within a database`,
  view: `A view is similar to a table but it can also show data from multiple tables`,
  database: `A place to store all data`,
  dataType: "A set of possible values and a set of allowed operations on it",
  extension:
    "A script that creates new SQL objects such as functions, data types, operators and index support methods",
  file: "",
  folder: "",
  function:
    "A set of SQL and procedural commands such as declarations, assignments, loops, flow-of-control etc. stored on the database server and can be involved using the SQL interface. ",
  index:
    "An index is a pointer to data in a table. A common way to enhance database performance.",
  keyword: "SQL command",
  mview:
    "Materialized view. Similar to views with the exception that the underlying data is saved",
  operator: "Used in comparing values",
  policy: "A row-level security policy for a table",
  publication:
    "A publication is a set of changes generated from a table or a group of tables, and might also be described as a change set or replication set. Each publication exists in only one database. Publications are different from schemas and do not affect how the table is accessed.",
  role: "PostgreSQL manages database access permissions using the concept of roles. A role can be thought of as either a database user, or a group of database users, depending on how the role is set up. Roles can own database objects (for example, tables) and can assign privileges on those objects to other roles to control who has access to which objects. Furthermore, it is possible to grant membership in a role to another role, thus allowing the member role use of privileges assigned to the role it is a member of.",
  user: "A user is a role with LOGIN permission",
  schema:
    "A database contains one or more named schemas, which in turn contain tables. Schemas also contain other kinds of named objects, including data types, functions, and operators. ",
  setting:
    "Server configuration parameters. Can be specified for SYSTEM, DATABASE or ROLE",
  snippet: "A prostgles snippet",
  rule: "An alternative action to be performed on insertions, updates, or deletions in database tables",
  subscription:
    "A subscription represents a replication connection to the publisher. Hence, in addition to adding definitions in the local catalogs, this command normally creates a replication slot on the publisher.",
  trigger:
    "A trigger is a function invoked automatically whenever an event associated with a table occurs. An event could be any of the following: INSERT, UPDATE, DELETE or TRUNCATE.",
  eventTrigger:
    "An event trigger is a function invoked automatically whenever the designated event occurs and the WHEN condition associated with the trigger, if any, is satisfied, the trigger function will be executed",
};

export const DB_OBJ_LABELS: Record<keyof typeof SUGGESTION_TYPES, string> =
  SUGGESTION_TYPES.reduce(
    (a, v) => ({
      ...a,
      [v]: v === "mview" ? "materialized view" : v,
    }),
    {} as Record<keyof typeof SUGGESTION_TYPES, string>,
  );

type CodeBlockSignature = {
  numberOfLineBreaks: number;
  numberOfSemicolons: number;
  currentLineNumber: number;
};

export type SQLSuggestion = {
  type: (typeof SUGGESTION_TYPES)[number];
  name: string;
  label: MonacoSuggestion["label"];
  subLabel?: string;
  escapedIdentifier?: string;
  escapedName?: string;
  OID?: number;
  schema?: string;
  parentOID?: number;
  parentName?: string;
  escapedParentName?: string;
  insertText?: string;
  detail?: string;
  filterText?: string;
  sortText?: string;
  documentation?: string;
  insertTextRules?: any;
  definition?: string;
  funcCallDefinition?: string;
  args?: PG_Function["args"];

  extensionInfo?: {
    installed: boolean;
  };

  tablesInfo?: PG_Table;
  relkind?: string;
  view?: {
    definition: string;
  };

  funcInfo?: PG_Function;

  operatorInfo?: PGOperator;

  userInfo?: PG_Role;

  policyInfo?: PG_Policy;

  triggerInfo?: PG_Trigger;

  settingInfo?: PG_Setting;

  eventTriggerInfo?: PG_EventTrigger;

  constraintInfo?: PGConstraint;

  topKwd?: TopKeyword;
  colInfo?: PG_Table["cols"][number];

  /**
   * Extra info for "dataType"
   */
  dataTypeInfo?: PG_DataType;

  cols?: PG_Table["cols"];

  ruleInfo?: PG_Rule;
};

export const customLightThemeMonaco = "myCustomTheme";

export type MonacoError = Pick<
  editor.IMarkerData,
  "code" | "message" | "severity" | "relatedInformation"
> & {
  position?: number;
  length?: number;
};

import { mdiPlay } from "@mdi/js";
import { isEqual } from "prostgles-types";
import type { SQLHandler } from "prostgles-types";
import Btn from "../../components/Btn";
import { getDataTransferFiles } from "../../components/FileInput/DropZone";
import { FlexCol } from "../../components/Flex";
import { MonacoEditor } from "../../components/MonacoEditor/MonacoEditor";
import { isEmpty, omitKeys } from "prostgles-types";
import { SECOND } from "../Charts";
import type { DashboardState } from "../Dashboard/Dashboard";
import type { WindowData } from "../Dashboard/dashboardUtils";
import RTComp from "../RTComp";
import type { IRange, editor } from "../W_SQL/monacoEditorTypes";
import type { TopKeyword } from "./SQLCompletion/KEYWORDS";
import type { CodeBlock } from "./SQLCompletion/completionUtils/getCodeBlock";
import {
  getCurrentCodeBlock,
  highlightCurrentCodeBlock,
  playButtonglyphMarginClassName,
} from "./SQLCompletion/completionUtils/getCodeBlock";
import type {
  PGConstraint,
  PGOperator,
  PG_DataType,
  PG_EventTrigger,
  PG_Function,
  PG_Policy,
  PG_Role,
  PG_Rule,
  PG_Setting,
  PG_Table,
  PG_Trigger,
} from "./SQLCompletion/getPGObjects";
import {
  addSqlEditorFunctions,
  getSelectedText,
} from "./addSqlEditorFunctions";
import { defineCustomSQLTheme } from "./defineCustomSQLTheme";
import type { GetFuncs } from "./registerFunctionSuggestions";
import { registerFunctionSuggestions } from "./registerFunctionSuggestions";
import { scrollToLineIfNeeded } from "./utils/scrollToLineIfNeeded";
import { setMonacEditorError } from "./utils/setMonacEditorError";

export type SQLEditorRef = {
  editor: editor.IStandaloneCodeEditor;
  getSelectedText: () => string;
  getCurrentCodeBlock: () => Promise<CodeBlock> | undefined;
};

type P = {
  value: string;
  onChange: (newValue: string, cursorPosition: any) => any | void;
  debounce?: number;
  onRun?: (code: string, isSelected: boolean) => any | void;
  suggestions?: DashboardState["suggestions"] & {
    onLoaded?: VoidFunction;
  };
  error?: MonacoError;
  getFuncDef?: GetFuncs;
  /**
   * Triggered when user presses ESC
   */
  onStopQuery?: (terminate: boolean) => any;
  sql?: SQLHandler;
  onMount?: (ref: SQLEditorRef) => void;
  onUnmount?: (editor: any, cursorPosition: any) => void | Promise<void>;
  cursorPosition?: any;
  style?: React.CSSProperties;
  className?: string;
  autoFocus?: boolean;
  sqlOptions?: Partial<WindowData["sql_options"]>;
  activeCodeBlockButtonsNode?: React.ReactNode;
  onDidChangeActiveCodeBlock?: (cb: CodeBlock | undefined) => void;
};
type S = {
  value: string;
  editorMounted: boolean;
  themeAge: number;
};

export class SQLEditor extends RTComp<P, S> {
  ref?: HTMLElement;
  editor?: editor.IStandaloneCodeEditor;
  error?: MonacoError;
  value?: string;

  constructor(props) {
    super(props);
    this.state = {
      value: props.value ?? "",
      editorMounted: false,
      themeAge: 0,
    };
  }

  async onMount() {
    const didupdate = await defineCustomSQLTheme();
    if (didupdate) {
      this.setState({ themeAge: Date.now() });
    }
    window.addEventListener(
      "beforeunload",
      async (e) => {
        await this.onUnmount();
      },
      false,
    );
  }

  async onUnmount() {
    await this.props.onUnmount?.(this.editor, this.editor?.getPosition());
    if (this.rootRef) this.resizeObserver?.unobserve(this.rootRef);
  }

  tooltipHandler: any;
  loadedSuggestions: DashboardState["suggestions"];
  loadedFuncs = false;
  resizeObserver?: ResizeObserver;
  onDelta = async (dp, ds) => {
    const {
      error,
      getFuncDef,
      value,
      sql,
      autoFocus = false,
      sqlOptions,
    } = { ...this.props };
    const EOL = this.editor?.getModel()?.getEOL() || "\n";
    const monaco = await getMonaco();
    if (value && this.curVal === undefined) {
      this.curVal = value;
      this.setState({ value });
    }

    if (!this.resizeObserver && this.rootRef) {
      this.resizeObserver = new ResizeObserver((entries) => {
        this.editor?.revealLineInCenterIfOutsideViewport(
          this.editor.getPosition()?.lineNumber ?? value.split(EOL).length,
        );
      });
      this.resizeObserver.observe(this.rootRef);
    }

    const { suggestions } = this.props;

    /* LOAD SUGGESTIONS */
    if (
      this.editor &&
      suggestions &&
      this.loadedSuggestions?.dbKey !== suggestions.dbKey
    ) {
      this.loadedSuggestions = { ...suggestions };
      registerSuggestions({
        ...suggestions,
        sql,
        editor: this.editor,
        monaco,
      });

      /* SET FUNC AUTOCOMPLETE */
      if (getFuncDef && !this.loadedFuncs) {
        registerFunctionSuggestions(
          monaco,
          getFuncDef,
          suggestions.suggestions,
        );
        suggestions.onLoaded?.();
        this.loadedFuncs = true;
        if (autoFocus) {
          this.editor.focus();
        }
      }
    }

    /* SET ERROR */
    if (this.editor && !isEqual(error, this.error)) {
      this.error = error;
      setMonacEditorError(
        this.editor,
        monaco,
        this.getCurrentCodeBlock,
        sqlOptions?.errorMessageDisplay,
        error,
      );
    }
  };

  inDebounce: any;
  curVal?: string;
  onChange = (val: string) => {
    const { onChange, debounce = 300 } = this.props;

    this.curVal = val;
    if (this.inDebounce) window.clearTimeout(this.inDebounce);
    this.inDebounce = setTimeout(() => {
      onChange(val, this.editor?.getPosition());
      this.inDebounce = null;
    }, debounce);
  };

  rootRef?: HTMLDivElement;

  currentDecorations: editor.IEditorDecorationsCollection | undefined;

  get canExecuteBlocks() {
    const { executeOptions } = this.props.sqlOptions ?? {};
    return executeOptions !== "full";
  }
  getCurrentCodeBlock = () => {
    const { executeOptions } = this.props.sqlOptions ?? {};
    if (executeOptions !== "full") {
      const model = this.editor?.getModel();
      const position = this.editor?.getPosition();
      if (model && !model.isDisposed() && position) {
        return getCurrentCodeBlock(model, position, undefined, {
          smallestBlock: executeOptions === "smallest-block",
        });
      }

      return undefined;
    }
  };

  onRun = async () => {
    if (!this.props.onRun) return;
    const selection = getSelectedText(this.editor);
    const codeBlock = await this.getCurrentCodeBlock();
    const text = selection || codeBlock?.text;
    if (text) {
      this.props.onRun(text, true);
    } else {
      this.props.onRun(this.editor?.getValue() ?? "", false);
    }
  };

  codeBlockSignature?: CodeBlockSignature;
  currentCodeBlock: CodeBlock | undefined;

  get editorOptions() {
    const { sqlOptions } = this.props;

    const { canExecuteBlocks } = this;
    return {
      fixedOverflowWidgets: true,
      folding: true,
      automaticLayout: true,
      padding: {
        top: 12,
      },
      parameterHints: {
        enabled: !window.isMobileDevice,
      },
      quickSuggestions: {
        strings: true,
      },
      ...omitKeys(sqlOptions ?? {}, [
        "maxCharsPerCell",
        "renderMode",
        "executeOptions",
        "errorMessageDisplay",
      ]),

      ...(canExecuteBlocks && {
        /** Needed for play button */
        glyphMargin: true,
        lineNumbersMinChars: 3,
      }),
    };
  }

  onMonacoEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    const { onMount, sqlOptions } = this.props;
    addSqlEditorFunctions(
      editor,
      sqlOptions?.executeOptions === "smallest-block",
    );

    this.setState({ editorMounted: true });
    if (onMount) {
      onMount({
        editor,
        getSelectedText: () => getSelectedText(editor),
        getCurrentCodeBlock: this.getCurrentCodeBlock,
      });
    }
    this.editor = editor;
    setActions(editor, this);
    editor.onDidChangeModelContent((e) => {
      this.onChange(editor.getValue());
      setActiveCodeBlock.bind(this)(undefined);
    });
    editor.onDidChangeCursorPosition(async (e) => {
      setActiveCodeBlock.bind(this)(e);
    });

    const { cursorPosition } = this.props;
    if (cursorPosition && !isEmpty(cursorPosition)) {
      this.editor.setPosition(cursorPosition);

      setTimeout(() => {
        if (!this.mounted || !this.editor) return;
        scrollToLineIfNeeded(this.editor, cursorPosition.lineNumber || 1);
      }, SECOND / 2);
    }
  };

  render() {
    const { value = "" } = this.state;
    const {
      style = {},
      className = "",
      sqlOptions,
      activeCodeBlockButtonsNode,
    } = this.props;

    const { canExecuteBlocks } = this;
    const glyphPlayBtnElem = document.querySelector(
      `.${playButtonglyphMarginClassName}`,
    );
    if (glyphPlayBtnElem && glyphPlayBtnElem.children.length > 1) {
      glyphPlayBtnElem.children[1]?.remove();
      console.warn("Removed extra play button");
    }
    const glyphPlayBtn =
      canExecuteBlocks && glyphPlayBtnElem ?
        ReactDOM.createPortal(
          <FlexCol
            className="GlyphButtons gap-0 mt-auto"
            style={{
              /** Ensures we can click add chart btn */
              zIndex: 2,
            }}
          >
            <Btn
              iconPath={mdiPlay}
              size="micro"
              onClick={this.onRun}
              color="action"
              title={`Run this statement**\n\nOnly this section of the script will be executed unless text is selected. This behaviour can be changed in options\n\nExecute hot keys: ctrl+e, alt+e`}
            />
            {activeCodeBlockButtonsNode}
          </FlexCol>,
          glyphPlayBtnElem,
        )
      : null;

    return (
      <div
        className={
          "sqleditor f-1 min-h-0 min-w-0 flex-col relative " + className
        }
        ref={(e) => {
          if (e) this.rootRef = e;
        }}
        style={{
          ...style,
          /** Needed to ensure add timechart chart select btn outline is visible */
          paddingLeft: canExecuteBlocks ? "4px" : undefined,
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          let text = e.dataTransfer.getData("text");
          if (text) {
            text = ` ${text} `;
            this.editor?.trigger("keyboard", "type", { text });
          } else {
            const [file, ...otherFiles] = getDataTransferFiles(e);
            if (otherFiles.length) {
              alert("Only one file can be dropped at a time");
            } else if (file?.type.includes("text")) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const text = event.target?.result;
                if (!text || !this.editor || !this.mounted) return;
                this.editor.setValue(text as string);
              };
              reader.readAsText(file);
            }
          }
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
      >
        {glyphPlayBtn}
        <MonacoEditor
          className="f-1 min-h-0"
          language={LANG}
          value={value}
          loadedSuggestions={this.props.suggestions}
          /** This is used to show documentation (expandSuggestionDocs) */
          expandSuggestionDocs={sqlOptions?.expandSuggestionDocs}
          options={this.editorOptions}
          onMount={this.onMonacoEditorMount}
        />
      </div>
    );
  }
}

const setActiveCodeBlock = async function (
  this: SQLEditor,
  e: editor.ICursorPositionChangedEvent | undefined,
) {
  const editor = this.editor;
  if (!editor) return;

  /** Codeblock end line changes when going from empty line to content */
  const model = editor.getModel();
  const value = model?.getValue() ?? "";

  const EOL = model?.getEOL() ?? "\n";
  const codeBlockSignature: CodeBlockSignature = {
    numberOfLineBreaks: value.split(EOL).length,
    numberOfSemicolons: value.split(";").length,
    currentLineNumber:
      e?.position.lineNumber ??
      editor.getPosition()?.lineNumber ??
      this.codeBlockSignature?.currentLineNumber ??
      1,
  };

  /** When just moving the cursor, trigger only if cursor exited currentCodeBlock
   * Only if currentCodeBlock doesn't have gaps or semicolons
   */
  if (
    e &&
    this.currentCodeBlock &&
    !this.currentCodeBlock.text.split(EOL).filter((v) => !v.trim()).length &&
    !this.currentCodeBlock.text.trim().slice(0, -1).includes(";")
  ) {
    const { startLine, endLine, text } = this.currentCodeBlock;
    const codeBlockTextDidNotChange = value
      .slice(this.currentCodeBlock.blockStartOffset)
      .startsWith(text);
    if (
      codeBlockTextDidNotChange &&
      e.position.lineNumber >= startLine &&
      e.position.lineNumber <= endLine
    ) {
      return;
    }
  }

  const signatureDiffers = !isEqual(
    this.codeBlockSignature,
    codeBlockSignature,
  );
  const noSelection = !document.getSelection()?.toString();
  if (signatureDiffers && noSelection) {
    this.codeBlockSignature = codeBlockSignature;
    const codeBlock = await this.getCurrentCodeBlock();
    this.currentCodeBlock = codeBlock;
    this.props.onDidChangeActiveCodeBlock?.(this.currentCodeBlock);

    // removePlayDecoration({ editor, EOL, value });

    this.currentDecorations?.clear();
    this.currentDecorations = await highlightCurrentCodeBlock(
      editor,
      codeBlock,
    );
  }
};

type Args = {
  editor: editor.IStandaloneCodeEditor;
  value: string;
  EOL: string;
};

/**
 * If used incorrectly it breaks code snippet tab to next param.
 */
const removePlayDecoration = ({ editor, value, EOL }: Args) => {
  const existingDecorations = value.split(EOL).flatMap((_, idx) => {
    const decorations = editor.getLineDecorations(idx);
    return (
      decorations
        ?.filter((decor) => {
          return (
            decor.options.glyphMarginClassName === "active-code-block-play"
          );
        })
        .map((d) => d.id) ?? []
    );
  });
  console.log(existingDecorations);
  editor.removeDecorations(existingDecorations);
};

const setActions = async (
  editor: editor.IStandaloneCodeEditor,
  comp: SQLEditor,
) => {
  const monaco = await getMonaco();

  /** Use actions instead of commands due to this bug:
   * https://github.com/microsoft/monaco-editor/issues/2947
   */
  editor.addAction({
    id: "run-sql",
    label: "Execute SQL",
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      monaco.KeyMod.Alt | monaco.KeyCode.KeyE,
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE,
      monaco.KeyCode.F5,
    ],
    run: comp.onRun,
  });
  editor.addAction({
    id: "cancel-running-sql",
    label: "Cancel running query",
    keybindings: [monaco.KeyCode.Escape],
    run: () => {
      editor.trigger("demo", "hideSuggestWidget", {});
      editor.trigger("demo", "closeParameterHints", {});
      /**
       * Array.from(this._commands).filter(([k]) => k.toLowerCase().includes("hint") && console.log(k))
       */
      comp.props.onStopQuery?.(false);
    },
  });

  /** Enter newline only when not accepting a suggestion */
  // this.editor?.addCommand(monaco.KeyCode.Enter, () => {
  //   this.editor?.trigger('newline', 'type', { text: EOL });
  // }, '!suggestWidgetVisible && !renameInputVisible && !inSnippetMode && !quickFixWidgetVisible');
};
