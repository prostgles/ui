
import * as monaco from 'monaco-editor';
import React from "react";
import "./SQLEditor.css";
 
import { MonacoSuggestion, registerSuggestions } from "./SQLCompletion/registerSuggestions";
 

export const LANG = 'sql'

export const SUGGESTION_TYPES = [
  "table", "view", "mview", "column", "function", "dataType", "extension", "keyword", 
  "schema", "setting", "role", "database", "folder", "file", "snippet", 
  "policy", "publication", "subscription", "index", "operator", "constraint", "trigger", "eventTrigger", "rule"
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

export const MONACO_DEFAULT_STORAGE_SERVICE: editor.IEditorOverrideServices = {
  get() {},
  remove(key, val) {
    // console.log(key, val)
  }, 
  getBoolean(key) {
    if (key === "expandSuggestionDocs"){
      return true;
    }

    return false;
  },
  store() {},
  onWillSaveState() {},
  onDidChangeStorage() {},
  onDidChangeValue() {},

}
const getStorageService = (opts?: Partial<WindowData["sql_options"]>) => ({ 
  ...MONACO_DEFAULT_STORAGE_SERVICE,
  getBoolean(key) {
    if (key === "expandSuggestionDocs" && opts?.expandSuggestionDocs !== false){
      return true;
    }

    return false;
  }, 
});

export const customLightThemeMonaco = 'myCustomTheme';

monaco.editor.defineTheme(customLightThemeMonaco, {
  base: 'vs', // can also be vs-dark or hc-black or vs
  inherit: true, // can also be false to completely replace the builtin rules
  colors: {
    
  },
  rules: [
    
    // { token: 'predefined.sql', foreground: '#730000'},
    { token: `string.${LANG}`, foreground: '#930000'}, // #e200e2
    

    /* Table names */
    { token: 'identifier', foreground: '#6c06ab'},
    { token: 'complexIdentifiers', foreground: '#6c06ab' },
    
    // { token: 'function', foreground: '94763a', fontStyle: 'bold'  },
    // { token: 'keyword', foreground: '#696969' },
  ]
});

export type MonacoError = Pick<editor.IMarkerData, "code" | "message" | "severity" | "relatedInformation"> &  {
  position?: number;
  length?: number;
} 

import { IRange, editor } from "monaco-editor";
import { SQLHandler } from "prostgles-types";
import { themeR } from "../../App";
import { isEmpty, omitKeys } from "../../utils";
import { SECOND } from "../Charts";
import { DashboardState } from "../Dashboard/Dashboard";
import { WindowData } from "../Dashboard/dashboardUtils";
import { MonacoEditor } from "../ProstglesSQL/MonacoEditor";
import RTComp from "../RTComp";
import { TopKeyword } from "./SQLCompletion/KEYWORDS";
import { CodeBlock, getCurrentCodeBlock, highlightCurrentCodeBlock } from "./SQLCompletion/completionUtils/getCodeBlock";
import { PGConstraint, PGOperator, PG_DataType, PG_EventTrigger, PG_Function, PG_Policy, PG_Role, PG_Rule, PG_Setting, PG_Table, PG_Trigger } from "./SQLCompletion/getPGObjects";
import { GetFuncs, registerFunctionSuggestions } from "./registerFunctionSuggestions";

export type SQLEditorRef = {
  editor: editor.IStandaloneCodeEditor;
  getSelectedText: () => string;
  getCurrentCodeBlock: () => CodeBlock | undefined;
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
};

const getSelectedText = (editor): string => editor.getModel().getValueInRange(editor.getSelection());

export default class SQLEditor extends RTComp<P, S> {

  ref?: HTMLElement;
  editor?: editor.IStandaloneCodeEditor;
  error?: MonacoError;
  value?: string;

  constructor(props){
    super(props);
    this.state = {
      value: props.value ?? "",
      editorMounted: false
    }
  }
  
  onMount(){
    document.addEventListener("keydown", this.onKeyDown, false);
    window.addEventListener("beforeunload", async (e) => {
      await this.onUnmount()
    }, false); 
  }
  
  async onUnmount(){
    document.removeEventListener("keydown", this.onKeyDown, false);
    await this.props.onUnmount?.(this.editor, this.editor?.getPosition());
    if(this.rootRef) this.resizeObserver?.unobserve(this.rootRef)
  } 

  scrollToLineIfNeeded = (lineNumber: number) => {
    if(!this.editor) return;

    const [vL1] = this.editor.getVisibleRanges()
    if(vL1 && !((vL1.startLineNumber - 1) <= lineNumber && (vL1.endLineNumber + 1) >= lineNumber)){
      this.editor.revealLineInCenterIfOutsideViewport(lineNumber);
    }
  }

  tooltipHandler: any;
  loadedActions = false;
  loadedSuggestions: DashboardState["suggestions"];
  loadedFuncs = false;
  resizeObserver?: ResizeObserver;
  onDelta = async (dp, ds) => {
    const { error, getFuncDef, value, sql, autoFocus = false, sqlOptions } = { ...this.props }; 

    if(value && !this.curVal){
      this.curVal = value;
      this.setState({ value })
    }


    if(!this.resizeObserver && this.rootRef){
      this.resizeObserver = new ResizeObserver(entries => {
        this.editor?.revealLineInCenterIfOutsideViewport(this.editor.getPosition()?.lineNumber ?? value.split("/n").length);
      });
      this.resizeObserver.observe(this.rootRef);

    }

    if(this.editor && !this.loadedActions){
      this.loadedActions = true;

      this.editor.addAction({
        id: "select1", 
        label: "Select word", 
        contextMenuGroupId: "selection", 
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD],
        run: (editor) => {
          const model = editor.getModel();
          const position = editor.getPosition();

          if(!model || !position) return;

          const word = model.getWordAtPosition(position);
          if(word){
            editor.setSelection({ 
              startColumn: word.startColumn, 
              startLineNumber: position.lineNumber, 
              endLineNumber: position.lineNumber, 
              endColumn: word.endColumn 
            });
          }
        }
      });

      this.editor.addAction({
        id: "select2CB",
        label: "Select code block", 
        contextMenuGroupId: "selection",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
        run: (editor) => {
          const model = editor.getModel();
          const position = editor.getPosition();

          if(!model || !position) return;

          const cb = getCurrentCodeBlock(model, position);
          if(cb.textLC.trim()){
            editor.setSelection({ 
              startColumn: 1, 
              startLineNumber: cb.startLine, 
              endLineNumber: cb.endLine, 
              endColumn: cb.tokens.at(-1)!.end + 2, 
            });
          } 
        }
      });
      

      this.editor.addAction({
        id: "googleSearch",
        label: "Search with Google",
        // keybindings: [m.KeyMod.CtrlCmd | m.KeyCode.KEY_V],
        contextMenuGroupId: "navigation",
        run: (editor) => {
          window.open("https://www.google.com/search?q=" + getSelectedText(editor))
        }
      });
      this.editor.addAction({
        id: "googleSearchPG",
        label: "Search with Google Postgres",
        // keybindings: [m.KeyMod.CtrlCmd | m.KeyCode.KEY_V],
        contextMenuGroupId: "navigation",
        run: (editor) => {
          window.open("https://www.google.com/search?q=postgres+" + getSelectedText(editor))
        }
      });
    }

    const { suggestions } = this.props;

    /* LOAD SUGGESTIONS */
    if(this.editor && suggestions && this.loadedSuggestions?.dbKey !== suggestions.dbKey){
      this.loadedSuggestions = { ...suggestions }
      registerSuggestions({ ...suggestions, sql, editor: this.editor });

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
      if(!error) monaco.editor.setModelMarkers(model, 'test', []);
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
            const codeBlock = this.getCurrentCodeBlock();
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
          const messageContribution = this.editor.getContribution('editor.contrib.messageController');
          (messageContribution as any).showMessage(error.message, { 
            ...this.editor.getPosition(),
            lineNumber: offset.startLineNumber,
            column: offset.endColumn,
          });
        }
        
        monaco.editor.setModelMarkers(model, 'test', [{
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
    } else if(e.ctrlKey && e.key === "b"){
      // const codeBlock = this.getCurrentCodeBlock();
      // if(codeBlock && this.editor){
      //   this.editor.setSelection({
      //     startLineNumber: codeBlock.startLine,
      //     startColumn: 0,
      //     endColumn: (codeBlock.lines.at(-1)?.v.length || 122) + 1,
      //     endLineNumber: codeBlock.endLine
      //   })
      // }
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

  getCurrentCodeBlock = () => {
    const { executeOptions } = this.props.sqlOptions ?? {};
    if(executeOptions !== "full"){
      const model = this.editor?.getModel()
      const position = this.editor?.getPosition()
      if(model && position){
        return getCurrentCodeBlock(model, position, undefined, executeOptions === "smallest-block")
      }

      return undefined
    }
  }

  onRun = () => {
    if(!this.props.onRun) return;
    const selection = getSelectedText(this.editor);
    const codeBlock = this.getCurrentCodeBlock();
    const text = selection || codeBlock?.text;
    if(text){
      this.props.onRun(text, true);
    } else {
      this.props.onRun(this.editor?.getValue() ?? "", false);
    }

  }

  currentLineNumber?: number;
  
  render(){
    const { value = "" } = this.state;
    const { onMount, style = {}, className = "", sqlOptions } = this.props;
    const theme = sqlOptions?.theme && sqlOptions.theme !== "vs"?  sqlOptions.theme : (themeR.get() === "dark"? "vs-dark" : customLightThemeMonaco as any);
    const key = theme + JSON.stringify(sqlOptions);
    return <div key={key}
      className={"sqleditor f-1 min-h-0 min-w-0 flex-col relative " + className}
      ref={e => {
        if(e) this.rootRef = e;
      }}
      style={style}
      onDragOver={e => {
        e.preventDefault() ;
        return false;
      }}
      // onDragEnter={e => {
      //   // e.preventDefault() ;
      //   return false;
      // }}
      onDrop={e => {
        let text = e.dataTransfer.getData("text");
        if(text){
          text = ` ${text} `
          this.editor?.trigger('keyboard', 'type', {text});
        }
      }}
    >
      <MonacoEditor 
        className="f-1 min-h-0"
        language={LANG}
        value={value} 
        /** This is used to show documentation (expandSuggestionDocs) */
        overrideServices={getStorageService(sqlOptions)}
        options={{
          acceptSuggestionOnEnter: "off",
          fixedOverflowWidgets: true,
          theme,
          folding: true,
          // glyphMargin: true,
          automaticLayout: true,
          // ...stS,
          padding: {
            top: 12
          },
          parameterHints: { enabled: !window.isMobileDevice } ,
          
          ...(!sqlOptions? {} : omitKeys(sqlOptions, ["maxCharsPerCell", "renderMode", "executeOptions", "errorMessageDisplay"])),
        }} 
        onMount={(editor) => {
          
          this.setState({ editorMounted: true });
          if(onMount) {
            onMount({ 
              editor,
              getSelectedText: () => getSelectedText(editor),
              getCurrentCodeBlock: this.getCurrentCodeBlock
            });
          }
          this.editor = editor;
          editor.onDidChangeModelContent(ev => {
            this.onChange(editor.getValue());
          });
          editor.onDidChangeCursorPosition(async e => {
            if(this.editor && this.currentLineNumber !== e.position.lineNumber && !document.getSelection()?.toString()){
              this.currentLineNumber = e.position.lineNumber;
              const codeBlock = this.getCurrentCodeBlock();
              this.currentDecorations?.clear();
              this.currentDecorations = highlightCurrentCodeBlock(this.editor, codeBlock);
            }
          })

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