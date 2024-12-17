import { i18nCommon } from "./i18nCommon";
import { i18nConnections } from "./i18nConnections";

export const LANGUAGES = [
  { key: "en", label: "English" },
  { key: "es", label: "Español" },
] as const;

export type Language = (typeof LANGUAGES)[number]["key"];

export type TemplatedTranslationConfig = { text: string; argNames: string[] };
export type Translation = Record<Language, string>;
export type TemplatedTranslation = Record<Language, TemplatedTranslationConfig>;

export type TranslationGroup = Record<
  string,
  Translation | TemplatedTranslation
>;

export const translations = {
  ...i18nCommon,
  ...i18nConnections,
  APIDetailsTokens: {
    accessTokenCount: {
      en: { text: "Access tokens ({{tokenCount}})", argNames: ["tokenCount"] },
      es: {
        text: "Tokens de acceso ({{tokenCount}})",
        argNames: ["tokenCount"],
      },
    },
  },
} as const satisfies Record<string, TranslationGroup>;
