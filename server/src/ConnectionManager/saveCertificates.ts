import * as fs from "fs";
import path from "path";
import { getRootDir } from "../electronConfig";
import type { Connections } from "..";
import type { ConnectionManager } from "./ConnectionManager";
import type { EnvVars } from "../BackupManager/pipeFromCommand";

export const saveCertificates = (connections: Connections[]) => {
  connections.forEach((c) => {
    const hasCerts =
      c.ssl_certificate ||
      c.ssl_client_certificate_key ||
      c.ssl_client_certificate;
    if (hasCerts) {
      const folder = getCertPath(c.id);
      try {
        fs.rmSync(folder, { recursive: true });
        fs.mkdirSync(folder, { recursive: true, mode: 0o600 });
        const utfOpts: fs.WriteFileOptions = {
          encoding: "utf-8",
          mode: 0o600,
        }; //
        if (c.ssl_certificate) {
          fs.writeFileSync(getCertPath(c.id, "ca"), c.ssl_certificate, utfOpts);
        }
        if (c.ssl_client_certificate) {
          fs.writeFileSync(
            getCertPath(c.id, "cert"),
            c.ssl_client_certificate,
            utfOpts,
          );
        }
        if (c.ssl_client_certificate_key) {
          fs.writeFileSync(
            getCertPath(c.id, "key"),
            c.ssl_client_certificate_key,
            utfOpts,
          );
        }
      } catch (err) {
        console.error("Failed writing ssl certificates:", err);
      }
    }
  });
};
const PROSTGLES_CERTS_FOLDER = "prostgles_certificates";

const getCertPath = (conId: string, type?: "ca" | "cert" | "key") => {
  return path.resolve(
    `${getRootDir()}/${PROSTGLES_CERTS_FOLDER}/${conId}` +
      (type ? `/${type}.pem` : ""),
  );
};

export function getSSLEnvVars(c: Connections): EnvVars {
  const result: Record<string, string> = {};
  if ((c as any).db_ssl) {
    result.PGSSLMODE = c.db_ssl;
  }
  if (c.db_pass) {
    result.PGPASSWORD = c.db_pass;
  }
  if (c.ssl_client_certificate) {
    result.PGSSLCERT = getCertPath(c.id, "cert");
  }
  if (c.ssl_client_certificate_key) {
    result.PGSSLKEY = getCertPath(c.id, "key");
  }
  if (c.ssl_certificate) {
    result.PGSSLROOTCERT = getCertPath(c.id, "ca");
  }

  return result;
}
