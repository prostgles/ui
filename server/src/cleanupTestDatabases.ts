import { isTesting } from ".";
import { testDBConnection } from "./connectionUtils/testDBConnection";
import type { DBSConnectionInfo } from "./electronConfig";

export const cleanupTestDatabases = async (con: DBSConnectionInfo) => {
  if (!isTesting) return;

  await testDBConnection({ ...con, db_name: "postgres" }, false, async (c) => {
    const existingDbs: { datname: string }[] = await c.any(
      "SELECT datname FROM pg_database WHERE datistemplate = false;",
    );
    const commands = [
      "drop database db; ",
      "drop database cloud; ",
      "drop database crypto; ",
      "drop database sample_database; ",
      "drop database my_new_db; ",
      "drop database db_with_owner;",
      "drop user db_with_owner;",
      "create database db with owner usr;",
    ];
    // .filter((cmd) => {
    //   return (
    //     !cmd.includes("database") ||
    //     existingDbs.some((dbName) => cmd.includes(`drop database ${dbName}`))
    //   );
    // });
    await Promise.all(
      commands.map(async (cmd) => {
        return c.result(cmd).catch(console.error);
      }),
    );
  });
};
