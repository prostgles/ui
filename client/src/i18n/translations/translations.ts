import type { TranslationGroup } from "../i18nUtils";

export const LANGUAGES = [
  { key: "en", label: "English" },
  { key: "es", label: "Español" },
] as const;

export type Language = (typeof LANGUAGES)[number]["key"];

export const translations = {
  common: {
    Language: {
      es: "Idioma",
    },
  },
  Connections: {
    "Create new connection": {
      es: "Crear nueva conexión",
    },
    "New connection": {
      es: "Nueva conexión",
    },
  },
  APIDetailsTokens: {
    "Access tokens ({{tokenCount}})": {
      argNames: ["tokenCount"],
      es: "Tokens de acceso ({{tokenCount}})",
    },
  },
} as const satisfies Record<string, TranslationGroup>;
