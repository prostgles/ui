import { isDefined } from "../../utils";
import { LANG, getMonaco } from "./W_SQLEditor";

export const CUSTOM_MONACO_SQL_THEMES = {
  light: "myCustomLightTheme",
  dark: "myCustomDarkTheme",
} as const;
let themeWasSet = false;

type TokenColors = {
  string: string;
  identifiersInclComplex: string;
  inbuiltFuncs: string;
};

const getRules = (
  { identifiersInclComplex, inbuiltFuncs, string }: TokenColors,
  isDark: boolean,
) => {
  const uniqueVals = new Set([identifiersInclComplex, inbuiltFuncs, string]);
  if (uniqueVals.size !== 3) {
    throw new Error(
      "Token colors must be unique to ensure tokenization within suggestion markdown is consistent for svg screenshots",
    );
  }
  return [
    { token: `string.${LANG}`, foreground: string },
    { token: "operator.scope", foreground: "569cd6" },
    /* Table names */
    { token: `identifier.${LANG}`, foreground: identifiersInclComplex },
    {
      token: `complexIdentifiers.${LANG}`,
      foreground: identifiersInclComplex,
    },
    /** Inbuilt funcs */
    { token: "predefined.sql", foreground: inbuiltFuncs },
    /** Do to ensure tokenization splits suggestion markdown tokens consistently */
    !isDark ? undefined : { token: "delimiter", foreground: "D4D4D4" },
  ].filter(isDefined);
};

export const defineCustomSQLTheme = async (): Promise<boolean> => {
  if (themeWasSet) return false;
  themeWasSet = true;
  const monaco = await getMonaco();
  monaco.editor.defineTheme(CUSTOM_MONACO_SQL_THEMES.light, {
    base: "vs", // can also be vs-dark or hc-black or vs
    inherit: true, // can also be false to completely replace the builtin rules
    colors: {},
    rules: getRules(
      {
        string: "#930000",
        identifiersInclComplex: "#6c06ab",
        inbuiltFuncs: "#c700c6",
      },
      false,
    ),
  });

  monaco.editor.defineTheme(CUSTOM_MONACO_SQL_THEMES.dark, {
    base: "vs-dark", // can also be vs-dark or hc-black or vs
    inherit: true, // can also be false to completely replace the builtin rules
    colors: {},
    rules: getRules(
      {
        string: "#db5050",
        identifiersInclComplex: "#fb9ffb",
        inbuiltFuncs: "#f90af9",
      },
      true,
    ),
  });
  return true;
};
