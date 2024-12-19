import type e from "express";
import type { InitResult } from "prostgles-server/dist/initProstgles";
import type { SubscriptionHandler } from "prostgles-types";
import { isDeepStrictEqual } from "util";
import type { DBS } from "..";
import type { DBGeneratedSchema as DBSchemaGenerated } from "../../../commonTypes/DBGeneratedSchema";
import { getAuth } from "./authConfig";

let globalSettingSub: SubscriptionHandler | undefined;
let auth_providers:
  | DBSchemaGenerated["global_settings"]["columns"]["auth_providers"]
  | undefined;
export const setAuthReloader = async (
  app: e.Express,
  dbs: DBS,
  statePrgl: InitResult,
) => {
  await globalSettingSub?.unsubscribe();
  globalSettingSub = await dbs.global_settings.subscribeOne(
    {},
    {},
    (_globalSettings) => {
      if (!isDeepStrictEqual(auth_providers, _globalSettings?.auth_providers)) {
        const auth = getAuth(app, dbs, _globalSettings);
        statePrgl.update({ auth: auth as any });
        auth_providers = _globalSettings?.auth_providers;
      }
    },
  );
};
