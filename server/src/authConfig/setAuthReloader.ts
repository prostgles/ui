import e from "express";
import { InitResult } from "prostgles-server/dist/initProstgles";
import { SubscriptionHandler } from "prostgles-types";
import { isDeepStrictEqual } from "util";
import { DBS } from "..";
import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import { getAuth } from "./authConfig";

let globalSettingSub: SubscriptionHandler | undefined;
let auth_providers: DBSchemaGenerated["global_settings"]["columns"]["auth_providers"] | undefined;
export const setAuthReloader = async (app: e.Express, db: DBS, statePrgl: InitResult) => {
  await globalSettingSub?.unsubscribe();
  globalSettingSub = await db.global_settings.subscribeOne({}, {}, _globalSettings => {
    if(!isDeepStrictEqual(auth_providers, _globalSettings?.auth_providers)){
      const auth = getAuth(app, _globalSettings);
      statePrgl?.update({ auth: auth as any });
      auth_providers = _globalSettings?.auth_providers;
    }
  });
}