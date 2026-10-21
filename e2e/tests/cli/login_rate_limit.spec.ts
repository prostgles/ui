import { createTestDeployment } from "../../../server/dist/server/src/testing";
import { DEFAULT_EMAIL_VERIFICATION_TEMPLATE, MOCK_SMTP_HOST } from "../../../common/OAuthUtils";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { test, expect } from "../utils/fixtures";

test("login rate limits handle stale sessions and email confirmation", async ({ request, page }) => {
  const config = { id: "login-rate-limit-e2e", tableConfig: {} };
  const deployment = await createTestDeployment({
    configPath: createConfigTestProject(config),
    configId: config.id,
    logPath: test.info().outputPath("login-rate-limit-server.log"),
  });
  try {
    const admin = await deployment.connectStateAs("admin");
    const loginUrl = `${deployment.endpoint}/login`;
    const requestWithSession = (sid: string) => request.get(loginUrl, {
      headers: { cookie: `sid_token=${sid}` },
    });
    const staleSessionId = "session-removed-by-restore";
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => requestWithSession(staleSessionId)),
    );
    for (const response of responses) expect(response.status()).toBe(200);

    // Older backups can already contain concurrent failures for the same SID.
    await admin.sql!(
      `INSERT INTO login_attempts
        (auth_type, sid, failed, ip_address, ip_address_remote, x_real_ip, user_agent)
       SELECT 'session-id', $1, true, '127.0.0.1', '127.0.0.1', '', ''
       FROM generate_series(1, 6)`,
      [staleSessionId],
    );
    expect((await requestWithSession(staleSessionId)).status()).toBe(200);

    const attemptPasswordLogin = async () => {
      const response = await request.post(loginUrl, {
        data: { username: "missing-user", password: "wrong-password" },
      });
      return response.json();
    };
    // One stale SID leaves four attempts; repeated passwords still count separately.
    for (let attempt = 0; attempt < 4; attempt++) {
      expect(await attemptPasswordLogin()).toMatchObject({ code: "no-match" });
    }
    expect(await attemptPasswordLogin()).toMatchObject({ code: "rate-limit-exceeded" });

    await admin.sql!("DELETE FROM login_attempts");
    for (let sessionNumber = 0; sessionNumber < 5; sessionNumber++) {
      await requestWithSession(`distinct-session-${sessionNumber}`);
    }
    expect(await attemptPasswordLogin()).toMatchObject({ code: "rate-limit-exceeded" });

    // Reproduce registration after three stale sessions and one failed login.
    await admin.sql!("DELETE FROM login_attempts");
    for (let sessionNumber = 0; sessionNumber < 3; sessionNumber++) {
      expect((await requestWithSession(`restored-session-${sessionNumber}`)).status()).toBe(200);
    }
    const username = "registration@example.com";
    const password = "registration-password";
    const failedLogin = await request.post(loginUrl, { data: { username, password } });
    expect(await failedLogin.json()).toMatchObject({ code: "no-match" });
    await admin.sql!("UPDATE database_configs SET auth_providers = $1", [JSON.stringify({
      website_url: deployment.endpoint,
      email: {
        enabled: true,
        signupType: "withPassword",
        smtp: { type: "smtp", host: MOCK_SMTP_HOST, port: 25, user: "", pass: "" },
        emailTemplate: DEFAULT_EMAIL_VERIFICATION_TEMPLATE,
      },
    })]);

    await page.goto(loginUrl);
    await page.getByTestId("Login.toggle").click();
    await page.locator("#username").fill(username);
    await page.locator("#password").fill(password);
    await page.locator("#new-password").fill(password);
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    const notification = page.getByTestId("AuthNotifPopup").getByTestId("Popup.content");
    await expect(notification).toHaveText(
      "Email verification sent. Open the verification url or enter the code to confirm your email",
    );
    await page.getByRole("button", { name: "Ok" }).click();
    const user = await admin.db.users!.findOne({ username });
    if (
      user?.registration?.type !== "password-w-email-confirmation" ||
      user.registration.email_confirmation.status !== "pending"
    ) {
      throw new Error("Password registration was not created");
    }
    await page.locator("#email-verification-code").fill(user.registration.email_confirmation.confirmation_code);
    await page.getByRole("button", { name: "Confirm email" }).click();
    await expect(notification).toHaveText("Your email has been confirmed. You can now sign in");
    expect(await admin.db.login_attempts!.findOne({ auth_type: "registration", username }))
      .toMatchObject({ failed: false });
    const successfulLogin = await request.post(loginUrl, {
      data: { username, password }, maxRedirects: 0,
    });
    expect(successfulLogin.status()).toBe(302);
  } finally {
    await deployment.dispose();
  }
});
