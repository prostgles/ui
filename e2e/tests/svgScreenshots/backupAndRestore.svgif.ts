import { getCommandElemSelector } from "Testing";
import { closeWorkspaceWindows, getDataKey, runDbsSql } from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";

export const backupAndRestoreSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection },
  { addSceneAnimation, addScene },
) => {
  await openConnection("crypto");
  await closeWorkspaceWindows(page);
  await addSceneAnimation(getCommandElemSelector("dashboard.goToConnConfig"));
  await addSceneAnimation(getCommandElemSelector("config.bkp"));

  /** Delete existing */
  const deleteAllBtn = page.getByTestId("BackupControls.DeleteAll");
  if (await deleteAllBtn.count()) {
    await deleteAllBtn.click();
    const codeConfirmation = await page
      .getByTitle("confirmation-code")
      .textContent();

    if (!codeConfirmation) {
      throw new Error("Expected confirmation code to be present");
    }
    const input = page.locator('input[name="confirmation"]');
    await input.fill(codeConfirmation);
    await page.getByTestId("BackupControls.DeleteAll.Confirm").click();
    await page.waitForTimeout(1000);
  }

  /** Add random credentials */
  await runDbsSql(
    page,
    `
        DELETE FROM credentials;
        INSERT INTO credentials (
         --name, 
        type, key_id, key_secret, region, bucket, endpoint_url)
        VALUES 
          (
           -- 'Demo S3 Creds',
            'AWS',
            'AKIAIOSFODNN7EXAMPLE',
            'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            'us-east-1',
            'demo-app-assets',
            DEFAULT
          ), (
           -- 'Demo S3 Creds',
            'Cloudflare',
            '260f4c3d8a1e4ab5b9f7d2e1a9c0f123',
            'b32c9f4c7e8d1a2f9c0b4e6d7a1f2c3e9d4b7a0c1e2f3',
            'auto',
            'demo-app-assets',
            'https://11112222333344445555666677778888.r2.cloudflarestorage.com'
          ) 
      `,
  );
  await addSceneAnimation(getCommandElemSelector("config.bkp.create"));
  const backupName = "Test";

  await addSceneAnimation(getDataKey("Cloud"));
  await addSceneAnimation(
    getCommandElemSelector("CloudStorageCredentialSelector.selectCredential"),
    undefined,
    "fast",
  );
  await addScene({ animations: [{ type: "wait", duration: 1500 }] });
  await page.keyboard.press("Escape");
  await addSceneAnimation(getDataKey("Local"), undefined, "fast");
  await addSceneAnimation(
    getCommandElemSelector("config.bkp.create.name"),
    {
      action: "type",
      text: backupName,
    },
    "fast",
  );
  await addSceneAnimation(
    getCommandElemSelector("config.bkp.create.start"),
    undefined,
    "fast",
  );
  await page
    .getByTestId("BackupControls.DeleteAll")
    .waitFor({ state: "visible", timeout: 20_000 });

  const {
    rows: [existingDemoBackup],
  } = await runDbsSql(
    page,
    "SELECT * FROM backups WHERE name = ${backupName} ",
    { backupName },
  );
  if (!existingDemoBackup) {
    throw new Error("Expected existing backup named " + backupName);
  }

  const logLines = (existingDemoBackup.dump_logs as string).split("\n");
  const totalSize = Number(existingDemoBackup.dbSizeInBytes);
  const originalCreated = existingDemoBackup.created;
  const created = new Date(originalCreated).toISOString();
  const steps = 3;
  const query = `
        UPDATE backups
        SET status = \${status},
            dump_logs = \${dump_logs},
            created = \${created}
        WHERE name = \${backupName}
      `;
  for (const [indexFromEnd] of logLines.slice(-steps).entries()) {
    const index = logLines.length - 1 - indexFromEnd;
    const currentPercentage =
      !indexFromEnd ? 1 : (
        -0.6 + (logLines.length - steps + indexFromEnd + 1) / logLines.length
      );
    await runDbsSql(page, query, {
      dump_logs: logLines.slice(0, index).join("\n"),
      created,
      status: {
        loading: { loaded: currentPercentage * totalSize, total: totalSize },
      },
      backupName,
    });
    await page.waitForTimeout(1500);
    await addScene({ animations: [{ type: "wait", duration: 1500 }] });
  }

  await runDbsSql(page, query, {
    dump_logs: logLines.join("\n"),
    created: originalCreated,
    status: {
      ok: "1",
    },
    backupName,
  });

  await page.mouse.move(0, 0);
  await page.waitForTimeout(1500);
  await addScene();
};
