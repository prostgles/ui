import type { DBS } from "..";
import {
  prostglesServices,
  type ProstglesService,
} from "./ServiceManagerTypes";

export const getSelectedConfigEnvs = async (
  dbs: DBS | undefined,
  serviceName: keyof typeof prostglesServices,
) => {
  const serviceConfig = prostglesServices[serviceName] as ProstglesService;
  const serviceRecord = await dbs?.services.findOne({ name: serviceName });
  let env = serviceConfig.env || {};
  const buildArgs: string[] = [];

  const { configs } = serviceConfig;
  if (configs && serviceRecord?.selected_config_options) {
    for (const [configKey, configValue] of Object.entries(
      serviceRecord.selected_config_options,
    )) {
      const config = configs[configKey];
      if (config) {
        const option = config.options[configValue];
        if (option) {
          env = {
            ...env,
            ...option.env,
          };
          if (option.buildArgs) {
            for (const [buildArgKey, buildArgValue] of Object.entries(
              option.buildArgs,
            )) {
              buildArgs.push(`--build-arg`, `${buildArgKey}=${buildArgValue}`);
            }
          }
        }
      }
    }
  }

  return {
    env,
    buildArgs,
  };
};
