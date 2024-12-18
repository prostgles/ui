import { isObject } from "../../../commonTypes/publishUtils";
import { getEntries } from "../../../commonTypes/utils";
import { getLanguage } from "./LanguageSelector";
import { type Language, translations } from "./translations/translations";

type LanguageWithoutEn = Exclude<Language, "en">;
export type Translation = Record<LanguageWithoutEn, string> & {
  argNames?: string[];
};

export type TranslationGroup = Record<string, Translation>;

/** Ensure argument names are valid */
getEntries(translations).forEach(([componentName, componentTranslations]) => {
  const checkArgs = (text: string, argNames: string[] | undefined) => {
    if (Array.isArray(argNames)) {
      argNames.forEach((argName) => {
        if (!text.includes(`{{${argName}}}`)) {
          throw new Error(
            `Translation "${componentName}.${text}" has invalid argName: ${argName}`,
          );
        }
      });
    }
    const textArgCount = text.split("{{").length - 1;
    if (textArgCount !== (argNames?.length ?? 0)) {
      throw new Error(
        `Translation "${componentName}.${text}" has incorrect number of argNames`,
      );
    }
  };
  getEntries(componentTranslations).forEach(
    ([_enTranslationKey, argNamesOrText]) => {
      const argNames = (argNamesOrText as Translation).argNames;
      checkArgs(_enTranslationKey as string, argNames);
      getEntries(argNamesOrText).forEach(
        ([_langOrArgNamesKey, _translation]) => {
          const langOrArgNamesKey = _langOrArgNamesKey as keyof Translation;
          if (langOrArgNamesKey !== "argNames") {
            const translation =
              _translation as Translation[typeof langOrArgNamesKey];
            checkArgs(translation, argNames);
          }
        },
      );
    },
  );
});

export const t = new Proxy(
  {},
  {
    get: (_, firstKey) => {
      if (firstKey in translations) {
        return new Proxy(
          {},
          {
            get(_, secondKey: string) {
              const lang = getLanguage();
              const _translation = translations[
                firstKey as keyof typeof translations
              ][secondKey] as Translation;
              const argNames = _translation.argNames;
              const text = lang === "en" ? secondKey : _translation[lang];
              if (!argNames) {
                return text;
              }
              return (args: Record<string, any>) => {
                let result = text;
                argNames.forEach((argName) => {
                  result = result.replace(`{{${argName}}}`, args[argName]);
                });
                return result;
              };
            },
          },
        );
      }
    },
  },
) as TranslationHandler;

type BaseTranslation = typeof translations;

type TranslationHandler = {
  [CompKey in keyof BaseTranslation]: {
    [TranslationKey in keyof BaseTranslation[CompKey]]: BaseTranslation[CompKey][TranslationKey] extends (
      { argNames: string[] }
    ) ?
      (
        opts: Record<
          BaseTranslation[CompKey][TranslationKey]["argNames"][number],
          string | number
        >,
      ) => string
    : string;
  };
};
