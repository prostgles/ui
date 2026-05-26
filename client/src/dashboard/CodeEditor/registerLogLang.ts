/* eslint-disable no-useless-escape */

import type { editor, Monaco } from "../W_SQL/monacoEditorTypes";

let logThemeLoaded = false;
export const LOG_LANGUAGE_ID = "log";
export const LOG_LANGUAGE_THEME_LIGHT = "logview";
export const LOG_LANGUAGE_THEME_DARK = "logview-dark";
export const registerLogLang = (monaco: Monaco) => {
  if (logThemeLoaded) return;
  logThemeLoaded = true;
  monaco.languages.register({ id: LOG_LANGUAGE_ID });

  monaco.languages.setMonarchTokensProvider(LOG_LANGUAGE_ID, {
    keywords: ["error", "warning", "info", "success"],
    date: /\[[0-9]{2}:[0-9]{2}:[0-9]{2}\]/,
    defaultToken: "",
    tokenPostfix: ".log",
    tokenizer: {
      root: [
        // Match timestamp like [HH:mm:ss]
        [/@date/, "date-token"],
        // Match log type like <info>, <error>, etc.
        [
          /<(\w+)>/,
          {
            cases: {
              "$1@keywords": { token: "$1-token", next: "@log.$1" },
              "@default": "string",
            },
          },
        ],
        // Trace/Verbose
        [/\b(Trace)\b:/, "verbose"],
        // Serilog VERBOSE
        [/\[(verbose|verb|vrb|vb|v)\]/i, "verbose"],
        // Android logcat Verboce
        [/\bV\//, "verbose"],
        // DEBUG
        [/\b(DEBUG|Debug)\b|\b([dD][eE][bB][uU][gG])\:/, "debug"],
        // Serilog DEBUG
        [/\[(debug|dbug|dbg|de|d)\]/i, "debug"],
        // Android logcat Debug
        [/\bD\//, "debug"],
        // INFO
        [
          /\b(HINT|INFO|INFORMATION|Info|NOTICE|II)\b|\b([iI][nN][fF][oO]|[iI][nN][fF][oO][rR][mM][aA][tT][iI][oO][nN])\:/,
          "info",
        ],
        // serilog INFO
        [/\[(information|info|inf|in|i)\]/i, "info"],
        // Android logcat Info
        [/\bI\//, "info"],
        // WARN
        [
          /\b(WARNING|WARN|Warn|WW)\b|\b([wW][aA][rR][nN][iI][nN][gG])\:/,
          "warning",
        ],
        // Serilog WARN
        [/\[(warning|warn|wrn|wn|w)\]/i, "warning"],
        // Android logcat Warning
        [/\bW\//, "warning"],
        // ERROR
        [
          /\b(ALERT|CRITICAL|EMERGENCY|ERROR|FAILURE|FAIL|Fatal|FATAL|Error|EE)\b|\b([eE][rR][rR][oO][rR])\:/,
          "error",
        ],
        // Serilog ERROR
        [/\[(error|eror|err|er|e|fatal|fatl|ftl|fa|f)\]/i, "error"],
        // Android logcat Error
        [/\bE\//, "error"],
        // ISO dates ("2020-01-01")
        [/\b\d{4}-\d{2}-\d{2}(T|\b)/, "date"],
        // Culture specific dates ("01/01/2020", "01.01.2020")
        [/\b\d{2}[^\w\s]\d{2}[^\w\s]\d{4}\b/, "date"],

        // Git commit hashes of length 40, 10, or 7
        [/\b([0-9a-fA-F]{40}|[0-9a-fA-F]{10}|[0-9a-fA-F]{7})\b/, "constant"],
        // Guids
        [
          /[0-9a-fA-F]{8}[-]?([0-9a-fA-F]{4}[-]?){3}[0-9a-fA-F]{12}/,
          "constant",
        ],
        // Constants
        [/\b([0-9]+|true|false|null)\b/, "constant"],
        // String constants
        [/"[^"]*"/, "string"],
        [/(?<![\w])'[^']*'/, "string"],
        // Exception type names
        [/\b([a-zA-Z.]*Exception)\b/, "exceptiontype"],
        // Colorize rows of exception call stacks
        [/^[\t ]*at.*$/, "exception"],
        // Match Urls
        [/\b(http|https|ftp|file):\/\/\S+\b\/?/, "constant"],
        // Match character and . sequences (such as namespaces) as well as file names and extensions (e.g. bar.txt)
        [/(?<![\w/\\])([\w-]+\.)+([\w-])+(?![\w/\\])/, "constant"],
      ],
      // Log content state
      log: [
        // Exit when next timestamp found
        [/@date/, { token: "@rematch", next: "@pop" }],
        // Color rest of line based on log level
        [/.*/, { token: "$S2-token" }],
      ],
    },
  });

  const rules: editor.ITokenThemeRule[] = [
    { token: "info.log", foreground: "#4b71ca" },
    { token: "error.log", foreground: "#ff0000", fontStyle: "bold" },
    { token: "warning.log", foreground: "#FFA500" },
    { token: "date.log", foreground: "#008800" },
    { token: "constant", foreground: "#00891f" },
    { token: "exceptiontype.log", foreground: "#808080" },
  ];
  monaco.editor.defineTheme(LOG_LANGUAGE_THEME_LIGHT, {
    base: "vs",
    inherit: true,
    rules,
    colors: {},
  });
  monaco.editor.defineTheme(LOG_LANGUAGE_THEME_DARK, {
    base: "vs-dark",
    inherit: true,
    rules,
    colors: {},
  });
};
