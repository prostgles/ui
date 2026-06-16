import { testDBConnection } from "../connectionUtils/testDBConnection";
import type { DBSConnectionInfo } from "../electronConfig";
import { isTesting } from "./utils";

let isCleaningUp = false;
export const cleanupTestDatabases = async (con: DBSConnectionInfo) => {
  if (isCleaningUp) {
    throw new Error(
      "Already cleaning up test databases. This function should not be called multiple times concurrently.",
    );
  }
  isCleaningUp = true;
  if (!isTesting) return;

  await testDBConnection({ ...con, db_name: "postgres" }, false, async (c) => {
    // const existingDbs: { datname: string }[] = await c.any(
    //   "SELECT datname FROM pg_database WHERE datistemplate = false;",
    // );
    const commands = [
      "drop database db; ",
      "drop database cloud; ",
      "drop database crypto; ",
      "drop database sample_database; ",
      "drop database sample_db; ",
      "drop database my_new_db; ",
      "drop database food_delivery; ",
      "drop database db_with_owner;",
      "drop database financial;",
      "drop user db_with_owner;",
      "create database db with owner usr;",
    ];
    // .filter((cmd) => {
    //   return (
    //     !cmd.includes("database") ||
    //     existingDbs.some((dbName) => cmd.includes(`drop database ${dbName}`))
    //   );
    // });
    for (const cmd of commands) {
      await c.result(cmd).catch((e) => {
        console.error(e.message);
        if (e.message.includes("is being accessed by other users")) {
          return Promise.reject(e);
        }
      });
    }
    // await Promise.all(commands.map(async (cmd) => {}));
  });
};
