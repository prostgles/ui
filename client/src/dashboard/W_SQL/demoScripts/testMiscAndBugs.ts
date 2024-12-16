import { tout } from "../../../pages/ElectronSetup";
import type { DemoScript } from "../getDemoUtils";

export const testMiscAndBugs: DemoScript = async ({
  typeAuto,
  fromBeginning,
  runSQL,
  sqlAction,
  runDbSQL,
  testResult,
  moveCursor,
}) => {
  await runDbSQL(`CREATE EXTENSION IF NOT EXISTS postgis;`);

  fromBeginning();
  await typeAuto("set");
  await typeAuto(" statement");
  await typeAuto(" ");
  await typeAuto(" ");
  await tout(1200);
  testResult("SET statement_timeout TO '0ms'");

  fromBeginning();
  await typeAuto("va");
  await typeAuto(" ");
  await typeAuto(" ");
  await moveCursor.right();
  await typeAuto(" pg_ag");
  await tout(1200);
  testResult("VACUUM ( FULL) pg_catalog.pg_aggregate");

  const notificationText = "hello from the other side";
  const checkText = async () => {
    await tout(1e3);
    if (!document.body.innerText.includes(notificationText)) {
      alert("Notification not received");
    }
  };
  /** Test Notify */
  fromBeginning();
  await typeAuto(`LISTEN mychannel`, {
    nth: -1,
    msPerChar: 10,
    triggerMode: "off",
  });
  await runSQL();

  await runDbSQL(`NOTIFY mychannel, '${notificationText}'`);
  await checkText();
  await sqlAction("stop-listen");

  /** test One Packet Bug */
  fromBeginning();
  await typeAuto(`SELECT pg_sleep(1), '${notificationText}' as a`, {
    nth: -1,
    msPerChar: 10,
    triggerMode: "off",
  });
  await runSQL();
  await checkText();
};
