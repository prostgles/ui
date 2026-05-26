import {
  GOOGLE_FAVICON_ENDPOINT,
  GOOGLE_FAVICON_ENDPOINT_REDIRECT,
} from "@common/mcp/web.mcp.schema";

const GOOGLE_FAVICON_ENDPOINTS = [
  GOOGLE_FAVICON_ENDPOINT,
  GOOGLE_FAVICON_ENDPOINT_REDIRECT,
];

const SELF = "'self'";
export const CSP_DEFAULTS = {
  defaultSrc: [SELF],
  imgSrc: [
    SELF,
    "data:", // required for AskLLM Spinner
    "blob:",
    "https://vector.openstreetmap.org",
    "https://*.tile.openstreetmap.org",
    ...GOOGLE_FAVICON_ENDPOINTS,
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
