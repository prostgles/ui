import { getEntries } from "../../../commonTypes/utils";
import { getLanguage } from "./LanguageSelector";
import { type Language, translations } from "./translations/translations";
import es from "./translations/es.json";
import { isObject } from "../../../commonTypes/publishUtils";

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
export type TemplatedTranslation = {
  text: string;
  argNames: string[];
};
export type Translation = undefined | TemplatedTranslation;
export type TranslationGroup = Record<string, Translation>;

/** Ensure argument names are valid */
const validateTranslationFiles = () => {
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
        const argNames = (argNamesOrText as Translation)?.argNames;
        checkArgs(_enTranslationKey as string, argNames, "en");
        getEntries(translationFiles).forEach(([lang, _translation]) => {
          const v = _translation[componentName][_enTranslationKey];
          if (typeof v === "string") {
            checkArgs(v, argNames, lang);
          } else {
            console.error("Invalid translation", v);
          }
        });
      },
    );
  });
};

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
              const engTranslation = translations[
                firstKey as keyof typeof translations
              ][secondKey] as Translation;
              const translation: Translation | string =
                lang === "en" ?
                  (engTranslation ?? secondKey + "?")
                : /** This is needed during dev when keys are missing */
                  ((translationFiles as any)?.[lang]?.[firstKey]?.[secondKey] ??
                  secondKey + "?");
              if (!isObject(translation)) {
                return translation;
              }
              return (args: Record<string, any>) => {
                let result = translation.text;
                translation.argNames.forEach((argName) => {
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

const enFile = Object.entries(translations).reduce(
  (acc, [componentName, componentTranslations]) => {
    return {
      ...acc,
      [componentName]: Object.fromEntries(
        Object.keys(componentTranslations).map((translationKey) => [
          translationKey,
          translationKey,
        ]),
      ),
    };
  },
  {},
);

try {
  validateTranslationFiles();
} catch (e) {
  console.error("Failed to validate translation files", e);
}
console.log("en.json", JSON.stringify(enFile));
