import { getEntries } from "../../../commonTypes/utils";
import { getLanguage } from "./LanguageSelector";
import { type Language, translations } from "./translations/translations";
import es from "./translations/es.json";
import de from "./translations/de.json";
import zh from "./translations/zh.json";
import hi from "./translations/hi.json";
import ru from "./translations/ru.json";
import { isObject } from "../../../commonTypes/publishUtils";
import { isPlaywrightTest } from "../pages/ProjectConnection/useProjectDb";

type TranslationsType<T> = {
  [K1 in keyof T]: {
    [K2 in keyof T[K1]]: string;
  };
};

type TranslationFile = TranslationsType<typeof translations>;

const translationFiles: Record<LanguageWithoutEn, TranslationFile> = {
  //@ts-ignore
  es,
  //@ts-ignore
  de,
  zh,
  //@ts-ignore
  ru,
  //@ts-ignore
  hi,
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
      translationKey: string,
      translation: Translation,
      lang: string,
    ) => {
      let argNames: string[] | undefined;
      let text = translationKey;
      if (isObject(translation) && Array.isArray(translation.argNames)) {
        ({ argNames, text } = translation);
        argNames.forEach((argName) => {
          if (!text.includes(`{{${argName}}}`)) {
            console.log(componentTranslations);
            throw new Error(
              `${lang} Translation "${componentName}.${text}" has invalid argName: ${argName}`,
            );
          }
        });
      }
      const textArgCount = text.split("{{").length - 1;
      if (textArgCount !== (argNames?.length ?? 0)) {
        throw new Error(
          `${lang} Translation "${componentName}.${translationKey}" has incorrect number of argNames`,
        );
      }
    };
    getEntries(componentTranslations).forEach(
      ([_enTranslationKey, translation]) => {
        const tr = translation as Translation;
        // checkArgs(_enTranslationKey as string, argNamesOrText, "en");
        getEntries(translationFiles).forEach(([lang, _translation]) => {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          const v = _translation[componentName]?.[_enTranslationKey];
          checkArgs(_enTranslationKey, tr, lang);
        });
      },
    );
  });
};

export const t = new Proxy(
  {},
  {
    get: (_, firstKey: string) => {
      if (firstKey in translations) {
        return new Proxy(
          {},
          {
            get(_, secondKey: string) {
              const lang = getLanguage();
              const engTranslation = (translations[
                firstKey as keyof typeof translations
              ][secondKey] ?? secondKey) as Translation;
              const translation: Translation | string =
                lang === "en" ? engTranslation : (
                  /** This is needed during dev when keys are missing */
                  ((translationFiles as any)?.[lang]?.[firstKey]?.[secondKey] ??
                  secondKey + "?")
                );

              if (lang === "en" && !engTranslation) {
                console.warn(
                  `Missing translation for ${firstKey}.${secondKey}`,
                );
              }
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

if (isPlaywrightTest) {
  try {
    validateTranslationFiles();
  } catch (e) {
    console.error(e);
    throw new Error("Failed to validate translation files");
  }
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
  // console.log("en.json", JSON.stringify(enFile));
}
