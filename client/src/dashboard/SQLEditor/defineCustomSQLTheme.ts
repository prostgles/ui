import { LANG, customLightThemeMonaco, getMonaco } from "./SQLEditor";

let themeWasSet = false;
export const defineCustomSQLTheme = async (): Promise<boolean> => {
  if (themeWasSet) return false;
  themeWasSet = true;
  const monaco = await getMonaco();
  monaco.editor.defineTheme(customLightThemeMonaco, {
    base: "vs", // can also be vs-dark or hc-black or vs
    inherit: true, // can also be false to completely replace the builtin rules
    colors: {},
    rules: [
      { token: `string.${LANG}`, foreground: "#930000" }, // #e200e2

      /* Table names */
      { token: `identifier.${LANG}`, foreground: "#6c06ab" },
      { token: `complexIdentifiers.${LANG}`, foreground: "#6c06ab" },

      // { token: `identifier.ts`, foreground: "#1072a3"},
      // { token: 'function', foreground: '94763a', fontStyle: 'bold'  },
      // { token: 'keyword', foreground: '#696969' },
    ],
  });
  return true;
};
