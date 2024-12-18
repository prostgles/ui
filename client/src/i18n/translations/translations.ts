import type { TranslationGroup } from "../i18nUtils";

export const LANGUAGES = [
  { key: "en", label: "English" },
  { key: "es", label: "Español" },
] as const;

export type Language = (typeof LANGUAGES)[number]["key"];

export const translations = {
  common: {
    Language: {},
  },
  Connections: {
    "Create new connection": {},
    "New connection": {},
  },
  APIDetailsTokens: {
    "Access tokens ({{tokenCount}})": {
      argNames: ["tokenCount"],
    },
  },
} as const satisfies Record<string, TranslationGroup>;
