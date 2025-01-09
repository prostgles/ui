import type e from "express";
import type { InitResult } from "prostgles-server/dist/initProstgles";
import type { SubscriptionHandler } from "prostgles-types";
import type { DBS } from "..";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import { getAuth } from "./getAuth";
import { isEqual } from "prostgles-types";

let globalSettingSub: SubscriptionHandler | undefined;
let auth_providers:
  | DBGeneratedSchema["global_settings"]["columns"]["auth_providers"]
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
    async (_globalSettings) => {
      if (!isEqual(auth_providers, _globalSettings?.auth_providers)) {
        const auth = await getAuth(app, dbs);
        statePrgl.update({ auth: auth as any });
        auth_providers = _globalSettings?.auth_providers;
      }
    },
  );
};
