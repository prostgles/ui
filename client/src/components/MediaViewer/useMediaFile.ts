import { getFileServePath } from "@common/utils";
import { PrglContext } from "@pages/ProjectConnection/PrglContextProvider";
import { useContext } from "react";
import { getApiEndpoint } from "src/dashboard/ConnectionConfig/APIDetails/getApiEndpoint";

export type MediaFileSource =
  | { fileId: string; url?: never }
  | { fileId?: never; url: string | null | undefined };

export const useMediaFile = ({
  url: originalUrl,
  fileId: knownFileId,
}: MediaFileSource) => {
  const prgl = useContext(PrglContext);
  const connection = prgl?.connection;
  const externalFile = {
    url: originalUrl,
    fileId: undefined,
    withCredentials: false,
    openLocalFile: undefined,
  };
  if (!connection) return externalFile;

  const fileUrl =
    knownFileId ?
      getFileServePath({ connectionId: connection.id, fileId: knownFileId })
    : originalUrl;
  if (!fileUrl) return externalFile;

  const apiEndpoint = new URL(getApiEndpoint(connection));
  try {
    const url = new URL(fileUrl, apiEndpoint);
    let fileId = knownFileId;
    if (!fileId) {
      const filePathPrefix =
        getFileServePath({ connectionId: connection.id, fileId: undefined }) +
        "/";
      if (
        url.origin !== apiEndpoint.origin ||
        !url.pathname.startsWith(filePathPrefix)
      ) {
        return externalFile;
      }
      fileId = decodeURIComponent(url.pathname.slice(filePathPrefix.length));
      if (!fileId || fileId.includes("/")) return externalFile;
    }

    return {
      url: url.href,
      fileId,
      withCredentials: true,
      openLocalFile:
        prgl.isElectron ?
          async () => {
            if (!prgl.dbsMethods.openLocalFile) {
              throw new Error("Local file opening is not available");
            }
            return prgl.dbsMethods.openLocalFile({
              connectionId: connection.id,
              fileId,
            });
          }
        : undefined,
    };
  } catch {
    return externalFile;
  }
};
