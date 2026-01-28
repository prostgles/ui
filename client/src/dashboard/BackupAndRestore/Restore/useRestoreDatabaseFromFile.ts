import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { RestoreOpts } from "./Restore";
import { useCallback } from "react";

export const useRestoreDatabaseFromFile = ({
  connectionId,
  restoreOpts,
}: {
  connectionId: string;
  restoreOpts: RestoreOpts;
}) => {
  const {
    dbsMethods: { streamBackupFile },
  } = usePrgl();

  const restoreFile = useCallback(
    async (file: File) => {
      if (!streamBackupFile) {
        throw new Error("streamBackupFile method not available");
      }

      const stream = file.stream();
      const streamId = await streamBackupFile({
        data: {
          type: "start",
          fileName: file.name,
          connectionId: connectionId,
          sizeBytes: file.size,
          restoreOptions: restoreOpts,
        },
      });
      if (!streamId) {
        throw new Error("No streamId received from server");
      }

      const writableStream = new WritableStream({
        start(controller) {},
        async write(chunk, controller) {
          try {
            await streamBackupFile({
              data: {
                type: "chunk",
                streamId,
                chunk,
              },
            });
          } catch (err) {
            console.error(err);
            controller.error(err);
            void writableStream.abort(err);
          }
        },
        async close() {
          await (async () => {
            await streamBackupFile({ data: { type: "end", streamId } });
          })();
        },
        abort(reason) {
          console.error("[abort]", reason);
        },
      });
      void stream.pipeTo(writableStream);
    },
    [connectionId, restoreOpts, streamBackupFile],
  );

  return { restoreFile };
};
