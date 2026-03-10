import { DEFAULT_DUMP_OPTS, DEFAULT_RESTORE_OPTS } from "@common/utils";
import { connectionManager } from "@src/index";
import {
  DUMP_OPTIONS_SCHEMA,
  RESTORE_OPTIONS_SCHEMA,
} from "@src/tableConfig/tableConfigBackups";
import { isDefined } from "prostgles-types";
import type { getServerFunctionsContext } from "../getServerFunctionsContext";
import { getDefineAdminFunction } from "./getDefineAdminFunction";

export const getBackupServerFunctions = (
  context: Awaited<ReturnType<typeof getServerFunctionsContext>>,
) => {
  const { defineAdminFunction } = getDefineAdminFunction(context);

  return {
    backupConnections: defineAdminFunction({
      input: {
        connectionNames: { optional: true, type: "string[]" },
        allActive: { optional: true, type: "boolean" },
        name: "string",
      },
      run: async (
        { connectionNames = [], allActive, name },
        { backupManager, dbs },
      ) => {
        const connectionIds =
          allActive ?
            connectionManager.connections
              ?.map((c) => {
                const active = connectionManager.getActiveConnectionSilentFail(
                  c.id,
                );
                if (c.is_state_db || active) {
                  return c.id;
                }
              })
              .filter(isDefined)
          : await dbs.connections.find(
              {
                name: { $in: connectionNames },
              },
              { select: { id: 1 }, returnType: "values" },
            );
        if (!connectionIds?.length) {
          throw "No connection names provided/active";
        }
        if (connectionIds.length !== connectionNames.length && !allActive) {
          throw "Some connection names were not found";
        }
        for (const conId of connectionIds) {
          await backupManager.pgDump(conId, null, {
            name,
            options: DEFAULT_DUMP_OPTS.options,
          });
        }
      },
    }),
    restoreConnections: defineAdminFunction({
      input: {
        backupName: "string",
      },
      run: async ({ backupName }, { backupManager, dbs }) => {
        const backups = await dbs.backups.find({
          name: backupName,
        });
        if (!backups.length) {
          return 0;
        }
        const backupsWithConnectionIds = backups.map(
          ({ id, connection_id }) => {
            if (!connection_id) {
              throw `Backup with id ${id} does not have a connection_id, cannot restore`;
            }
            return { id, connection_id };
          },
        );
        for (const { id, connection_id } of backupsWithConnectionIds) {
          await backupManager.pgRestore(
            { bkpId: id, connId: connection_id },
            undefined,
            DEFAULT_RESTORE_OPTS,
          );
        }
        return backupsWithConnectionIds.length;
      },
    }),
    pgDump: defineAdminFunction({
      input: {
        conId: "string",
        credId: { oneOf: ["number", { enum: [null] }] },
        opts: {
          type: {
            name: { type: "string", optional: true },
            initiator: { type: "string", optional: true },
            options: DUMP_OPTIONS_SCHEMA.jsonbSchema,
          },
        },
      },
      run: ({ conId, credId, opts }, { backupManager }) => {
        return backupManager.pgDump(conId, credId, opts);
      },
    }),
    pgRestore: defineAdminFunction({
      input: {
        bkpId: "string",
        connId: { type: "string", optional: true },
        opts: "any",
      },
      run: async ({ bkpId, opts, connId }, { backupManager }) =>
        backupManager.pgRestore({ bkpId, connId }, undefined, opts),
    }),
    bkpDelete: defineAdminFunction({
      input: {
        bkpId: "string",
        force: { type: "boolean", optional: true },
      },
      run: ({ bkpId, force }, { backupManager }) =>
        backupManager.bkpDelete(bkpId, force),
    }),

    streamBackupFile: defineAdminFunction({
      input: {
        data: {
          oneOfType: [
            {
              type: { enum: ["start"] },
              fileName: "string",
              connectionId: "string",
              sizeBytes: "integer",
              restoreOptions: {
                type: RESTORE_OPTIONS_SCHEMA["jsonbSchemaType"],
              },
            },
            {
              type: { enum: ["chunk"] },
              streamId: "string",
              chunk: "Blob",
            },
            {
              type: { enum: ["end"] },
              streamId: "string",
            },
          ] as const,
        },
      },
      run: async ({ data }, { user, backupManager }) => {
        if (data.type === "start") {
          const stream = backupManager.getTempFileStream(
            data.fileName,
            user.id,
          );
          await backupManager.pgRestoreStream(
            data.fileName,
            data.connectionId,
            stream.stream,
            data.sizeBytes,
            data.restoreOptions,
          );

          return stream.streamId;
        } else if (data.type === "chunk") {
          return new Promise<string>((resolve, reject) => {
            backupManager.pushToStream(data.streamId, data.chunk, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(data.streamId);
              }
            });
          });
        } else {
          backupManager.closeStream(data.streamId);
        }
      },
    }),
  };
};
