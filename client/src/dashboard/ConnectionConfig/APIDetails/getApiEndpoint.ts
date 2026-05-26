import type { DBSSchema } from "@common/publishUtils";

export const getApiEndpoint = (connection: DBSSchema["connections"]) => {
  const { protocol, hostname, origin } = window.location;
  const endpoint =
    !connection.port ? origin : `${protocol}//${hostname}:${connection.port}`;
  return endpoint;
};
