import { MANAGED_USER_TYPES, USER_TYPES } from "@common/authTypesAndConstants";
import type { DBS } from "..";
import type { TableSchema } from "prostgles-types";
import type { DBSSchema } from "@common/publishUtils";
import { loadGeneratedWorkspaces } from "../serverFunctions/loadGeneratedWorkspaces/loadGeneratedWorkspaces";
import type { SchemaConfig, SchemaConfigAccessControl } from "../schemaConfig";
import { statePrgl } from "../init/startProstgles";
import { getConfiguredWorkflow } from "../McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/getConfiguredWorkflow";
import { logTimedStep } from "../utils/logTimedStep";

/** Persist configured resources and return workflow sync for the ready connection. */
export const syncSchemaConfigResources = async ({
  dbs,
  databaseId,
  connectionId,
  tables,
  rules = [],
  workspaces = [],
  workflows = {},
  llmCredential,
  userTypes: configuredUserTypes,
}: {
  dbs: DBS;
  databaseId: number;
  connectionId: string;
  tables: TableSchema[];
  rules?: SchemaConfigAccessControl[];
  workspaces?: SchemaConfig["workspaces"];
  workflows?: SchemaConfig["workflows"];
  llmCredential?: SchemaConfig["llmCredential"];
  userTypes?: SchemaConfig["userTypes"];
}) => {
  const userTypes = new Set<string>();
  for (const rule of rules) {
    if (!Array.isArray(rule.userTypes) || !rule.userTypes.length) {
      throw new Error("Each accessControl rule must specify userTypes");
    }
    for (const userType of rule.userTypes) {
      if (userTypes.has(userType)) {
        throw new Error(
          `Multiple accessControl rules for user type: ${userType}`,
        );
      }
      userTypes.add(userType);
    }
  }
  const typeDefinitions = Object.entries(configuredUserTypes ?? {}).map(
    ([id, { description }]) => {
      if (!id.trim() || MANAGED_USER_TYPES.some((type) => type === id)) {
        throw new Error(`Invalid app user type: ${id}`);
      }
      if (!userTypes.has(id)) {
        throw new Error(`App user type requires an accessControl rule: ${id}`);
      }
      return { id: id as DBSSchema["user_types"]["id"], description };
    },
  );
  const sharedNames = new Set(
    rules.flatMap(
      (rule) =>
        rule.dbsPermissions?.viewPublishedWorkspaces?.workspaceNames ?? [],
    ),
  );
  const admin = await dbs.users.findOne(
    { type: USER_TYPES.ADMIN, status: "active" },
    { orderBy: { created: 1 } },
  );
  if (!admin) throw new Error("An admin must own configured resources");
  if (!statePrgl) throw new Error("State database is not ready");
  const { withClientDbTx } = await statePrgl.getClientDBHandlers(
    { userId: admin.id },
    undefined,
  );
  const finishResourceSync = logTimedStep(
    "Synchronizing configured workspaces and access rules",
  );
  await withClientDbTx(async (tx) => {
    if (typeDefinitions.length) {
      await tx.user_types.insertMany(typeDefinitions, {
        onConflict: "DoNothing",
      });
    }
    if (workspaces.length) {
      await loadGeneratedWorkspaces(workspaces, {
        dbs: tx,
        connectionId,
        userId: admin.id,
        tables,
        config: "shared",
      });
    }
    // Detach this connection, preserving rules that are still used by others.
    const removedLinks = await tx.access_control_connections.delete(
      {
        connection_id: connectionId,
        $existsJoined: { access_control: { database_id: databaseId } },
      },
      { returning: { access_control_id: 1 } },
    );
    await tx.access_control.delete({
      id: {
        $in: removedLinks.map(({ access_control_id }) => access_control_id),
      },
      $notExistsJoined: { access_control_connections: {} },
    });
    if (llmCredential) {
      const finishCredentialValidation = logTimedStep(
        "Validating configured LLM credentials (model lookup and test request)",
      );
      const { provider_id: provider, ...credential } = llmCredential;
      /* Credential updates cannot change provider_id, so upsert the provider separately. */
      const providerId =
        typeof provider === "object" && "id" in provider ?
          (
            await tx.llm_providers.insert(provider, {
              onConflict: "DoUpdate",
              returning: { id: 1 },
            })
          ).id
        : provider;
      await tx.llm_credentials.delete({});
      await tx.llm_credentials.insert({
        ...credential,
        provider_id: providerId,
        user_id: admin.id,
      });
      finishCredentialValidation();
    }
    const allowedLLMReferences = rules.flatMap((rule) => rule.allowedLLM ?? []);
    const [sharedWorkspaces, publishedMethods, credentials, prompts] =
      await Promise.all([
        tx.workspaces.find(
          {
            name: { $in: [...sharedNames] },
            connection_id: connectionId,
            published: true,
          },
          { select: { id: 1, name: 1 } },
        ),
        tx.published_methods.find(
          {
            name: { $in: rules.flatMap((rule) => rule.publishedMethods ?? []) },
            connection_id: connectionId,
          },
          { select: { id: 1, name: 1 } },
        ),
        tx.llm_credentials.find(
          {
            name: {
              $in: allowedLLMReferences.map(
                ({ credentialName }) => credentialName,
              ),
            },
          },
          { select: { id: 1, name: 1 } },
        ),
        tx.llm_prompts.find(
          {
            name: {
              $in: allowedLLMReferences.map(({ promptName }) => promptName),
            },
          },
          { select: { id: 1, name: 1 } },
        ),
      ]);
    for (const rule of rules) {
      const { viewPublishedWorkspaces, ...dbsPermissions } =
        rule.dbsPermissions ?? {};
      const workspaceIds = (viewPublishedWorkspaces?.workspaceNames ?? []).map(
        (name) => getNamedId(sharedWorkspaces, "published workspace", name),
      );
      const methods = (rule.publishedMethods ?? []).map((name) => ({
        published_method_id: getNamedId(
          publishedMethods,
          "published function",
          name,
        ),
      }));
      const allowedLLM = (rule.allowedLLM ?? []).map(
        ({ credentialName, promptName }) => ({
          llm_credential_id: getNamedId(
            credentials,
            "LLM credential",
            credentialName,
          ),
          llm_prompt_id: getNamedId(prompts, "LLM prompt", promptName),
        }),
      );
      await tx.access_control.insert({
        database_id: databaseId,
        name: rule.name,
        llm_daily_limit: rule.llm_daily_limit,
        dbPermissions: rule.dbPermissions,
        dbsPermissions:
          rule.dbsPermissions ?
            {
              ...dbsPermissions,
              ...(viewPublishedWorkspaces && {
                viewPublishedWorkspaces: { workspaceIds },
              }),
            }
          : null,
        access_control_connections: [{ connection_id: connectionId }],
        access_control_user_types: rule.userTypes.map((user_type) => ({
          user_type: user_type as DBSSchema["user_types"]["id"],
        })),
        ...(methods.length && { access_control_methods: methods }),
        ...(allowedLLM.length && { access_control_allowed_llm: allowedLLM }),
      });
    }
  });
  finishResourceSync();
  /* Workflow validation needs the registered connection and committed credentials. */
  return async () => {
    const workflowNames = Object.keys(workflows);
    if (!workflowNames.length) return;
    const finishWorkflowSync = logTimedStep(
      `Synchronizing ${workflowNames.length} configured workflows`,
    );
    for (const name of workflowNames) {
      await getConfiguredWorkflow(dbs, connectionId, admin.id, name);
    }
    finishWorkflowSync();
  };
};

const getNamedId = <T extends string | number>(
  rows: { id: T; name: string | null }[],
  resource: string,
  name: string,
): T => {
  const matches = rows.filter((row) => row.name === name);
  if (matches.length !== 1) {
    throw new Error(
      `Expected one ${resource} named "${name}"; found ${matches.length}`,
    );
  }
  return matches[0]!.id;
};
