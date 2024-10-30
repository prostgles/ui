import type { editor } from "monaco-editor";

import dark_modern from "./vscodeThemes/dark_modern.json"
import dark_plus from "./vscodeThemes/dark_plus.json"
import dark_vs from "./vscodeThemes/dark_vs.json"
import hc_black from "./vscodeThemes/hc_black.json"
import hc_light from "./vscodeThemes/hc_light.json"
import light_modern from "./vscodeThemes/light_modern.json"
import light_plus from "./vscodeThemes/light_plus.json"
import light_vs from "./vscodeThemes/light_vs.json"

export interface IVSCodeTheme {
  $schema: "vscode://schemas/color-theme",
  type: "dark" | "light",
  colors?: { [name: string]: string };
  include?: string;
  tokenColors?: {
    name?: string;
    "scope": string[] | string,
    "settings": {
      foreground?: string;
      background?: string;
      fontStyle?: string;
    }
  }[]
}

export function convertTheme(theme: IVSCodeTheme): editor.IStandaloneThemeData {

  const monacoThemeRule: editor.ITokenThemeRule[] = [];
  const returnTheme: editor.IStandaloneThemeData = {
    inherit: false,
    base: "vs",
    colors: theme.colors ?? {},
    rules: monacoThemeRule,
    encodedTokensColors: []
  };

  theme.tokenColors?.map((color) => {

    if (typeof color.scope == "string") {

      const split = color.scope.split(",");

      if (split.length > 1) {
        color.scope = split;
        evalAsArray();
        return;
      }

      monacoThemeRule.push(Object.assign({}, color.settings, {
        // token: color.scope.replace(/\s/g, '')
        token: color.scope
      }));
      return;
    }

    evalAsArray();

    function evalAsArray() {
      if (color.scope) {
        (color.scope as string[]).map((scope) => {
          monacoThemeRule.push(Object.assign({}, color.settings, {
            token: scope
          }));
        });
      }
    }
  });

  return returnTheme;
}

const vsThemes = {
  dark_modern, 
  dark_plus, 
  dark_vs, 
  hc_black, 
  hc_light, 
  light_modern, 
  light_plus, 
  light_vs, 
}

type IVSCodeTheme2 = IVSCodeTheme; //typeof vsThemes[keyof typeof vsThemes];

type ThemeKey = keyof typeof vsThemes;
type ThemePath = `./${ThemeKey}.json`;

function convertTheme2(
  theme: IVSCodeTheme2,
  themeKey: ThemeKey,
  themePath: ThemePath | undefined,
  includedThemes: Set<ThemePath> = new Set()
): editor.IStandaloneThemeData {

  // Check for circular references
  if (themePath && includedThemes.has(themePath)) {
    throw new Error(`Circular theme include detected: ${themePath}`);
  }

  if (themePath) {
    includedThemes.add(themePath);
  }

  const type = themeKey.includes("dark") ? "dark" : "light";

  const monacoThemeRule: editor.ITokenThemeRule[] = [];
  const returnTheme: editor.IStandaloneThemeData = {
    inherit: true,
    base: type === "dark" ? "vs-dark" : "vs",
    colors: {},
    rules: monacoThemeRule,
  };

  // Handle theme.include recursively
  if (theme.include) {
    const includedThemePath = theme.include;
    const includedThemeKey = includedThemePath.split("/")[1]?.split(".")[0] as ThemeKey
    const includedTheme = vsThemes[includedThemeKey];
    const includedConvertedTheme = convertTheme2(includedTheme as any, includedThemeKey, includedThemePath as any, includedThemes);

    // Merge included theme colors
    Object.assign(returnTheme.colors, includedConvertedTheme.colors);

    // Merge included theme rules
    monacoThemeRule.push(...includedConvertedTheme.rules);
  }

  // Merge current theme colors, overriding included theme colors
  if (theme.colors) {
    Object.assign(returnTheme.colors, theme.colors);
  }

  // Process tokenColors
  theme.tokenColors?.forEach((tokenColor) => {

    function processScope(scope: string | string[]) {
      const scopes = Array.isArray(scope) ? scope : [scope];
      scopes.forEach((scopeItem) => {
        monacoThemeRule.push({
          token: scopeItem.trim(),
          foreground: tokenColor.settings.foreground?.replace("#", ""),
          background: tokenColor.settings.background?.replace("#", ""),
          fontStyle: tokenColor.settings.fontStyle,
        });
      });
    }

    if (typeof tokenColor.scope === "string") {
      // Handle comma-separated scopes
      if (tokenColor.scope.includes(",")) {
        const splitScopes = tokenColor.scope.split(",").map(s => s.trim());
        processScope(splitScopes);
      } else {
        processScope(tokenColor.scope);
      }
    } else if (Array.isArray(tokenColor.scope)) {
      processScope(tokenColor.scope);
    }
  });

  return returnTheme;
}
