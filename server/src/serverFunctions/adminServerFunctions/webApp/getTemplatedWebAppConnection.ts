import type { DBSClient } from "@src/index";

export const getTemplatedWebAppConnection = async (
  dbo: DBSClient,
  connectionId: string,
  allowNonTemplated = false,
) => {
  const connection = await dbo.connections.findOne({ id: connectionId });
  if (!connection) throw "Connection not found";
  const { web_app_directory, web_app_templated } = connection;
  if (!web_app_directory) {
    throw "No web app directory set for connection";
  }
  if (!allowNonTemplated && !web_app_templated) {
    throw "Web app not templated yet";
  }
  return {
    ...connection,
    web_app_directory,
    web_app_templated,
  };
};
