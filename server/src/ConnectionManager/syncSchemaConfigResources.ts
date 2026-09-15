import type { DBS } from "..";
import { insertConfigWorkspaces } from "../serverFunctions/insertConfigWorkspaces";
import type { SchemaConfig, SchemaConfigAccessControl } from "../schemaConfig";

/** Persist configured workspaces, LLM credentials, and access-control rules. */
export const syncSchemaConfigResources = async ({
  dbs,
  databaseId,
  connectionId,
  rules = [],
  workspaces = [],
  llmCredentials,
}: {
  dbs: DBS;
  databaseId: number;
  connectionId: string;
  rules?: SchemaConfigAccessControl[];
  workspaces?: SchemaConfig["workspaces"];
  llmCredentials?: SchemaConfig["llm_credentials"];
}) => {
  const userTypes = new Set<string>();
  for (const rule of rules) {
    if (!Array.isArray(rule.userTypes) || !rule.userTypes.length) {
      throw new Error("Each access_control rule must specify userTypes");
    }
    for (const userType of rule.userTypes) {
      if (userTypes.has(userType)) {
        throw new Error(
          `Multiple access_control rules for user type: ${userType}`,
        );
      }
      userTypes.add(userType);
    }
  }
  await dbs.tx(async (tx) => {
    const sharedNames = new Set(
      rules.flatMap(
        (rule) =>
          rule.dbsPermissions?.viewPublishedWorkspaces?.workspaceNames ?? [],
      ),
    );
    const publishedWorkspaces = workspaces.filter(({ name }) =>
      sharedNames.has(name),
    );
    if (publishedWorkspaces.length) {
      const admin = await tx.users.findOne(
        { type: "admin" },
        { orderBy: { created: 1 } },
      );
      if (!admin)
        throw new Error("An admin must own published config workspaces");
      await insertConfigWorkspaces(
        connectionId,
        tx,
        admin.id,
        publishedWorkspaces,
      );
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
    if (llmCredentials) {
      const admin = await tx.users.findOne(
        { type: "admin" },
        { orderBy: { created: 1 } },
      );
      if (!admin) {
        throw new Error("An admin must own configured LLM credentials");
      }
      await tx.llm_credentials.delete({});
      if (llmCredentials.length) {
        await tx.llm_credentials.insertMany(
          llmCredentials.map((credential) => ({
            ...credential,
            user_id: admin.id,
          })),
        );
      }
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
          user_type,
        })),
        ...(methods.length && { access_control_methods: methods }),
        ...(allowedLLM.length && { access_control_allowed_llm: allowedLLM }),
      });
    }
  });
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
