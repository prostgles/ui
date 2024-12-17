import type { TranslationGroup } from "./translations";

export const i18nConnections = {
  Connections: {
    createNewConnection: {
      en: "Create new connection",
      es: "Crear nueva conexión",
    },
    newConnection: {
      en: "New connection",
      es: "Nueva conexión",
    },
  },
} as const satisfies Record<string, TranslationGroup>;
