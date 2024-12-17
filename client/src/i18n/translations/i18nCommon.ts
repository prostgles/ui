import type { TranslationGroup } from "./translations";

export const i18nCommon = {
  common: {
    language: {
      en: "Language",
      es: "Idioma",
    },
  },
} as const satisfies Record<string, TranslationGroup>;
