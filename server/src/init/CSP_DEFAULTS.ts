export const CSP_DEFAULTS = {
  defaultSrc: ["'self'"],
  imgSrc: ["*", "'self'", "data:", "blob:", "https://*.tile.openstreetmap.org"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  scriptSrc: ["'self'"], // localLLMHeaders
  /* data import (papaparse) requires: worker-src blob: 'self' */
  workerSrc: ["'self'", "blob:"],
  frameSrc: [
    "self",
    /** Allow rendering pdf in AskLLM chat */
    "data:",
    "blob:",
  ],
  connectSrc: ["'self'", "ws:", "wss:"],
};
