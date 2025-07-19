import type {
  editor,
  languages,
  Monaco,
  Position,
} from "../../../W_SQL/monacoEditorTypes";
import { LANG, type SQLSuggestion } from "../../W_SQLEditor";
import { isDefined, isObject } from "prostgles-types";
import type {
  MonacoSuggestion,
  ParsedSQLSuggestion,
} from "./registerSuggestions";

export const registerHover = (
  monaco: Monaco,
  sqlSuggestions: SQLSuggestion[],
  provideCompletionItems: (
    model: editor.ITextModel,
    position: Position,
    context: languages.CompletionContext,
  ) => Promise<{
    suggestions: (
      | MonacoSuggestion
      | languages.CompletionItem
      | ParsedSQLSuggestion
    )[];
  }>,
) => {
  return monaco.languages.registerHoverProvider(LANG, {
    provideHover: async function (model, position, token, context) {
      const curWord = model.getWordAtPosition(position);

      if (!curWord || !sqlSuggestions.length) {
        return;
      }

      const startOfWordPosition = new monaco.Position(
        position.lineNumber,
        curWord.startColumn,
      );
      const justAfterStartOfWordPosition = new monaco.Position(
        position.lineNumber,
        curWord.startColumn + 1,
      );
      const offset = model.getOffsetAt(startOfWordPosition);
      const modelValue = model.getValue();
      /* set current word to empty string to get all suggestions */
      const val =
        modelValue.slice(0, offset) +
        " " +
        modelValue.slice(offset + curWord.word.length);
      const newModel = monaco.editor.createModel(val, LANG);
      const { suggestions } = await provideCompletionItems(
        newModel,
        justAfterStartOfWordPosition,
        {
          triggerKind: monaco.languages.CompletionTriggerKind.Invoke,
          triggerCharacter: " ",
        },
      );
      newModel.dispose();
      let matches = suggestions.filter(
        (s) =>
          s.insertText === curWord.word ||
          s.insertText.toLowerCase() === curWord.word.toLowerCase() ||
          (s as ParsedSQLSuggestion).escapedIdentifier === curWord.word,
      );
      if (!matches.length) {
        matches = suggestions.filter(
          (s) =>
            (s as ParsedSQLSuggestion).escapedIdentifier?.startsWith(`"`) &&
            (s as ParsedSQLSuggestion).escapedIdentifier?.includes(
              curWord.word,
            ),
        );
      }
      if (!matches.length) {
        matches = suggestions.filter(
          (s) => (s as ParsedSQLSuggestion).escapedName === curWord.word,
        );
      }

      const [_matchingSuggestion, ...otherMatches] = matches;
      // TODO ensure escapeIdentifier works ("table name" ends up as two words (in curWord) and doesn't always match)
      // console.log(curWord.word, _matchingSuggestion, other);
      let matchingSuggestion = _matchingSuggestion;
      if (otherMatches.length && matchingSuggestion) {
        /** Matched many similar functions. Pick first*/
        if (
          otherMatches.every(
            (s) =>
              matchingSuggestion &&
              "type" in s &&
              "type" in matchingSuggestion &&
              "name" in s &&
              "name" in matchingSuggestion &&
              s.type === matchingSuggestion.type &&
              s.type === "function" &&
              s.name === matchingSuggestion.name,
          )
        ) {
        } else {
          matchingSuggestion = undefined;
        }
      }
      const sm =
        matchingSuggestion ??
        sqlSuggestions.find(
          (s) => s.type === "keyword" && s.name === curWord.word.toUpperCase(),
        );

      if (sm) {
        const detail = "detail" in sm ? sm.detail : "";
        const documentationText =
          isObject(sm.documentation) ? sm.documentation.value
          : typeof sm.documentation === "string" ? sm.documentation
          : "";
        return {
          range: new monaco.Range(
            position.lineNumber,
            curWord.startColumn,
            position.lineNumber,
            curWord.endColumn,
          ),
          contents: [
            !detail ? undefined : { value: `**${detail}**` },
            { value: documentationText },
            // { value: '![my image](https://fdvsdfffdgdgdfg.com/favicon.ico)' }
          ].filter(isDefined),
        };
      }

      return {
        contents: [],
      };
    },
  });
};
