const SELF = "'self'";
export const CSP_DEFAULTS = {
  defaultSrc: [SELF],
  imgSrc: [
    SELF,
    "data:",
    "blob:",
    "https://vector.openstreetmap.org",
    "https://*.tile.openstreetmap.org",
  ],
  styleSrc: [SELF, "'unsafe-inline'"],
  scriptSrc: [SELF], // localLLMHeaders
  /* data import (papaparse) requires: worker-src blob: 'self' */
  workerSrc: [SELF, "blob:"],
  frameSrc: [
    SELF,
    /** Allow rendering pdf in AskLLM chat */
    "data:",
    "blob:",
  ],
  connectSrc: [
    SELF,
    "data:" /** Used by deckgl icon render */,
    "ws:",
    "wss:",
    "https://vector.openstreetmap.org",
    "https://*.tile.openstreetmap.org",
  ],
};
