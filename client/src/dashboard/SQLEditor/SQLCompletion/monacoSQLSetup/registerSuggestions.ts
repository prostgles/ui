import type { SQLHandler } from "prostgles-types";
import { format } from "sql-formatter";
import { debounce } from "../../../Map/DeckGLWrapped";
import type {
  editor,
  IDisposable,
  IRange,
  languages,
  Monaco,
  Position,
} from "../../../W_SQL/monacoEditorTypes";
import type { SQLSuggestion } from "../../W_SQLEditor";
import { LANG } from "../../W_SQLEditor";
import { getKeywordDocumentation } from "../../SQLEditorSuggestions";
import type { CodeBlock } from "../completionUtils/getCodeBlock";
import { getCurrentCodeBlock } from "../completionUtils/getCodeBlock";
import { getStartingLetters, removeQuotes } from "../getJoinSuggestions";
import { getMatch } from "../getMatch";
import { registerHover } from "./registerHover";

export const triggerCharacters = [
  ".",
  "/",
  "?",
  "\\",
  "=",
  /**
   * Mobile devices can't press Ctrl + Space. Use space instead
   */
  " ",
] as const;

export type MonacoSuggestion = PRGLMetaInfo &
  languages.CompletionItem &
  Pick<SQLSuggestion, "dataTypeInfo">;
export type ParsedSQLSuggestion = MonacoSuggestion &
  Omit<SQLSuggestion, "documentation">;

export type SQLMatchContext = {
  cb: CodeBlock;
  ss: ParsedSQLSuggestion[];
  setS: ParsedSQLSuggestion[];
  sql: SQLHandler | undefined;
};
export type GetKind = (type: SQLSuggestion["type"]) => number;
export type SuggestionItem =
  | languages.CompletionItem
  | MonacoSuggestion
  | ParsedSQLSuggestion;
export type SQLMatcherResultType = {
  suggestions: SuggestionItem[];
};
export type SQLMatcherResultArgs = SQLMatchContext & {
  /** Used for lateral join subquery which can use columns from previous tables */
  parentCb?: CodeBlock;
  options?: {
    MatchSelect?: {
      excludeInto?: boolean;
    };
  };
};
export type SQLMatcher = {
  match: (cb: CodeBlock) => boolean;
  result: (
    args: SQLMatcherResultArgs,
  ) => Promise<SQLMatcherResultType> | SQLMatcherResultType;
};

type PRGLMetaInfo = {
  escapedParentName?: string;
  schema?: string;
};

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
};

let sqlHoverProvider: IDisposable | undefined;

/**
 * Used to ensure connecting to other databases will show the correct suggestions
 */
let sqlCompletionProvider: IDisposable | undefined;
let sqlInlineCompletionProvider: IDisposable | undefined;
let sqlFormattingProvider: IDisposable | undefined;
type Args = {
  suggestions: SQLSuggestion[];
  settingSuggestions: SQLSuggestion[];
  sql?: SQLHandler;
  editor: editor.IStandaloneCodeEditor;
  monaco: Monaco;
};

const getRespectedSortText = (
  cb: CodeBlock,
  monaco: Monaco,
  {
    suggestions,
  }: {
    suggestions: (
      | MonacoSuggestion
      | languages.CompletionItem
      | ParsedSQLSuggestion
    )[];
  },
) => {
  const { currToken } = cb;
  const currTextRaw = currToken?.text;
  const range = new monaco.Range(
    cb.position.lineNumber,
    cb.position.column,
    cb.position.lineNumber,
    cb.position.column,
  );
  if (!currTextRaw) {
    return {
      suggestions: suggestions.map((s) => ({
        ...s,
        range,
      })),
    };
  }
  const currTextLC = removeQuotes(currTextRaw).toLowerCase();
  const sortText = Array.from(
    new Set(suggestions.map((s) => s.sortText)),
  ).sort();
  const isSingleSortText = sortText.length === 1;
  // if (isSingleSortText) return { suggestions };

  const getRangeAndFilter = (
    rawFilterText: string | undefined,
  ): Pick<
    languages.CompletionItem,
    "range" | "filterText" | "insertTextRules"
  > => {
    let range: languages.CompletionItem["range"] | undefined;
    if (currTextRaw.startsWith(`"`)) {
      range = new monaco.Range(
        currToken.lineNumber,
        currToken.columnNumber,
        currToken.lineNumber,
        currToken.columnNumber + currTextRaw.length,
      );
      return {
        range,
        filterText: `"` + rawFilterText,
      };
    }
    if (isSingleSortText) {
      return {
        range: range as IRange,
      };
    }
    return {
      range: range as IRange,
      // insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      filterText: rawFilterText,
    };
  };

  /**
   *  SELECT name
   *  FROM pg_class
   *
   *  yields unwanted list of "name" functions at the top, not respecting sortText
   *  if user is searching for something that matches expression columns then
   *  add 5 other matching functions at most to not obfuscate the columns
   */
  const fixedSuggestions = suggestions.map((s) => {
    const sortIndex = sortText.indexOf(s.sortText);
    const itemTextRaw =
      "escapedIdentifier" in s && s.escapedIdentifier ? s.escapedIdentifier
      : "escapedName" in s && s.escapedName ? s.escapedName
      : "name" in s ? s.name
      : typeof s.label === "string" ? s.label
      : s.label.label;
    const itemText = removeQuotes(itemTextRaw).toLowerCase();
    if (sortIndex > 0) {
      return {
        ...s,
        ...getRangeAndFilter(s.filterText),
      };
    }

    let filterText: string | undefined;
    const idxOfItemText = itemText.indexOf(currTextLC);
    if (idxOfItemText > -1) {
      filterText = itemText.slice(idxOfItemText);
    } else {
      const startingLetters = getStartingLetters(itemText).toLowerCase();
      const idxOfStartingLetters = startingLetters.indexOf(currTextLC);
      if (idxOfStartingLetters > -1) {
        filterText =
          startingLetters.slice(idxOfStartingLetters) + " " + (itemText || "");
      }
    }
    return {
      ...s,
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      ...getRangeAndFilter(filterText),
    };
  });

  return {
    suggestions: fixedSuggestions,
  };
};
export let KNDS = {} as Kind;

export function registerSuggestions(args: Args) {
  const { suggestions, settingSuggestions, sql, monaco, editor } = args;
  const sqlSuggestions = suggestions;
  KNDS = monaco.languages.CompletionItemKind;

  const provideCompletionItems = async (
    model: editor.ITextModel,
    position: Position,
    context: languages.CompletionContext,
  ): Promise<{
    suggestions: (
      | MonacoSuggestion
      | languages.CompletionItem
      | ParsedSQLSuggestion
    )[];
  }> => {
    /* TODO Add type checking within for func arg types && table cols && func return types*/
    function parseSuggestions(sugests: SQLSuggestion[]): ParsedSQLSuggestion[] {
      return sugests.map((s, i) => {
        const res: ParsedSQLSuggestion = {
          ...s,
          range: undefined as any,
          kind: getKind(s.type),
          insertText: s.insertText || s.name,
          detail: s.detail || `(${s.type})`,
          type: s.type,
          escapedParentName: s.escapedParentName,
          documentation: {
            value: s.documentation || `${s.type} ${s.detail || ""}`,
          },
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        };

        const info = getKeywordDocumentation(s.name);
        if (info) {
          res.documentation = {
            value: info,
          };
        }

        return res;
      });
    }
    const ss = parseSuggestions(sqlSuggestions);

    const setS = parseSuggestions(settingSuggestions);

    const cBlock = await getCurrentCodeBlock(model, position);
    const myEditor = monaco.editor
      .getEditors()
      .find((e) => e.getModel()?.id === model.id);
    const editorNode = myEditor?.getDomNode();
    if (editorNode) {
      (editorNode as any)._cBlock = cBlock;
    }
    const isFormattingCode =
      context.triggerCharacter === "\n" && cBlock.thisLineLC.length > 0;
    const isCommenting = cBlock.currToken?.type === "comment.sql";
    if (isFormattingCode || isCommenting) {
      return { suggestions: [] };
    }

    const { firstTry, match } = await getMatch({ cb: cBlock, ss, setS, sql });
    if (firstTry) {
      return getRespectedSortText(cBlock, monaco, firstTry);
    } else if (match) {
      const res = await match.result({ cb: cBlock, ss, setS, sql });
      return getRespectedSortText(cBlock, monaco, res);
    }

    const suggestions = ss
      .filter((s) => s.topKwd?.start_kwd)
      .map((s) => ({
        ...s,
        sortText: `a${s.topKwd!.priority ?? 99}`,
      }));

    return {
      suggestions,
    };
  };

  sqlFormattingProvider?.dispose();
  sqlFormattingProvider =
    monaco.languages.registerDocumentFormattingEditProvider(LANG, {
      displayName: LANG.toUpperCase(),
      provideDocumentFormattingEdits: (model) => {
        // const newText = await getFormattedSql(model);

        const tabWidth = model.getOptions().indentSize || 2;
        const newText = format(model.getValue(), {
          language: "postgresql",
          expressionWidth: 80,
          indentStyle: "standard",
          tabWidth,
          linesBetweenQueries: 2,
          logicalOperatorNewline: "before",
        });
        return [
          {
            range: model.getFullModelRange(),
            text: newText,
          },
        ];
      },
    });
  sqlHoverProvider?.dispose();
  sqlHoverProvider = registerHover(
    monaco,
    sqlSuggestions,
    provideCompletionItems,
  );

  sqlCompletionProvider?.dispose();
  sqlCompletionProvider = monaco.languages.registerCompletionItemProvider(
    LANG,
    {
      triggerCharacters: triggerCharacters.slice(0),
      provideCompletionItems: async (
        model,
        position,
        context,
      ): Promise<{
        suggestions: (MonacoSuggestion | languages.CompletionItem)[];
      }> => {
        const res = await provideCompletionItems(model, position, context);
        return res;
      },
      resolveCompletionItem: (item, token) => {
        hackyFixMonacoSortFilter(args.editor);
        return item;
      },
    },
  );

  // TODO: Add inline completion using LLMs
  // setInterval(() => {
  //   editor.trigger("demo", "editor.action.inlineSuggest.trigger", {});
  // }, 2e3)
  // sqlInlineCompletionProvider?.dispose();
  // sqlInlineCompletionProvider = monaco.languages.registerInlineCompletionsProvider(LANG, {
  //   freeInlineCompletions: (completions) => {

  //   },
  //   provideInlineCompletions: async (model, position) => {
  //     // const suggestionText = "hello there\n  dwadwa \n dwadwa";
  //     // const maxColumn = model.getLineMaxColumn(position.lineNumber);
  //     // const maxLine = model.getLineCount();
  //     // const line = model.getLineContent(position.lineNumber);
  //     const contentAfterCusor = model.getLineContent(position.lineNumber).slice(position.column - 1);

  //     const insertText = "hello there\n  dwadwa \n dwadwa"; // "hello there dwadwa";
  //     return {
  //       items: [
  //         {
  //           // range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, contentAfterCusor? model.getLineMaxColumn(position.lineNumber) : position.column),
  //           // range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.lineNumber ),
  //           insertText,
  //           // insertText: "hello there\n  dwadwa \n dwadwa",
  //           // additionalTextEdits: [
  //           //   {
  //           //     range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
  //           //     text: ""
  //           //   }
  //           // ],
  //         }
  //       ],
  //     }
  //   }
  // });
}
export const getKind = (
  type: SQLSuggestion["type"],
  KindMap = KNDS,
): number => {
  // return KNDS.Text
  if (type === "function") {
    return KindMap.Function;
  } else if (type === "column") {
    return KindMap.Field;
  } else if (type === "table") {
    return KindMap.EnumMember;
  } else if (type === "view" || type === "mview") {
    return KindMap.Value; // return KNDS.Constant
  } else if (type === "dataType") {
    return KindMap.Variable;
  } else if (type === "operator") {
    return KindMap.Operator;
  } else if (type === "keyword") {
    return KindMap.Keyword;
  } else if (type === "extension") {
    return KindMap.Module;
  } else if (type === "schema") {
    return KindMap.Folder;
  } else if (type === "setting") {
    return KindMap.Property;
  } else if (type === "folder") {
    return KindMap.Folder;
  } else if (type === "file") {
    return KindMap.File;
  } else if (type === "snippet") {
    return KindMap.Snippet;
  } else if (type === "database") {
    return KindMap.Struct;
  } else if (type === "role" || type === "policy") {
    return KindMap.User;
  } else if (type === "trigger" || type === "eventTrigger") {
    return KindMap.Event;
  }
  return KindMap.Keyword;
};

export function isUpperCase(str) {
  return str == str.toUpperCase() && str != str.toLowerCase();
}

/**
 * Extra fix below does not work for all cases
 * monaco filters items without caring about sortText too much (relname "-1" is not shown. name "b" is shown instead).
 * Need to insure that sortText first group items are shown if they contain the word
 *
 * SELECT *
 * FROM pg_catalog.pg_class
 * ORDER BY name -> relname
 */
const hackyFixMonacoSortFilter = debounce(
  (editor: editor.IStandaloneCodeEditor) => {
    const suggestWidget = (editor as any).getContribution(
      "editor.contrib.suggestController",
    ).widget;
    const allCompletionItems: ParsedSQLSuggestion[] | undefined =
      suggestWidget._value._completionModel?._items.map((d) => d.completion);
    if (!allCompletionItems) return;
    const shownCompletionItems = suggestWidget._value._list.view.items.map(
      (e) => e.element.completion,
    ) as ParsedSQLSuggestion[];
    const firstItem: ParsedSQLSuggestion | undefined =
      suggestWidget._value._list.view.items[0]?.element.completion;
    const focusedItem: {
      filterTextLow: string;
      word: string;
      completion: ParsedSQLSuggestion;
    } = suggestWidget._value._focusedItem ?? {};
    const { filterTextLow, completion } = focusedItem;
    const didScroll =
      suggestWidget._value?._list?.view.scrollable._state.scrollTop;
    const cb = (editor.getDomNode() as any)?._cBlock as CodeBlock | undefined;
    const word = focusedItem.word || cb?.currToken?.text;
    // console.log(cb, suggestWidget, focusedItem, shownCompletionItems)
    if (
      !didScroll &&
      cb?.currToken?.type !== "string.sql" &&
      allCompletionItems.length &&
      word &&
      filterTextLow &&
      firstItem
    ) {
      const itemThatShouldBeHigher = allCompletionItems.find(
        (s) =>
          (s.name as any)?.includes(word) &&
          s.sortText &&
          s.sortText < (firstItem.sortText ?? "zzz"),
      );
      if (
        itemThatShouldBeHigher &&
        !shownCompletionItems
          .slice(0, 10)
          .find((s) => s.name === itemThatShouldBeHigher.name)
      ) {
        // && !filterTextLow.includes(word)
        editor.trigger("demo", "hideSuggestWidget", {});
        editor.trigger("demo", "editor.action.triggerSuggest", {});
      }
    }
  },
  500,
);

// function searchObjectForValue(obj, searchValue) {
//   const results = [];
//   const visited = new WeakSet();

//   function traverse(currentObj, path = '') {
//     if (typeof currentObj !== 'object' || currentObj === null) {
//       return;
//     }

//     // Check for circular reference
//     if (visited.has(currentObj)) {
//       return;
//     }

//     visited.add(currentObj);

//     for (let key in currentObj) {
//       if (currentObj.hasOwnProperty?.(key) && !Number.isFinite(+key)) {
//         const newPath = path ? `${path}.${key}` : key;
//         const value = currentObj[key];

//         if (typeof value === 'string' && value === (searchValue)) {
//           results.push({ path: newPath, value: value });
//         } else if (typeof value === 'object' && value !== null) {
//           traverse(value, newPath);
//         }
//       }
//     }
//   }

//   traverse(obj);
//   return results;
// }
