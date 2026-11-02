import { createTestDeployment } from "../../../server/dist/server/src/testing";
import { DEFAULT_EMAIL_VERIFICATION_TEMPLATE } from "../../../common/OAuthUtils";
import { startMockSMTPServer } from "../mockSMTPServer";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { test, expect } from "../utils/fixtures";
import { setupMagicLinkAuth } from "../utils/utils";
import { createHash } from "node:crypto";

test("login rate limits handle stale sessions and email confirmation", async ({
  request,
  page,
}) => {
  const config = { id: "login-rate-limit-e2e", tableConfig: {} };
  const deployment = await createTestDeployment({
    configPath: createConfigTestProject(config),
    configId: config.id,
    logPath: test.info().outputPath("login-rate-limit-server.log"),
  });
  let smtp: Awaited<ReturnType<typeof startMockSMTPServer>> | undefined;
  try {
    smtp = await startMockSMTPServer({
      port: 0,
      disabledCommands: ["AUTH", "STARTTLS"],
    });
    const admin = await deployment.connectStateAs("admin");
    const loginUrl = `${deployment.endpoint}/auth/login`;
    const getConfirmationUrl = (email: string, code: string) => {
      const url = new URL("/auth/magic-link", deployment.endpoint);
      url.searchParams.set("email", email);
      url.searchParams.set("code", code);
      return url.href;
    };
    const rejectConfirmation = async (email: string, code: string) => {
      const user = await admin.db.users!.findOne({ email });
      if (!user) throw new Error("Test user missing");
      const sessionCount = await admin.db.sessions!.count({ user_id: user.id });
      await admin.sql!("DELETE FROM login_attempts WHERE failed");
      const response = await request.get(getConfirmationUrl(email, code), {
        maxRedirects: 0,
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.headers()["set-cookie"]).toBeUndefined();
      expect(await admin.db.users!.findOne({ id: user.id })).toMatchObject({
        status: user.status,
        registration: user.registration,
      });
      expect(await admin.db.sessions!.count({ user_id: user.id })).toBe(
        sessionCount,
      );
    };
    const checkInvalidConfirmations = async (email: string, code: string) => {
      const user = await admin.db.users!.findOne({ email });
      const registration = user?.registration;
      if (!registration || registration.type === "OAuth") {
        throw new Error("Pending registration missing");
      }
      expect(registration.confirmed_on).toBeNull();
      expect(user.status).toBe("pending");
      await rejectConfirmation(email, "invalid-code");
      await admin.sql!(
        "UPDATE users SET registration = $1::jsonb WHERE email = $2",
        [
          JSON.stringify({
            ...registration,
            expires: "2000-01-01T00:00:00.000Z",
          }),
          email,
        ],
      );
      await rejectConfirmation(email, code);
      await admin.sql!(
        "UPDATE users SET registration = $1::jsonb, status = 'disabled' WHERE email = $2",
        [JSON.stringify(registration), email],
      );
      await rejectConfirmation(email, code);
      await admin.db.users!.update({ email }, { status: "pending" });
      await admin.sql!("DELETE FROM login_attempts WHERE failed");
    };
    const requestWithSession = (sid: string) =>
      request.get(loginUrl, {
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
    expect(await attemptPasswordLogin()).toMatchObject({
      code: "rate-limit-exceeded",
    });

    await admin.sql!("DELETE FROM login_attempts");
    for (let sessionNumber = 0; sessionNumber < 5; sessionNumber++) {
      await requestWithSession(`distinct-session-${sessionNumber}`);
    }
    expect(await attemptPasswordLogin()).toMatchObject({
      code: "rate-limit-exceeded",
    });

    // Reproduce registration after three stale sessions and one failed login.
    await admin.sql!("DELETE FROM login_attempts");
    for (let sessionNumber = 0; sessionNumber < 3; sessionNumber++) {
      expect(
        (
          await requestWithSession(`restored-session-${sessionNumber}`)
        ).status(),
      ).toBe(200);
    }
    const username = "registration@example.com";
    const password = "registration-password";
    const failedLogin = await request.post(loginUrl, {
      data: { username, password },
    });
    expect(await failedLogin.json()).toMatchObject({ code: "no-match" });
    const authProviders = {
      website_url: deployment.endpoint,
      signupMode: "public",
      email: {
        enabled: true,
        emailLoginType: "withPassword",
        smtp: {
          type: "smtp",
          host: "127.0.0.1",
          port: smtp.port,
          user: "",
          pass: "",
        },
        emailTemplate: DEFAULT_EMAIL_VERIFICATION_TEMPLATE,
      },
    } as const;
    await test.step("SMTP configuration validates the former mock hostname instead of bypassing it", async () => {
      await expect(
        admin.db.database_configs!.update(
          {},
          {
            auth_providers: {
              ...authProviders,
              email: {
                ...authProviders.email,
                smtp: {
                  ...authProviders.email.smtp,
                  host: "prostgles-test-mock",
                },
              },
            },
          },
        ),
      ).rejects.toBeTruthy();
    });
    await admin.db.database_configs!.update(
      {},
      { auth_providers: authProviders },
    );

    await page.goto(loginUrl);
    await page.getByTestId("Login.toggle").click();
    await expect(page.locator("#new-password")).toBeVisible();
    await page.locator("#username").fill(username);
    await page.locator("#password").fill(password);
    await page.locator("#new-password").fill(password);
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    const notification = page
      .getByTestId("AuthNotifPopup")
      .getByTestId("Popup.content");
    await expect(notification).toHaveText(
      "Email verification sent. Open the verification url or enter the code to confirm your email",
    );
    await page.getByRole("button", { name: "Ok" }).click();
    const user = await admin.db.users!.findOne({ username });
    if (
      user?.registration?.type !== "password-w-email-confirmation" ||
      user.registration.confirmed_on
    ) {
      throw new Error("Password registration was not created");
    }
    expect(user.status).toBe("pending");
    expect(smtp.getEmails()).toHaveLength(1);
    expect(smtp.getEmails().at(-1)).toContain(`To: ${username}`);
    const confirmationCode = smtp.getLatestCode();
    expect(user.registration.code_hash).toBe(
      createHash("sha256").update(confirmationCode).digest("hex"),
    );
    await test.step("password confirmation rejects invalid, expired and disabled registrations", async () => {
      await checkInvalidConfirmations(username, confirmationCode);
    });
    await test.step("pending password registrations cannot sign in", async () => {
      const response = await request.post(loginUrl, {
        data: { username, password },
      });
      expect(await response.json()).toMatchObject({
        code: "email-not-confirmed",
      });
      expect(await admin.db.sessions!.count({ user_id: user.id })).toBe(0);
    });
    await page.locator("#email-verification-code").fill(confirmationCode);
    await page.getByRole("button", { name: "Confirm email" }).click();
    await expect(notification).toHaveText(
      "Your email has been confirmed. You can now sign in",
    );
    await page.getByRole("button", { name: "OK", exact: true }).click();
    await expect(page).toHaveURL(loginUrl);
    expect((await admin.db.users!.findOne({ username }))?.status).toBe(
      "active",
    );
    expect(
      await admin.db.login_attempts!.findOne({
        auth_type: "registration",
        username,
      }),
    ).toMatchObject({ failed: false });
    const successfulLogin = await request.post(loginUrl, {
      data: { username, password },
      maxRedirects: 0,
    });
    expect(successfulLogin.status()).toBe(302);
    await test.step("password confirmations cannot be replayed", async () => {
      await rejectConfirmation(username, confirmationCode);
      expect(
        (await admin.db.users!.findOne({ username }))?.registration,
      ).toMatchObject({ confirmed_on: expect.any(String) });
      await admin.sql!("DELETE FROM login_attempts");
    });

    await test.step("the SMTP setup delivers magic-link signup emails and OTP sessions use the configured lifetime", async () => {
      if (!smtp) throw new Error("SMTP server has not started");
      await page
        .context()
        .addCookies(deployment.storageStateAs("admin").cookies);
      await page.goto(`${deployment.endpoint}/server-settings`);
      await page.locator('[data-key="auth"]').click();
      await setupMagicLinkAuth(page, smtp.port);
      const magicLinkEmail = "magic-link@example.com";
      const loginResponse = await request.post(loginUrl, {
        data: { username: magicLinkEmail },
      });
      expect(await loginResponse.json()).toMatchObject({
        code: "magic-link-sent",
      });
      await test.step("pending magic-link registrations can request a replacement code", async () => {
        expect(
          (await admin.db.users!.findOne({ username: magicLinkEmail }))?.status,
        ).toBe("pending");
        const resendResponse = await request.post(loginUrl, {
          data: { username: magicLinkEmail },
        });
        expect(await resendResponse.json()).toMatchObject({
          code: "magic-link-sent",
        });
      });
      const magicLinkUser = await admin.db.users!.findOne({
        username: magicLinkEmail,
      });
      if (magicLinkUser?.registration?.type !== "magic-link") {
        throw new Error("Magic-link registration was not created");
      }
      const code = smtp.getLatestCode();
      expect(magicLinkUser.registration.code_hash).toBe(
        createHash("sha256").update(code).digest("hex"),
      );
      expect(smtp.getEmails()).toHaveLength(3);
      expect(smtp.getEmails().at(-1)).toContain(`To: ${magicLinkEmail}`);
      expect(smtp.getEmails().at(-1)).toContain(code);
      const magicLinkUrl = new URL("/auth/magic-link", deployment.endpoint);
      magicLinkUrl.searchParams.set("email", magicLinkEmail);
      magicLinkUrl.searchParams.set("code", code);
      expect(smtp.getEmails().at(-1)).toContain(magicLinkUrl.href);
      await test.step("magic-link confirmation rejects invalid, expired and disabled registrations", async () => {
        await checkInvalidConfirmations(magicLinkEmail, code);
      });
      await test.step("failed OTP session creation preserves the code and records the failed attempt", async () => {
        await admin.sql!("DELETE FROM login_attempts");
        await admin.sql!(
          `ALTER TABLE sessions ADD CONSTRAINT reject_test_session
           CHECK (user_agent <> 'reject-test-session') NOT VALID`,
        );
        try {
          const response = await request.get(magicLinkUrl.href, {
            maxRedirects: 0,
            headers: { "user-agent": "reject-test-session" },
          });
          expect(response.status()).toBeGreaterThanOrEqual(400);
          expect(response.headers()["set-cookie"]).toBeUndefined();
          expect(
            (await admin.db.users!.findOne({ id: magicLinkUser.id }))
              ?.registration,
          ).toEqual(magicLinkUser.registration);
          expect(
            await admin.db.sessions!.count({ user_id: magicLinkUser.id }),
          ).toBe(0);
          expect(await admin.db.login_attempts!.count({ failed: true })).toBe(
            1,
          );
        } finally {
          await admin.sql!(
            "ALTER TABLE sessions DROP CONSTRAINT reject_test_session",
          );
        }
      });
      const signInStartedAt = Date.now();
      const signInResponse = await request.get(magicLinkUrl.href, {
        maxRedirects: 0,
      });
      expect(signInResponse.status()).toBe(302);
      const signInHeaders = signInResponse.headers();
      const sessionCookie = signInHeaders["set-cookie"]?.split(";")[0];
      if (!sessionCookie) throw new Error("Magic-link session cookie missing");
      expect(
        (await admin.db.users!.findOne({ username: magicLinkEmail }))?.status,
      ).toBe("active");
      expect(
        await admin.db.sessions!.count({ user_id: magicLinkUser.id }),
      ).toBe(1);
      expect(await admin.db.login_attempts!.count({ failed: true })).toBe(0);
      const session = await admin.db.sessions!.findOne({
        user_id: magicLinkUser.id,
      });
      const stateConfig = await admin.db.database_configs!.findOne({
        $existsJoined: { connections: { is_state_db: true } },
      });
      if (!stateConfig) throw new Error("State configuration missing");
      const sessionMaxAge = stateConfig.session_max_age_days * 24 * 60 * 60_000;
      expect(Number(session?.expires)).toBeGreaterThanOrEqual(
        signInStartedAt + sessionMaxAge,
      );
      expect(Number(session?.expires)).toBeLessThanOrEqual(
        Date.now() + sessionMaxAge,
      );
      await test.step("active users receive sign-in links without changing registration and concurrent use creates one session", async () => {
        await rejectConfirmation(magicLinkEmail, code);
        await admin.sql!("DELETE FROM login_attempts");
        const resendResponse = await request.post(loginUrl, {
          data: { username: magicLinkEmail },
        });
        expect(await resendResponse.json()).toMatchObject({
          code: "magic-link-sent",
        });
        expect(
          (await admin.db.users!.findOne({ username: magicLinkEmail }))?.status,
        ).toBe("active");
        const existingSessionResponse = await request.get(loginUrl, {
          headers: { cookie: sessionCookie },
          maxRedirects: 0,
        });
        expect(existingSessionResponse.status()).toBe(302);
        expect(existingSessionResponse.headers().location).toBe("/");
        const signInLink = await admin.db.magic_links!.findOne({
          user_id: magicLinkUser.id,
          magic_link_used: null,
        });
        if (!signInLink) throw new Error("Sign-in link missing");
        expect(
          (await admin.db.users!.findOne({ username: magicLinkEmail }))
            ?.registration,
        ).toMatchObject({
          code_hash: createHash("sha256").update(code).digest("hex"),
          confirmed_on: expect.any(String),
        });
        await rejectConfirmation(magicLinkEmail, code);
        await admin.sql!("DELETE FROM login_attempts");
        const responses = await Promise.all(
          Array.from({ length: 2 }, () =>
            request.get(
              `${deployment.endpoint}/auth/magic-link/${signInLink.id}`,
              { maxRedirects: 0 },
            ),
          ),
        );
        expect(
          responses.filter((response) => response.status() === 302),
        ).toHaveLength(1);
        expect(
          responses.filter((response) => response.status() >= 400),
        ).toHaveLength(1);
        expect(
          await admin.db.sessions!.count({ user_id: magicLinkUser.id }),
        ).toBe(2);
        expect(
          (await admin.db.users!.findOne({ username: magicLinkEmail }))
            ?.registration,
        ).toMatchObject({ confirmed_on: expect.any(String) });
      });
    });
    await test.step("OTP requests cannot sign in accounts without an email confirmation flow", async () => {
      for (const registration of [
        null,
        {
          type: "OAuth",
          provider: "google",
          user_id: "oauth-user",
          profile: {},
        },
      ] as const) {
        const email = `${registration?.type ?? "password-only"}@example.com`;
        await admin.sql!(
          `INSERT INTO users (username, email, password, registration)
           VALUES ($1, $1, 'unused-password', $2::jsonb)`,
          [email, registration ? JSON.stringify(registration) : null],
        );
        await rejectConfirmation(email, "123456");
      }
    });
  } finally {
    await Promise.all([deployment.dispose(), smtp?.close()]);
  }
});
