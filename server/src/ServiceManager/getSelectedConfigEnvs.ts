import type { ServiceManager } from "./ServiceManager";
import { type ProstglesService } from "./ServiceManagerTypes";

export const getSelectedConfigEnvs = async (
  serviceManager: ServiceManager,
  serviceName: string,
) => {
  const serviceConfig = serviceManager.services[
    serviceName
  ] as ProstglesService;
  const dbs = serviceManager.dbs;
  const serviceRecord = await dbs?.services.findOne({ name: serviceName });
  let env = serviceConfig.env || {};
  const buildArgs: string[] = [];
  let gpus = serviceConfig.gpus;
  const { configs } = serviceConfig;
  if (configs) {
    for (const [configKey, config] of Object.entries(configs)) {
      const selectedConfig =
        serviceRecord?.selected_config_options?.[configKey] ??
        config.defaultOption;
      const option = config.options[selectedConfig];
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
        if ("gpus" in option) {
          gpus = option.gpus;
        }
      }
    }
  }

  return {
    gpus,
    env,
    buildArgs,
  };
};
