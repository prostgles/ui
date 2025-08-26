import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import {
  getJSONBSchemaAsJSONSchema,
  omitKeys,
  type JSONB,
} from "prostgles-types";

export type CreateContainerParams = JSONB.GetSchemaType<
  typeof createContainerSchema
>;

export const createContainerSchema = PROSTGLES_MCP_SERVERS_AND_TOOLS[
  "docker-sandbox"
]["create_container"].schema satisfies JSONB.JSONBSchema;

const createContainerJSONSchema = omitKeys(
  getJSONBSchemaAsJSONSchema("", "", createContainerSchema),
  ["$id", "$schema"],
);
export { createContainerJSONSchema };
