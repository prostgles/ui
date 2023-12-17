
import { editor, IDisposable,  languages } from "monaco-editor";
import { SQLHandler } from "prostgles-types"; 
import { CodeBlock, getCurrentCodeBlock } from "./completionUtils/getCodeBlock";
import { LANG, SQLSuggestion } from "../SQLEditor";
import { getKeywordDocumentation } from "../SQLEditorSuggestions";
import { getMatch } from "./getMatch"; 
import * as monaco from 'monaco-editor'; 

/**
 * Mobile devices can't press Ctrl + Space. Use space instead
 */
export const triggerCharacters = [".", " ", "/", "?", "\\", "\n" ] as const;

export type MonacoSuggestion = PRGLMetaInfo & languages.CompletionItem & Pick<SQLSuggestion, "dataTypeInfo">;
export type ParsedSQLSuggestion = MonacoSuggestion & Omit<SQLSuggestion, "documentation">;

type EXPECT = "table" | "data type" | "column" | "keyword" | "command" | "objType" | "role" | "extension" | "funtion" | "any";

export type SQLMatchContext = {
  cb: CodeBlock, 
  ss: ParsedSQLSuggestion[], 
  setS: ParsedSQLSuggestion[], 
  sql: SQLHandler | undefined,
  getKind: (type: SQLSuggestion["type"]) => number
}
export type GetKind = (type: SQLSuggestion["type"]) => number;
export type SQLMatcherResultType = { 
  suggestions: (languages.CompletionItem | MonacoSuggestion | ParsedSQLSuggestion)[] 
};
export type SQLMatcher = {
  match: (cb: CodeBlock) => boolean;
  result: (args: {
    cb: CodeBlock, 
    ss: ParsedSQLSuggestion[], 
    setS: ParsedSQLSuggestion[], 
    sql: SQLHandler | undefined,
    getKind: (type: SQLSuggestion["type"]) => number;
    options?: {
      MatchSelect?: {
        excludeInto?: boolean;
      }
    }
  }) => Promise<SQLMatcherResultType>
}

type PRGLMetaInfo = {
  escapedParentName?: string;
  schema?: string;
}



type Kind = {
  Class: number;
  Color: number;
  Constant: number;
  Constructor: number;
  Customcolor: number;
  Enum: number;
  EnumMember: number;
  Event: number;
  Field: number;
  File: number;
  Folder: number;
  Function: number;
  Interface: number;
  Issue: number;
  Keyword: number;
  Method: number;
  Module: number;
  Operator: number;
  Property: number;
  Reference: number;
  Snippet: number;
  Struct: number;
  Text: number;
  TypeParameter: number;
  Unit: number;
  User: number;
  Value: number;
  Variable: number;
}
 
let sqlHoverProvider: IDisposable | undefined;

/**
 * Used to ensure connecting to other databases will show the correct suggestions
 */
let sqlCompletionProvider: IDisposable | undefined;
export function registerSuggestions(args: { suggestions: SQLSuggestion[], settingSuggestions: SQLSuggestion[], sql?: SQLHandler, editor: editor.IStandaloneCodeEditor; }) {
  const { suggestions, settingSuggestions, sql } = args;
  const s = suggestions;

  sqlHoverProvider?.dispose();
  sqlHoverProvider = monaco.languages.registerHoverProvider(LANG, {
    provideHover: async function (model, position) {
      const curWord = model.getWordAtPosition(position);

      if(curWord && s.length){
        const sm = s
          .find(s => s.type === "keyword" && s.name === curWord.word.toUpperCase());
        // console.log(position, curWord.word, sm)

        if(sm){
          return {
            range: new monaco.Range(position.lineNumber, curWord.startColumn, position.lineNumber, curWord.endColumn),
            // range: new monaco.Range(1, 1, model.getLineCount(), model.getLineMaxColumn(model.getLineCount())),
            contents: [
              { value: `**${sm.detail}**` },
              { value: sm.documentation || sm.type },
              // { value: '![my image](https://fdvsdfffdgdgdfg.com/favicon.ico)' }
            ]
          }
        }

        return {
          contents: []
        }
      }
    }
  });


  sqlCompletionProvider?.dispose();
  sqlCompletionProvider = monaco.languages.registerCompletionItemProvider(LANG, {
    triggerCharacters: triggerCharacters.slice(0),
    provideCompletionItems: async (model, position, context, token): Promise<{ suggestions: (MonacoSuggestion | languages.CompletionItem)[] }> => {
      // console.error("DELETE");
      // setTimeout(() => {
      //   debugger
      // }, 2000)
      // const EOL = model.getEOL();

      // console.log({ context, token })

      // const _w = model.getWordUntilPosition(position);
      // let word: string | undefined,
      //   startsWithUpperCase = false;
      

      // if (_w.word) {
      //   word = _w.word;
      //   const l: string = word[0]!
      //   startsWithUpperCase = l === l.toUpperCase() && l !== l.toLowerCase();
      // }
 

      // const curIndex = model.getOffsetAt(position),
      //   allText: string = model.getValue(), //.replace(/\n/g, " "), /* line breaks replaced with space */ 
      //   prevLinesArr = allText.slice(0, curIndex - (word || "").length).split(EOL),
      //   prvText: string = prevLinesArr.slice(-28).join(EOL), /* Limit the number of lines to improve performance for large queries */
      //   prevText = " " + prvText + " ";

      /* TODO Add type checking within for func arg types && table cols && func return types*/
      function parseSuggestions(sugests: SQLSuggestion[]): ParsedSQLSuggestion[] {
        return sugests.map((s, i) => {


          const res: ParsedSQLSuggestion = {
            ...s,
            range: undefined as any,
            kind: getKind(s.type),
            insertText: (s.insertText || s.name), // + (s.type === "function" ? " " : ""),
            detail: s.detail || `(${s.type})`,
            type: s.type,
            escapedParentName: s.escapedParentName,
            documentation: {
              value: s.documentation || `${s.type} ${s.detail || ""}`,
              //isTrusted: true,
            },
            sortText: '',
            // filterText: undefined,
            // commitCharacters: [ '[' ],
            // KeepWhitespace: 1,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
          }


          const info = getKeywordDocumentation(s.name);
          if (info) {
            res.documentation = {
              value: info
            }
          }

          return res;
        })
      }
      const ss = parseSuggestions(s);

      const setS = parseSuggestions(settingSuggestions);

      const cBlock = getCurrentCodeBlock(model, position);
      const isFormattingCode = context.triggerCharacter === "\n" && cBlock.thisLineLC.length > 0;
      const isCommenting = cBlock.currToken?.type === "comment.sql"
      if(isFormattingCode || isCommenting){
        return { suggestions: [] };
      }
      const { firstTry, match } = await getMatch({ cb: cBlock, ss, setS, sql, getKind});
      if(firstTry){
        return firstTry
      } else if(match) {
        const _res = await match.result({ cb: cBlock, ss, setS, sql, getKind });
        return _res;
      }

      // const lastLetter = allText.slice(0, curIndex).at(-1)
      // if(lastLetter && isUpperCase(lastLetter)){
      //   return {
      //     suggestions: ss.filter(s => s.type === "keyword" && s.topKwd).map(s => ({
      //       ...s,
      //       sortText: s.topKwd? "a" : "b"
      //     }))
      //   }
      // }
 
      // const isFreshStart = !prevText.trim() || prevText.replaceAll(" ", "").endsWith(EOL.repeat(2)) || prvText.trim().endsWith(";");
      // if (true || isFreshStart || prevText.toLowerCase().includes("explain")) {
      const suggestions = ss.filter(s => s.topKwd?.start_kwd).map(s => ({
        ...s,
        sortText: `a${s.topKwd!.priority ?? 99}`
      }));
      
      return {
        suggestions
      }
    }
  });

}

export const KNDS: Kind = monaco.languages.CompletionItemKind;
export const getKind = (type: SQLSuggestion["type"]): number => {
  // return KNDS.Text
  if (type === "function") {
    return KNDS.Function
  } else if (type === "column") {
    return KNDS.Field
  } else if (type === "table") {
      return KNDS.EnumMember
  } else if (type === "view" || type === "mview") {
    return KNDS.Value // return KNDS.Constant
  } else if (type === "dataType") {
    return KNDS.Variable
  } else if (type === "operator") {
    return KNDS.Operator
  } else if (type === "keyword") {
    return KNDS.Keyword
  } else if (type === "extension") {
    return KNDS.Module
  } else if (type === "schema") {
    return KNDS.Folder
  } else if (type === "setting") {
    return KNDS.Property
  } else if (type === "folder") {
    return KNDS.Folder
  } else if (type === "file") {
    return KNDS.File
  } else if (type === "snippet") {
    return KNDS.Snippet
  } else if (type === "database") {
    return KNDS.Struct
  } else if (type === "role" || type === "policy") {
    return KNDS.User
  } else if (type === "trigger" || type === "eventTrigger") {
    return KNDS.Event
  }

  return KNDS.Keyword
}
 
export function isUpperCase(str) {
  return str == str.toUpperCase() && str != str.toLowerCase();
}