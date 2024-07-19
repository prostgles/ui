
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
  const monaco = import(/* webpackChunkName: "monaco_editorr" */  /*  webpackPrefetch: false */  "monaco-editor/esm/vs/editor/editor.api.js");
  return monaco;
};

export const SUGGESTION_TYPES = [
  "table", "view", "mview", "column", "function", "dataType", "extension", "keyword", 
  "schema", "setting", "role", "database", "folder", "file", "snippet", 
  "policy", "publication", "subscription", "index", "operator", "constraint", "trigger", "eventTrigger", "rule", "user"
] as const;

export const SUGGESTION_TYPE_DOCS: Record<typeof SUGGESTION_TYPES[number], string> = {
  column: "A set of data values of a particular type. Is part of a table or a view",
  constraint: "A way to limit the kind of data that can be stored in a table",
  table: `A table is a collection of related data held in a table format within a database`,
  view: `A view is similar to a table but it can also show data from multiple tables`,
  database: `A place to store all data`,
  dataType: "A set of possible values and a set of allowed operations on it",
  extension: "A script that creates new SQL objects such as functions, data types, operators and index support methods",
  file: "",
  folder: "",
  function: "A set of SQL and procedural commands such as declarations, assignments, loops, flow-of-control etc. stored on the database server and can be involved using the SQL interface. ",
  index: "An index is a pointer to data in a table. A common way to enhance database performance.",
  keyword: "SQL command",
  mview: "Materialized view. Similar to views with the exception that the underlying data is saved",
  operator: "Used in comparing values",
  policy: "A row-level security policy for a table",
  publication: "A publication is a set of changes generated from a table or a group of tables, and might also be described as a change set or replication set. Each publication exists in only one database. Publications are different from schemas and do not affect how the table is accessed.",
  role: "PostgreSQL manages database access permissions using the concept of roles. A role can be thought of as either a database user, or a group of database users, depending on how the role is set up. Roles can own database objects (for example, tables) and can assign privileges on those objects to other roles to control who has access to which objects. Furthermore, it is possible to grant membership in a role to another role, thus allowing the member role use of privileges assigned to the role it is a member of.",
  user: "A user is a role with LOGIN permission",
  schema: "A database contains one or more named schemas, which in turn contain tables. Schemas also contain other kinds of named objects, including data types, functions, and operators. ",
  setting: "Server configuration parameters. Can be specified for SYSTEM, DATABASE or ROLE",
  snippet: "A prostgles snippet",
  rule: "An alternative action to be performed on insertions, updates, or deletions in database tables",
  subscription: "A subscription represents a replication connection to the publisher. Hence, in addition to adding definitions in the local catalogs, this command normally creates a replication slot on the publisher.",
  trigger: "A trigger is a function invoked automatically whenever an event associated with a table occurs. An event could be any of the following: INSERT, UPDATE, DELETE or TRUNCATE.",
  eventTrigger: "An event trigger is a function invoked automatically whenever the designated event occurs and the WHEN condition associated with the trigger, if any, is satisfied, the trigger function will be executed",
}

export const DB_OBJ_LABELS: Record<keyof typeof SUGGESTION_TYPES, string> = SUGGESTION_TYPES.reduce((a, v) => ({
  ...a,
  [v]: v === "mview"? "materialized view" : v
}), {} as Record<keyof typeof SUGGESTION_TYPES, string>)

type CodeBlockSignature = {
  numberOfLineBreaks: number;
  numberOfSemicolons: number;
  currentLineNumber: number;
};

export type SQLSuggestion = {
  type: typeof SUGGESTION_TYPES[number];
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
  }

  tablesInfo?: PG_Table;
  relkind?: string;
  view?: {
    definition: string;
  }

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
}

export const customLightThemeMonaco = "myCustomTheme";


export type MonacoError = Pick<editor.IMarkerData, "code" | "message" | "severity" | "relatedInformation"> &  {
  position?: number;
  length?: number;
} 

import { mdiPlay } from "@mdi/js";
import { isEqual } from "prostgles-client/dist/react-hooks";
import type { SQLHandler } from "prostgles-types";
import Btn from "../../components/Btn";
import { getDataTransferFiles } from "../../components/FileInput/DropZone";
import { isEmpty, omitKeys } from "../../utils";
import { SECOND } from "../Charts";
import type { DashboardState } from "../Dashboard/Dashboard";
import type { WindowData } from "../Dashboard/dashboardUtils";
import RTComp from "../RTComp";
import { MonacoEditor } from "../W_SQL/MonacoEditor";
import type { IRange, editor } from "../W_SQL/monacoEditorTypes";
import type { TopKeyword } from "./SQLCompletion/KEYWORDS";
import type { CodeBlock } from "./SQLCompletion/completionUtils/getCodeBlock";
import { getCurrentCodeBlock, highlightCurrentCodeBlock, playButtonglyphMarginClassName } from "./SQLCompletion/completionUtils/getCodeBlock";
import type { PGConstraint, PGOperator, PG_DataType, PG_EventTrigger, PG_Function, PG_Policy, PG_Role, PG_Rule, PG_Setting, PG_Table, PG_Trigger } from "./SQLCompletion/getPGObjects";
import { addSqlEditorFunctions, getSelectedText } from "./addSqlEditorFunctions";
import { defineCustomSQLTheme } from "./defineCustomSQLTheme";
import type { GetFuncs } from "./registerFunctionSuggestions";
import { registerFunctionSuggestions } from "./registerFunctionSuggestions";

export type SQLEditorRef = {
  editor: editor.IStandaloneCodeEditor;
  getSelectedText: () => string;
  getCurrentCodeBlock: () => Promise<CodeBlock>  | undefined;
} 

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
};
type S = {
  value: string;
  editorMounted: boolean;
  themeAge: number;
  activeCodeBlock: undefined | Pick<CodeBlock, "startLine" | "endLine">;
};

export default class SQLEditor extends RTComp<P, S> {

  ref?: HTMLElement;
  editor?: editor.IStandaloneCodeEditor;
  error?: MonacoError;
  value?: string;

  constructor(props){
    super(props);
    this.state = {
      value: props.value ?? "",
      editorMounted: false,
      themeAge: 0,
      activeCodeBlock: undefined,
    }
  }
  
  async onMount(){
    document.addEventListener("keydown", this.onKeyDown, false);
    const didupdate = await defineCustomSQLTheme();
    if(didupdate){
      this.setState({ themeAge: Date.now() })
    }
    window.addEventListener("beforeunload", async (e) => {
      await this.onUnmount()
    }, false); 
  }
  
  async onUnmount(){
    document.removeEventListener("keydown", this.onKeyDown, false);
    await this.props.onUnmount?.(this.editor, this.editor?.getPosition());
    if(this.rootRef) this.resizeObserver?.unobserve(this.rootRef);
  } 

  scrollToLineIfNeeded = (lineNumber: number) => {
    if(!this.editor) return;

    const [vL1] = this.editor.getVisibleRanges()
    if(vL1 && !((vL1.startLineNumber - 1) <= lineNumber && (vL1.endLineNumber + 1) >= lineNumber)){
      this.editor.revealLineInCenterIfOutsideViewport(lineNumber);
    }
  }

  tooltipHandler: any;
  loadedSuggestions: DashboardState["suggestions"];
  loadedFuncs = false;
  resizeObserver?: ResizeObserver;
  onDelta = async (dp, ds) => {
    const { error, getFuncDef, value, sql, autoFocus = false, sqlOptions } = { ...this.props }; 
    const EOL = this.editor?.getModel()?.getEOL() || "\n";
    const monaco = await getMonaco();
    if(value && this.curVal === undefined){
      this.curVal = value;
      this.setState({ value })
    }

    if(!this.resizeObserver && this.rootRef){
      this.resizeObserver = new ResizeObserver(entries => {
        this.editor?.revealLineInCenterIfOutsideViewport(this.editor.getPosition()?.lineNumber ?? value.split(EOL).length);
      });
      this.resizeObserver.observe(this.rootRef);
    }

      /** Enter newline only when not accepting a suggestion */
      // this.editor?.addCommand(monaco.KeyCode.Enter, () => {
      //   this.editor?.trigger('newline', 'type', { text: EOL });
      // }, '!suggestWidgetVisible && !renameInputVisible && !inSnippetMode && !quickFixWidgetVisible');

    const { suggestions } = this.props;

    /* LOAD SUGGESTIONS */
    if(this.editor && suggestions && this.loadedSuggestions?.dbKey !== suggestions.dbKey){
      this.loadedSuggestions = { ...suggestions }
      registerSuggestions({ 
        ...suggestions, 
        sql, 
        editor: this.editor, 
        monaco,
      });

      /* SET FUNC AUTOCOMPLETE */
      if(getFuncDef && !this.loadedFuncs){
        registerFunctionSuggestions(monaco, getFuncDef, suggestions.suggestions);
        suggestions.onLoaded?.();
        this.loadedFuncs = true;
        if(autoFocus){
          this.editor.focus();
        }
      }
    }

    /* SET ERROR */
    if(this.editor && JSON.stringify(this.error || {}) !== JSON.stringify(error || {})){
      this.error = error;
      const model = this.editor.getModel();
      if(!model) return;
      if(!error) monaco.editor.setModelMarkers(model, "test", []);
      else {

        let offset: Partial<IRange> = {};
        if(typeof error.position === "number"){
          let pos = (error.position - 1) || 0;
          let len = error.length || 10;
          let selectionStartIndex = 0;
          let codeLength = model.getValue().length;
          let selectionLength = 0;
          const sel = this.editor.getSelection();
          if(sel){
            const selection = this.editor.getModel()?.getValueInRange(sel);
            // let selectionOffset = 0;
            if(selection){
              selectionStartIndex = model.getOffsetAt({ 
                column: sel.startColumn,
                lineNumber: sel.startLineNumber
              });
              selectionLength = selection.length;
            }
          } 
          
          if(!selectionLength) {
            const codeBlock = await this.getCurrentCodeBlock();
            if(codeBlock){
              selectionStartIndex = model.getOffsetAt({ 
                column: 1,
                lineNumber: codeBlock.startLine
              });
              selectionLength = codeBlock.text.length
            }
          }

          if(selectionLength){
            codeLength = selectionLength;
            pos += selectionStartIndex;
          }
          /** Ensure error does not extend beyond active code */
          len = Math.max(1, Math.min(len, selectionStartIndex + codeLength - pos));


          const s = model.getPositionAt(pos);
          const e = model.getPositionAt(pos + len);
          offset = {
            startLineNumber: s.lineNumber,
            startColumn: s.column,
            endLineNumber: e.lineNumber,
            endColumn: e.column,
          }
          /** Do not reposition cursor on error */
          // this.editor.setPosition(s);
          this.scrollToLineIfNeeded(s.lineNumber)
        }

        if(sqlOptions?.errorMessageDisplay !== "bottom"){
          const messageContribution = this.editor.getContribution("editor.contrib.messageController");
          (messageContribution as any).showMessage(error.message, { 
            ...this.editor.getPosition(),
            lineNumber: offset.startLineNumber,
            column: offset.endColumn,
          });
        }
        
        monaco.editor.setModelMarkers(model, "test", [{
          startLineNumber: 0,
          startColumn: 0,
          endLineNumber: 0,
          endColumn: 5,
          code: "error.code",
          ...error,
          ...offset
        }]);

      }
    }
  }

  onKeyDown = e => {
    const { onStopQuery } = this.props;
    
    const CTRL_E =  e.altKey && e.key.toLowerCase() === "e"; 
    const CTRL_Enter = e.ctrlKey && e.key === "Enter"; // Does not work
    if(e.key === "Escape" && onStopQuery){
      e.preventDefault();
      onStopQuery(false);
    } else if(
      (e.key === "F5" || CTRL_E || CTRL_Enter) && 
      this.editor?.getDomNode()?.contains(e.target)
    ){
      e.preventDefault();
      this.onRun()
    }
  }

  inDebounce: any;
  curVal?: string;
  onChange = (val: string) => {
    const { value = "", onChange, debounce = 300 } = this.props;

    this.curVal = val;
    if(this.inDebounce) window.clearTimeout(this.inDebounce);
    this.inDebounce = setTimeout(() => {
      onChange(val, this.editor?.getPosition());
      this.inDebounce = null;
    }, debounce);
  }

  rootRef?: HTMLDivElement;

  currentDecorations: editor.IEditorDecorationsCollection | undefined;

  get canExecuteBlocks(){
    const { executeOptions } = this.props.sqlOptions ?? {};
    return executeOptions !== "full";
  }
  getCurrentCodeBlock = () => {
    const { executeOptions } = this.props.sqlOptions ?? {};
    if(executeOptions !== "full"){
      const model = this.editor?.getModel()
      const position = this.editor?.getPosition()
      if(model && !model.isDisposed() && position){
        return getCurrentCodeBlock(model, position, undefined, { smallestBlock: executeOptions === "smallest-block" })
      }

      return undefined
    }
  }

  onRun = async () => {
    if(!this.props.onRun) return;
    const selection = getSelectedText(this.editor);
    const codeBlock = await this.getCurrentCodeBlock();
    const text = selection || codeBlock?.text;
    if(text){
      this.props.onRun(text, true);
    } else {
      this.props.onRun(this.editor?.getValue() ?? "", false);
    }

  }

  codeBlockSignature?: CodeBlockSignature;
  currentCodeBlock: CodeBlock | undefined

  render(){
    const { value = "", themeAge } = this.state;
    const { onMount, style = {}, className = "", sqlOptions } = this.props;
    const key = JSON.stringify(sqlOptions) + themeAge;

    const glyphPlayBtnElem = document.querySelector(`.${playButtonglyphMarginClassName}`);
    const glyphPlayBtn = (this.canExecuteBlocks && glyphPlayBtnElem)? ReactDOM.createPortal(
      <Btn 
        iconPath={mdiPlay} 
        size="micro" 
        onClick={this.onRun}
        color="action" 
      />,
      glyphPlayBtnElem
    ) : null;

    return <div key={key}
      className={"sqleditor f-1 min-h-0 min-w-0 flex-col relative " + className}
      ref={e => {
        if(e) this.rootRef = e;
      }}
      style={style}
      onDragOver={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={e => {
        let text = e.dataTransfer.getData("text");
        if(text){
          text = ` ${text} `
          this.editor?.trigger("keyboard", "type", {text});
        } else {
          const [file, ...otherFiles] = getDataTransferFiles(e);
          if(otherFiles.length){
            alert("Only one file can be dropped at a time");
          } else if(file?.type.includes("text")) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const text = event.target?.result;
              if(!text || !this.editor || !this.mounted) return;
              this.editor.setValue(text as string);
            };
            reader.readAsText(file);
          }
        }
        e.preventDefault() ;
        e.stopPropagation() ;
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
        options={{
          fixedOverflowWidgets: true,
          folding: true,
          automaticLayout: true,
          padding: {
            top: 12,
          },
          parameterHints: { 
            enabled: !window.isMobileDevice 
          } ,
          quickSuggestions: {
            strings: true,
          },
          ...(!sqlOptions? {} : omitKeys(sqlOptions, ["maxCharsPerCell", "renderMode", "executeOptions", "errorMessageDisplay"])),

          ...(this.canExecuteBlocks && {
            /** Needed for play button */
            glyphMargin: true,
            lineNumbersMinChars: 3,
          })
        }} 
        onMount={(editor) => {
          addSqlEditorFunctions(editor, sqlOptions?.executeOptions === "smallest-block")
          this.setState({ editorMounted: true });
          if(onMount) {
            onMount({ 
              editor,
              getSelectedText: () => getSelectedText(editor),
              getCurrentCodeBlock: this.getCurrentCodeBlock
            });
          }
          this.editor = editor;
          editor.onDidChangeModelContent(e => {
            this.onChange(editor.getValue());
            setActiveCodeBlock.bind(this)(undefined);
          });
          editor.onDidChangeCursorPosition(async e => {
            if(e.source === "api") return;
            setActiveCodeBlock.bind(this)(e);
          });
          
          editor.onDidChangeModelDecorations(() => {
            if(this.canExecuteBlocks && this.codeBlockSignature){
              // setTimeout(() => {
                if(!this.mounted) return;
                this.setState({ activeCodeBlock: { startLine: 1, endLine: 2 } })
              // }, 100)
            }
          });

          const { cursorPosition } = this.props;
          if(cursorPosition && !isEmpty(cursorPosition)){
            this.editor.setPosition(cursorPosition);

            setTimeout(() => {
              if(!this.mounted || !this.editor) return;
              this.scrollToLineIfNeeded(cursorPosition.lineNumber || 1);

            }, SECOND/2);
          }
          
      }}/>
    </div>
  }
}

const setActiveCodeBlock = async function (this: SQLEditor, e: editor.ICursorPositionChangedEvent | undefined) {
  const editor = this.editor;
  if(!editor) return;

  /** Codeblock end line changes when going from empty line to content */
  const model = editor.getModel();
  const value = model?.getValue() ?? "";
  const codeBlockSignature: CodeBlockSignature = {
    numberOfLineBreaks: value.split(model?.getEOL() ?? "\n").length,
    numberOfSemicolons: value.split(";").length,
    currentLineNumber: e?.position.lineNumber ?? editor.getPosition()?.lineNumber ?? this.codeBlockSignature?.currentLineNumber ?? 0,
  };
  const signatureDiffers = !isEqual(this.codeBlockSignature, codeBlockSignature);
  if(signatureDiffers && !document.getSelection()?.toString()){
    this.codeBlockSignature = codeBlockSignature;
    const codeBlock = await this.getCurrentCodeBlock();
    this.currentCodeBlock = codeBlock;

    const existingDecorations = editor.getLineDecorations(0)?.map(d => d.id) ?? [];
    editor.removeDecorations(existingDecorations);
    this.currentDecorations?.clear();

    this.currentDecorations = await highlightCurrentCodeBlock(editor, codeBlock);
  }
}
