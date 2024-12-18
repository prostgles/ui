import { getEntries } from "../../../commonTypes/utils";
import { getLanguage } from "./LanguageSelector";
import { type Language, translations } from "./translations/translations";
import es from "./translations/es.json";

type TranslationsType<T> = {
  [K1 in keyof T]: {
    [K2 in keyof T[K1]]: string;
  };
};

type TranslationFile = TranslationsType<typeof translations>;

const translationFiles: Record<LanguageWithoutEn, TranslationFile> = {
  es,
};

type LanguageWithoutEn = Exclude<Language, "en">;
export type Translation = {
  argNames?: string[];
};

export type TranslationGroup = Record<string, Translation>;

/** Ensure argument names are valid */
getEntries(translations).forEach(([componentName, componentTranslations]) => {
  const checkArgs = (
    text: string,
    argNames: string[] | undefined,
    lang: string,
  ) => {
    if (Array.isArray(argNames)) {
      argNames.forEach((argName) => {
        if (!text.includes(`{{${argName}}}`)) {
          throw new Error(
            `${lang} Translation "${componentName}.${text}" has invalid argName: ${argName}`,
          );
        }
      });
    }
    const textArgCount = text.split("{{").length - 1;
    if (textArgCount !== (argNames?.length ?? 0)) {
      throw new Error(
        `${lang} Translation "${componentName}.${text}" has incorrect number of argNames`,
      );
    }
  };
  getEntries(componentTranslations).forEach(
    ([_enTranslationKey, argNamesOrText]) => {
      const argNames = (argNamesOrText as Translation).argNames;
      checkArgs(_enTranslationKey as string, argNames, "en");
      getEntries(translationFiles).forEach(([lang, _translation]) => {
        checkArgs(
          _translation[componentName][_enTranslationKey],
          argNames,
          lang,
        );
      });
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
              const text =
                lang === "en" ? secondKey : (
                  translationFiles[lang][firstKey][secondKey]
                );
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
