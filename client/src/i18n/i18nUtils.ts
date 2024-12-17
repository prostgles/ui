import { isObject } from "../../../commonTypes/publishUtils";
import { getEntries } from "../../../commonTypes/utils";
import { getLanguage } from "./LanguageSelector";
import {
  type TemplatedTranslationConfig,
  translations,
} from "./translations/translations";

/** Ensure argument names are valid */
getEntries(translations).forEach(([key, translatedKeys]) => {
  getEntries(translatedKeys).forEach(([subKey, subKeys]) => {
    getEntries(subKeys).forEach(([_lang, _translation]) => {
      const lang = _lang as string;
      const translation = _translation as string | TemplatedTranslationConfig;
      if (isObject(translation)) {
        const { argNames, text } = translation;
        if (
          !Array.isArray(argNames) ||
          argNames.some((argName) => !text.includes(`{{${argName}}}`))
        ) {
          throw new Error(
            `Translation "${key}.${subKey}.${lang}" has invalid argNames`,
          );
        }
      }
    });
  });
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
              const translation =
                translations[firstKey as keyof typeof translations][secondKey][
                  lang
                ];
              if (isObject(translation)) {
                return (args: Record<string, any>) => {
                  let result = translation.text;
                  translation.argNames.forEach((argName) => {
                    //@ts-ignore
                    result = result.replace(`{{${argName}}}`, args[argName]);
                  });
                  return result;
                };
              }
              return translation;
            },
          },
        );
      }
    },
  },
) as TranslationHandler;

type BaseTranslation = typeof translations;

type TranslationHandler = {
  [Firstkey in keyof BaseTranslation]: {
    [SecondKey in keyof BaseTranslation[Firstkey]]: BaseTranslation[Firstkey][SecondKey][keyof BaseTranslation[Firstkey][SecondKey]] extends (
      TemplatedTranslationConfig
    ) ?
      (
        opts: Record<
          BaseTranslation[Firstkey][SecondKey][keyof BaseTranslation[Firstkey][SecondKey]]["argNames"][number],
          string | number
        >,
      ) => string
    : string;
  };
};
