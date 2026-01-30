import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBOFullyTyped } from "prostgles-server";

export const getTemplatedWebAppConnection = async (
  dbo: DBOFullyTyped<DBGeneratedSchema>,
  connectionId: string,
) => {
  const connection = await dbo.connections.findOne({ id: connectionId });
  if (!connection) throw "Connection not found";
  const { web_app_directory, web_app_templated } = connection;
  if (!web_app_directory) {
    throw "No web app directory set for connection";
  }
  if (!web_app_templated) {
    throw "Web app not templated yet";
  }
  return {
    ...connection,
    web_app_directory,
    web_app_templated,
  };
};
