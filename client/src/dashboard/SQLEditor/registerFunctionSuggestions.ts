import { languages } from "monaco-editor";
import { IDisposable } from "xterm";
import { getCurrentCodeBlock } from "./SQLCompletion/completionUtils/getCodeBlock";
import { asSQL } from "./SQLCompletion/KEYWORDS";
import { isInsideFunction } from "./SQLCompletion/MatchSelect";
import { LANG, SQLSuggestion } from "./SQLEditor";  
import * as Monaco from "monaco-editor";
import { PG_Function } from "./SQLCompletion/getPGObjects";


export type GetFuncs = (name: string, minArgs: number) => Promise<PG_Function[]>;

let sqlFunctionSuggestions: IDisposable | undefined;
export function registerFunctionSuggestions(monaco: typeof Monaco, getFunc: GetFuncs, suggestions: SQLSuggestion[]){

  sqlFunctionSuggestions?.dispose()
  sqlFunctionSuggestions = monaco.languages.registerSignatureHelpProvider(LANG, {

    signatureHelpTriggerCharacters: ['(', ','],
    provideSignatureHelp: async function(model, position) {
  
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      });

      const cb = getCurrentCodeBlock(model, position);
      const pt = cb.getPrevTokensNoParantheses(true);

      const prevLines: string[] = textUntilPosition.split(model.getEOL()).slice(0).reverse();

      const f = isInsideFunction(cb);
      const funcName = f?.func.text;
      if(!funcName) return null;

      const activeParameter = Math.max(0, f.prevArgs.length - 1 + ((cb.ltoken?.textLC === "," || cb.currToken?.textLC === "," )? 1 : 0)); 
      const result:  languages.ProviderResult<languages.SignatureHelpResult> = { 
        value: {
          activeParameter: activeParameter,
          activeSignature: 0,
          signatures: [],
        },
        dispose: () => { 
          // empty
        } 
      };
      const value = result.value ;

      const valuesIdx = pt.findIndex(t => t.textLC === "values" && t.type === "keyword.sql")
      const tokensBeforeValues = pt.slice(0, valuesIdx);
      const tokensAfterValues = pt.slice(valuesIdx);
      const textAfterValuesLC = tokensAfterValues.map(t => t.textLC).join("");
      const isInsertInto = (
        textAfterValuesLC.includes("(") && !textAfterValuesLC.includes(")") ||
        cb.currToken?.textLC.includes("(")
      )  && 
      cb.prevTokens.some((t, i, arr) => {
        return t.textLC === "insert" && 
          arr[i+1]?.textLC === "into" &&
          arr.some(at => at.textLC === "values")
      });

      if(!isInsertInto){
        
        const funcs = await getFunc(funcName, activeParameter);
        // console.log(funcs);
        value.signatures = funcs.map(f => ({
          label: `${f.name}(${f.arg_list_str})`,
          documentation: f.description ?? undefined,
          parameters: f.args
        }))
  
        return result

      } else {

        const intoTkn = cb.prevTokens.find((t, i, arr) => {
          return i && 
            arr[i-1]?.textLC === "insert" &&
            t.textLC === "into";
        });
        const tEndToken = cb.prevTokens.find(t => t.text === "(");
        if(!intoTkn || !tEndToken) return null;
        const tableNameTokens = cb.prevTokens.filter((t, i) => t.offset > intoTkn.offset && t.offset < tEndToken.offset);
        /** Some tables are a series of tokens (schema_name.table_name) */
        const tableName = tableNameTokens.map(t => t.text).join("");
  
        const insertLine = prevLines.map(l => {
          const v = l.replace(/\s\s+/g, ' ').trim()
          if(v.toUpperCase().includes("INSERT INTO")) return v 
        }).find(v => v);
        const tableInfo = suggestions.find(s => s.type === "table" && s.escapedIdentifier === tableName);
        let columnList = ((insertLine?.replace("VALUES(", "").split("(")[1]?.split(")")?.[0]?.split(",")) ?? []);

        if(!columnList.length && !tokensBeforeValues.some(t => t.textLC.includes("(")) && tableInfo?.cols){
          columnList = tableInfo.cols.sort((a, b) => a.ordinal_position - b.ordinal_position).map(c => c.escaped_identifier)
        }
        const argList = columnList
          .map(v => {
            const col = tableInfo?.cols!.find(c => c.escaped_identifier === v.trim());
            // a.label += `${(colInfo.has_default || colInfo.nullable)? "?" : ""}: ${colInfo.data_type}`;
            return { 
              label: v.trim() + (!col? "" : `${(col.nullable || col.has_default)? "?": ""}: ${col.udt_name}`), 
              data_type: col?.udt_name,
              documentation: { 
                value: asSQL(`${col?.definition}`) 
              }
            }
          });
        
        if(argList.length){
          
          value.signatures = ["VALUES"].map(f => ({
            label: `${f}(${argList.map(a => a.label).join(", ")})`,
            documentation: { value: "**hint**: Columns that are nullable or have default values and can be filled with *NULL* or *DEFAULT*" },
            parameters: argList,
          }))
          return { 
            value, 
            dispose: () => { 
              // empty 
            }  
          };
        }
      }
      

      // console.log(model.getWordUntilPosition({
      //   ...position,
      //   column: position.column - 1
      // }).word)

      // value.signatures = [{
      //   label: 'string substr(string $string, int $start [, int $length])',
      //   documentation: "dawdawdaw",
      //   parameters: [
      //     {
      //       label: 'string $string',
      //       documentation: 'The input string. Must be one character or longer.'
      //     },
      //     {
      //       label: 'int $start',
      //       documentation: "If $start is non-negative, the returned string will start at the $start'th position in string, counting from zero. For instance, in the string 'abcdef', the character at position 0 is 'a', the character at position 2 is 'c', and so forth.\r\nIf $start is negative, the returned string will start at the $start'th character from the end of string. If $string is less than $start characters long, FALSE will be returned."
      //     },
      //     {
      //       label: 'int $length',
      //       documentation: 'If $length is given and is positive, the string returned will contain at most $length characters beginning from $start (depending on the length of $string) If $length is given and is negative, then that many characters will be omitted from the end of $string (after the start position has been calculated when a start is negative). If $start denotes the position of this truncation or beyond, FALSE will be returned. If $length is given and is 0, FALSE or NULL, an empty string will be returned. If $length is omitted, the substring starting from $start until the end of the string will be returned.'
      //     }
      //   ]
      // }];

      // return { value, dispose: () => {  } };
    }
  });
}