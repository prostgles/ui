import { generate } from "otplib";
import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { getPasswordHash } from "../../../server/dist/server/src/authConfig/authUtils";
import prostgles from "../../../server/node_modules/prostgles-client";
import type {
  DBGeneratedSchema,
  GeneratedFunctionSchema,
} from "../../../common/DBGeneratedSchema";
import { createTestDeployment } from "../../../server/dist/server/src/testing";
import { DEFAULT_EMAIL_VERIFICATION_TEMPLATE } from "../../../common/OAuthUtils";
import type { SchemaConfig } from "../../../server/dist/server/src/schemaConfig";
import type { DBSSchema } from "../../../common/publishUtils";
import { startMockSMTPServer } from "../mockSMTPServer";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { test, expect } from "../utils/fixtures";

test("user invitations confirm email, enforce roles independently of connection access, and support later sign-ins", async ({
  browser,
  request,
}) => {
  const emails: { recipient: string; message: string }[] = [];
  const smtp = await startMockSMTPServer({
    port: 0,
    disabledCommands: ["AUTH", "STARTTLS"],
    onEmail: (email, callback) => {
      if (email.recipient === "delivery-failure@example.com") {
        callback(new Error("Simulated delivery failure"));
        return;
      }
      emails.push(email);
      callback();
    },
  });
  let deployment: Awaited<ReturnType<typeof createTestDeployment>> | undefined;
  try {
    const readerType = "invite_reader" as DBSSchema["user_types"]["id"];
    const sqlType = "invite_sql" as DBSSchema["user_types"]["id"];
    const noAccessType = "invite_no_access" as DBSSchema["user_types"]["id"];
    const config = {
      id: "user-invites-e2e",
      userTypes: {
        [readerType]: { description: "Read records" },
        [sqlType]: { description: "Run SQL" },
      },
      tableConfig: {
        records: { columns: { id: "serial PRIMARY KEY", value: "text" } },
      },
      accessControl: [
        {
          userTypes: [readerType],
          dbsPermissions: { createWorkspaces: true },
          dbPermissions: {
            type: "All views/tables",
            allowAllTables: ["select"],
          },
        },
        {
          userTypes: [sqlType],
          dbPermissions: { type: "Run SQL", allowSQL: true },
        },
      ],
    } satisfies SchemaConfig;
    const configPath = createConfigTestProject(config);
    /* Mock only the external OAuth exchange; exercise the app's real callback. */
    appendFileSync(
      join(configPath, "index.js"),
      `
      require("oauth").OAuth2.prototype.getOAuthAccessToken = (code, params, done) =>
        done(null, code, "test-refresh-token", {});
      require("passport-github2").Strategy.prototype.userProfile = (accessToken, done) =>
        done(null, { id: accessToken, displayName: "OAuth test user", emails: [] });
    `,
    );
    deployment = await createTestDeployment({
      configPath,
      configId: config.id,
      users: [
        { key: "admin", type: "admin" },
        { key: "owner", type: "connection_admin" },
        { key: "reader", type: readerType },
      ],
      logPath: test.info().outputPath("user-invites-server.log"),
    });
    const admin = await deployment.connectStateAs("admin");
    await admin.db.user_types!.insert({
      id: noAccessType,
      description: "No access rules",
    });
    const owner = await deployment.connectStateAs("owner");
    const reader = await deployment.connectStateAs("reader");
    const [connection] = await owner.db.connections!.find();
    const stateConnection = await admin.db.connections!.findOne({
      is_state_db: true,
    });
    if (!connection || !stateConnection) {
      throw new Error("Missing test connections");
    }
    const stateConfig = await admin.db.database_configs!.findOne({
      $existsJoined: { connections: { id: stateConnection.id } },
    });
    if (!stateConfig) throw new Error("State configuration missing");
    const inviteUser = admin.methods?.inviteUser;
    const inviteAsOwner = owner.methods?.inviteUser;
    if (!inviteUser || !inviteAsOwner) {
      throw new Error("Invitation function missing");
    }
    expect(admin.methodSchema?.inviteUser?.function_options).toMatchObject({
      title: "Invite user",
      action: { defaultValue: { text: "Send invitation" } },
      renderOutputAsMarkdown: true,
    });
    const endpoint = deployment.endpoint;
    const invite = (email: string) =>
      inviteUser({ email, userType: readerType });
    const getUser = (email: string) => admin.db.users!.findOne({ email });
    const setAllowInvites = (allowInvites: boolean) =>
      admin.sql!(
        "UPDATE database_configs SET auth_providers = jsonb_set(auth_providers, '{email,allowInvites}', $1::jsonb) WHERE id = $2",
        [JSON.stringify(allowInvites), stateConfig.id],
      );
    const getEmailUrl = (email: string) => {
      const sent = emails.filter(({ recipient }) => recipient === email).at(-1);
      const message = sent?.message
        .replace(/=\r?\n/g, "")
        .replaceAll("=3D", "=");
      const url = message?.match(/http:\/\/[^\s<>"]+/)?.[0];
      if (!url) throw new Error(`Invitation email missing for ${email}`);
      return url;
    };
    const rejectLink = async (url: string) => {
      await admin.sql!("DELETE FROM login_attempts");
      const response = await request.get(url, { maxRedirects: 0 });
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.headers()["set-cookie"]).toBeUndefined();
    };
    await admin.sql!(
      "UPDATE database_configs SET auth_providers = $1 WHERE id = $2",
      [
        JSON.stringify({
          website_url: endpoint,
          signupMode: "invitationOnly",
          email: {
            enabled: true,
            emailLoginType: "withMagicLink",
            smtp: {
              type: "smtp",
              host: "127.0.0.1",
              port: smtp.port,
              user: "",
              pass: "",
            },
            emailTemplate: DEFAULT_EMAIL_VERIFICATION_TEMPLATE,
          },
        }),
        stateConfig.id,
      ],
    );

    await test.step("invitations default to disabled and can be enabled independently of public signup", async () => {
      await expect(
        invite("disabled-invites@example.com"),
      ).rejects.toMatchObject({
        message: "Invitations are disabled",
      });
      expect(await getUser("disabled-invites@example.com")).toBeFalsy();
      expect(emails).toHaveLength(0);

      const adminContext = await browser.newContext({
        storageState: deployment!.storageStateAs("admin"),
      });
      const page = await adminContext.newPage();
      const emailSettings = page.getByTestId("EmailAuthSetup");
      const openEmailSettings = async () => {
        await page.goto(`${endpoint}/server-settings`);
        await page.locator('[data-key="auth"]').click();
        await emailSettings
          .getByRole("button", { name: "Email authentication", exact: true })
          .click();
      };
      await openEmailSettings();
      const allowInvitesToggle = page.getByTestId(
        "EmailAuthSetup.allowInvites",
      );
      await expect(allowInvitesToggle).toHaveAttribute("aria-checked", "false");
      await allowInvitesToggle.click();
      for (const emailLoginType of ["withPassword", "withMagicLink"]) {
        await page.getByTestId("EmailAuthSetup.SignupType").click();
        await page.locator(`[data-key="${emailLoginType}"]`).click();
        await expect(allowInvitesToggle).toHaveAttribute(
          "aria-checked",
          "true",
        );
        await emailSettings
          .getByRole("button", { name: "Save", exact: true })
          .click();
        await expect
          .poll(
            async () =>
              (await admin.db.database_configs!.findOne({ id: stateConfig.id }))
                ?.auth_providers?.email,
          )
          .toMatchObject({ enabled: true, allowInvites: true, emailLoginType });
        await openEmailSettings();
        await expect(allowInvitesToggle).toHaveAttribute(
          "aria-checked",
          "true",
        );
        await expect(
          page.getByTestId("EmailSMTPAndTemplateSetup"),
        ).toContainText("Configured");
      }
      await adminContext.close();
    });

    await test.step("signup policy blocks new OAuth accounts while existing accounts retain normal login", async () => {
      await admin.sql!(
        "UPDATE database_configs SET auth_providers = auth_providers || $1::jsonb WHERE id = $2",
        [
          JSON.stringify({
            signupMode: "public",
            github: {
              enabled: true,
              clientID: "test-client",
              clientSecret: "test-secret",
            },
          }),
          stateConfig.id,
        ],
      );
      const oauthLogin = (code: string) =>
        request.get(`${endpoint}/auth/oauth/github/callback?code=${code}`, {
          maxRedirects: 0,
        });
      await expect
        .poll(async () => {
          await oauthLogin("existing-oauth-user");
          return admin.db.users!.findOne({
            username: "github-existing-oauth-user",
          });
        })
        .toMatchObject({ status: "active" });
      const oauthUser = await admin.db.users!.findOne({
        username: "github-existing-oauth-user",
      });
      if (!oauthUser) throw new Error("OAuth user missing");
      await admin.sql!(
        "UPDATE database_configs SET auth_providers = jsonb_set(auth_providers, '{signupMode}', '\"invitationOnly\"'::jsonb) WHERE id = $1",
        [stateConfig.id],
      );
      const adminContext = await browser.newContext({
        storageState: deployment!.storageStateAs("admin"),
      });
      const page = await adminContext.newPage();
      await page.goto(`${endpoint}/server-settings`);
      await page.locator('[data-key="auth"]').click();
      await expect(
        page.getByTestId("AuthProviderSetup.signupMode"),
      ).toContainText("Invitation only");
      await adminContext.close();
      await admin.sql!("DELETE FROM login_attempts");
      const rejectedLogin = await oauthLogin("uninvited-oauth-user");
      expect(await rejectedLogin.json()).toMatchObject({
        success: false,
        code: "no-match",
      });
      expect(
        await admin.db.users!.findOne({
          username: "github-uninvited-oauth-user",
        }),
      ).toBeFalsy();
      expect((await oauthLogin("existing-oauth-user")).status()).toBe(302);
      await admin.db.users!.update(
        { id: oauthUser.id },
        { status: "disabled" },
      );
      expect(
        await (await oauthLogin("existing-oauth-user")).json(),
      ).toMatchObject({ code: "inactive-account" });
      await admin.sql!("DELETE FROM login_attempts");
    });

    await test.step("only authorized inviters can assign allowed user types", async () => {
      expect(reader.methods?.inviteUser).toBeUndefined();
      for (const userType of ["admin", "public", "missing-type"]) {
        await expect(
          inviteUser({
            email: "forbidden@example.com",
            userType,
          }),
        ).rejects.toBeTruthy();
      }
      await expect(
        inviteAsOwner({
          email: "sql@example.com",
          userType: sqlType,
        }),
      ).rejects.toBeTruthy();
      await expect(invite("invalid-email")).rejects.toBeTruthy();
      await expect(invite("delivery-failure@example.com")).rejects.toBeTruthy();
      expect(await getUser("delivery-failure@example.com")).toBeFalsy();
      await admin.db.users!.insert({
        username: "Existing",
        email: "Existing@Example.com",
        password: "test-password",
        type: readerType,
      });
      await expect(invite("existing@example.com")).rejects.toBeTruthy();
      expect(emails).toHaveLength(0);
    });

    const email = "invited@example.com";
    const noAccessEmail = "no-access@example.com";

    await test.step("the Users form sends a pending invite while public signup remains disabled", async () => {
      const adminContext = await browser.newContext({
        storageState: deployment!.storageStateAs("admin"),
      });
      const page = await adminContext.newPage();
      for (const invitation of [
        { email, userType: readerType },
        { email: noAccessEmail, userType: noAccessType },
      ]) {
        await page.goto(`${endpoint}/users`);
        await page
          .getByRole("button", { name: "Invite user", exact: true })
          .click();
        const form = page.getByTestId("ActionPopup");
        await expect(form).toHaveAccessibleName("Invite user");
        const sendInvitation = form.getByRole("button", {
          name: "Send invitation",
          exact: true,
        });
        await sendInvitation.click();
        await expect(form.getByText("Required", { exact: true })).toHaveCount(
          2,
        );
        await expect(sendInvitation).toBeDisabled();
        await form
          .getByLabel("email", { exact: true })
          .fill(invitation.email.toUpperCase());
        await expect(page.getByText("Connection", { exact: true })).toHaveCount(
          0,
        );
        const userTypeInput = form.getByLabel("User type", { exact: true });
        await userTypeInput.click();
        const userTypeOptions = page.getByRole("option");
        await expect(userTypeOptions).not.toHaveCount(0);
        for (const forbiddenType of ["admin", "public"]) {
          await userTypeInput.fill(forbiddenType);
          await expect(userTypeOptions).toHaveCount(
            forbiddenType === "admin" ? 1 : 0,
          );
          await expect(
            page.getByRole("option", { name: forbiddenType, exact: true }),
          ).toHaveCount(0);
        }
        for (const allowedType of [
          "default",
          "connection_admin",
          noAccessType,
        ]) {
          await userTypeInput.fill(allowedType);
          await expect(
            page.getByRole("option", { name: allowedType, exact: true }),
          ).toBeVisible();
        }
        await userTypeInput.fill(invitation.userType);
        await page
          .getByRole("option", { name: invitation.userType, exact: true })
          .click();
        if (invitation.email === email) {
          await form.getByLabel("email", { exact: true }).fill("invalid-email");
          await sendInvitation.click();
          await expect(
            form.getByText("Enter a valid email address"),
          ).toBeVisible();
          await form
            .getByLabel("email", { exact: true })
            .fill(invitation.email.toUpperCase());
        }
        await sendInvitation.click();
        await expect(form.getByRole("status")).toHaveText(
          `Invitation sent to ${invitation.email}. They can sign in after confirming their email.`,
        );
        await expect(sendInvitation).toHaveCount(0);
        await expect(form.getByLabel("email", { exact: true })).toHaveCount(0);
        await form
          .getByTestId("Popup.footer")
          .getByRole("button", { name: "Close", exact: true })
          .click();
      }
      await adminContext.close();
      const user = await getUser(email);
      expect(user).toMatchObject({
        status: "pending",
        type: readerType,
        registration: {
          type: "invite",
          confirmed_on: null,
        },
      });
      expect(await admin.db.sessions!.count({ user_id: user!.id })).toBe(0);
      const token = new URL(getEmailUrl(email)).searchParams.get("code");
      if (!token) throw new Error("Invitation code missing");
      expect(user?.registration).toHaveProperty(
        "code_hash",
        createHash("sha256").update(token).digest("hex"),
      );
      const wrongLink = new URL(getEmailUrl(email));
      wrongLink.searchParams.set("code", "invalid-token");
      await rejectLink(wrongLink.href);
      expect((await getUser(email))?.status).toBe("pending");
    });

    await test.step("disabling invitations blocks new invites and pending resends without changing the pending account", async () => {
      await setAllowInvites(false);
      await expect
        .poll(async () => {
          const response = await request.post(`${endpoint}/auth/login`, {
            data: { username: email },
          });
          return response.json();
        })
        .toMatchObject({ success: false, code: "server-error" });

      const pendingUser = await getUser(email);
      const emailCount = emails.length;
      for (const recipient of [email, "disabled-invites@example.com"]) {
        await expect(invite(recipient)).rejects.toMatchObject({
          message: "Invitations are disabled",
        });
      }
      const response = await request.post(`${endpoint}/auth/login`, {
        data: { username: email },
      });
      expect(await response.json()).toMatchObject({ success: false });
      expect(emails).toHaveLength(emailCount);
      expect(await getUser(email)).toEqual(pendingUser);
      expect(await getUser("disabled-invites@example.com")).toBeFalsy();
      await setAllowInvites(true);
      await admin.sql!("DELETE FROM login_attempts");
    });

    await test.step("disabled email authentication blocks new invitations and resends for both login methods", async () => {
      const previousEmailConfig = (
        await admin.db.database_configs!.findOne({ id: stateConfig.id })
      )?.auth_providers?.email;
      if (!previousEmailConfig) throw new Error("Email configuration missing");
      const pendingUser = await getUser(email);
      const emailCount = emails.length;
      for (const emailLoginType of ["withPassword", "withMagicLink"]) {
        await admin.sql!(
          "UPDATE database_configs SET auth_providers = jsonb_set(auth_providers, '{email}', $1::jsonb) WHERE id = $2",
          [
            JSON.stringify({
              ...previousEmailConfig,
              enabled: false,
              emailLoginType,
            }),
            stateConfig.id,
          ],
        );
        for (const recipient of [email, "disabled-email@example.com"]) {
          await expect(invite(recipient)).rejects.toMatchObject({
            message: "Invitations are disabled",
          });
        }
      }
      expect(emails).toHaveLength(emailCount);
      expect(await getUser(email)).toEqual(pendingUser);
      expect(await getUser("disabled-email@example.com")).toBeFalsy();
      await admin.sql!(
        "UPDATE database_configs SET auth_providers = jsonb_set(auth_providers, '{email}', $1::jsonb) WHERE id = $2",
        [JSON.stringify(previousEmailConfig), stateConfig.id],
      );
    });

    await test.step("pending users require an email and unconfirmed email registration", async () => {
      const pendingUser = await getUser(email);
      if (pendingUser?.registration?.type !== "invite") {
        throw new Error("Pending invitation missing");
      }
      for (const invalidState of [
        { email: null, registration: pendingUser.registration },
        { email, registration: null },
        {
          email,
          registration: {
            type: "OAuth",
            provider: "google",
            user_id: "pending-oauth",
            profile: {},
          },
        },
        {
          email,
          registration: {
            ...pendingUser.registration,
            confirmed_on: new Date().toISOString(),
          },
        },
      ]) {
        await expect(
          admin.sql!(
            "UPDATE users SET email = $1, registration = $2 WHERE id = $3",
            [
              invalidState.email,
              invalidState.registration ?
                JSON.stringify(invalidState.registration)
              : null,
              pendingUser.id,
            ],
          ),
        ).rejects.toMatchObject({
          code: "23514",
          constraint: "users_pending_registration_check",
        });
      }
      expect(await getUser(email)).toEqual(pendingUser);
    });

    await test.step("database writes reject restricted invitation types before insertion or confirmation", async () => {
      const pendingUser = await getUser(email);
      if (pendingUser?.registration?.type !== "invite") {
        throw new Error("Pending invitation missing");
      }
      for (const userType of ["admin", "public"]) {
        for (const confirmedOn of [null, new Date().toISOString()]) {
          const status = confirmedOn ? "active" : "pending";
          const registration = JSON.stringify({
            ...pendingUser.registration,
            confirmed_on: confirmedOn,
          });
          await expect(
            admin.sql!(
              "INSERT INTO users (username, email, password, type, status, registration) VALUES ($1, $1, '', $2, $3, $4)",
              [`sql-${userType}@example.com`, userType, status, registration],
            ),
          ).rejects.toMatchObject({
            message: "This user type cannot be invited",
          });
          await expect(
            admin.sql!(
              "UPDATE users SET type = $1, status = $2, registration = $3 WHERE id = $4",
              [userType, status, registration, pendingUser.id],
            ),
          ).rejects.toMatchObject({
            message: "This user type cannot be invited",
          });
        }
      }
      expect(await getUser(email)).toEqual(pendingUser);
    });

    await test.step("types without access rules can confirm invitations and sign in without gaining connection access", async () => {
      for (const userType of [noAccessType, "default", "connection_admin"]) {
        const recipient =
          userType === noAccessType ? noAccessEmail : `${userType}@example.com`;
        if (userType !== noAccessType) {
          await inviteAsOwner({ email: recipient, userType });
        }
        const inviteUrl = getEmailUrl(recipient);
        expect(new URL(inviteUrl).searchParams.get("returnURL")).toBe(
          "/connections",
        );
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(inviteUrl);
        if (userType === "connection_admin") {
          await expect(page).toHaveURL(
            `${endpoint}/connections/${connection.id}`,
          );
        } else {
          await expect(page).toHaveURL(`${endpoint}/connections`);
          await expect(
            page.getByText("No connections available/permitted"),
          ).toBeVisible();
        }
        expect(await getUser(recipient)).toMatchObject({
          status: "active",
          type: userType,
        });
        await context.close();
        const response = await request.post(`${endpoint}/auth/login`, {
          data: { username: recipient },
        });
        expect(await response.json()).toMatchObject({
          code: "magic-link-sent",
        });
        const signInResponse = await request.get(getEmailUrl(recipient), {
          maxRedirects: 0,
        });
        expect(signInResponse.status()).toBe(302);
      }
    });

    await test.step("confirmed invitees can change roles but cannot become restricted pending invitations", async () => {
      const confirmedUser = await getUser(noAccessEmail);
      if (confirmedUser?.registration?.type !== "invite") {
        throw new Error("Confirmed invitation missing");
      }
      for (const userType of ["admin", "public"] as const) {
        await admin.db.users!.update(
          { id: confirmedUser.id },
          { type: userType },
        );
        expect((await getUser(noAccessEmail))?.type).toBe(userType);
        await expect(
          admin.sql!(
            "UPDATE users SET status = 'pending', registration = jsonb_set(registration, '{confirmed_on}', 'null'::jsonb) WHERE id = $1",
            [confirmedUser.id],
          ),
        ).rejects.toMatchObject({
          message: "This user type cannot be invited",
        });
      }
      await admin.db.users!.update(
        { id: confirmedUser.id },
        { type: noAccessType },
      );
    });

    await test.step("resend replaces the link and confirmation opens the user's available connection", async () => {
      const oldUrl = getEmailUrl(email);
      const existingUser = await getUser(email);
      expect(await invite(`  ${email.toUpperCase()}  `)).toBe(
        `Invitation sent to ${email}. They can sign in after confirming their email.`,
      );
      expect((await getUser(email))?.id).toBe(existingUser!.id);
      await rejectLink(oldUrl);
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(getEmailUrl(email));
      await expect(page).toHaveURL(`${endpoint}/connections/${connection.id}`);
      await expect(page.getByRole("option", { name: /Records/ })).toBeVisible();
      expect(await getUser(email)).toMatchObject({
        status: "active",
        registration: {
          confirmed_on: expect.any(String),
        },
      });
      await rejectLink(getEmailUrl(email));
      await expect(invite(email)).rejects.toBeTruthy();
      await context.close();
    });

    await test.step("confirmed invitees receive the configured sign-in template with invitations disabled and keep their invitation history", async () => {
      const authProviders = (
        await admin.db.database_configs!.findOne({ id: stateConfig.id })
      )?.auth_providers;
      if (!authProviders?.email) throw new Error("Email configuration missing");
      const signInTemplate = {
        from: authProviders.email.emailTemplate.from,
        subject: "Your Example App sign-in",
        body: '<p>Welcome back to Example App.</p><p><a href="{{url}}">Sign in securely</a></p>',
      };
      await admin.db.database_configs!.update(
        { id: stateConfig.id },
        {
          auth_providers: {
            ...authProviders,
            email: {
              ...authProviders.email,
              allowInvites: false,
              emailTemplate: signInTemplate,
            },
          },
        },
      );
      const confirmedUser = await getUser(email);
      if (!confirmedUser) throw new Error("Confirmed user missing");
      const invitationUrl = getEmailUrl(email);
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${endpoint}/auth/login`);
      await expect(page.getByTestId("Login.toggle")).toHaveCount(0);
      await expect(page.locator("#password")).toBeHidden();
      await page.locator("#username").fill(email.toUpperCase());
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await expect(page.getByTestId("AuthNotifPopup")).toContainText(
        "Magic link sent",
      );
      const signInEmail = emails
        .filter(({ recipient }) => recipient === email)
        .at(-1);
      expect(signInEmail?.message).toContain(
        `Subject: ${signInTemplate.subject}`,
      );
      expect(signInEmail?.message).toContain("Welcome back to Example App.");
      expect(signInEmail?.message).not.toContain("{{");
      const signInUrl = getEmailUrl(email);
      const magicLink = await admin.db.magic_links!.findOne({
        user_id: confirmedUser.id,
        magic_link_used: null,
      });
      if (!magicLink) throw new Error("Sign-in magic link missing");
      expect(new URL(signInUrl).pathname).toBe(
        `/auth/magic-link/${magicLink.id}`,
      );
      expect(new URL(signInUrl).searchParams.get("returnURL")).toBe(
        "/connections",
      );
      expect(Number(magicLink.expires)).toBeGreaterThan(Date.now());
      expect(Number(magicLink.expires)).toBeLessThanOrEqual(
        Date.now() + 15 * 60_000,
      );
      await page.goto(signInUrl);
      await expect(page).toHaveURL(`${endpoint}/connections/${connection.id}`);
      await context.close();
      expect(
        (await admin.db.magic_links!.findOne({ id: magicLink.id }))
          ?.magic_link_used,
      ).toEqual(expect.any(String));
      expect((await getUser(email))?.registration).toEqual(
        confirmedUser.registration,
      );
      await rejectLink(signInUrl);
      await rejectLink(invitationUrl);
      const response = await request.post(`${endpoint}/auth/login`, {
        data: { username: "uninvited@example.com" },
      });
      expect(await response.json()).toMatchObject({
        success: false,
        code: "no-match",
      });
      expect(await getUser("uninvited@example.com")).toBeFalsy();
      await setAllowInvites(true);
    });

    await test.step("magic-link resends replace pending links and expiry and concurrent use are enforced", async () => {
      const user = await getUser(email);
      if (!user) throw new Error("Confirmed user missing");
      await request.post(`${endpoint}/auth/login`, {
        data: { username: email },
      });
      const oldUrl = getEmailUrl(email);
      await request.post(`${endpoint}/auth/login`, {
        data: { username: email },
      });
      const expiredUrl = getEmailUrl(email);
      expect(expiredUrl).not.toBe(oldUrl);
      await rejectLink(oldUrl);
      await admin.db.magic_links!.update(
        { user_id: user.id, magic_link_used: null },
        { expires: 0 },
      );
      await rejectLink(expiredUrl);
      await request.post(`${endpoint}/auth/login`, {
        data: { username: email },
      });
      const signInUrl = getEmailUrl(email);
      const sessionCount = await admin.db.sessions!.count({ user_id: user.id });
      const responses = await Promise.all(
        [1, 2].map(() => request.get(signInUrl, { maxRedirects: 0 })),
      );
      expect(
        responses.filter((response) => response.status() === 302),
      ).toHaveLength(1);
      expect(await admin.db.sessions!.count({ user_id: user.id })).toBe(
        sessionCount + 1,
      );
      expect((await getUser(email))?.registration).toEqual(user.registration);
    });

    await test.step("failed session creation rolls back invitation and magic-link consumption but preserves failed attempts", async () => {
      const recipient = "retry-session@example.com";
      await invite(recipient);
      await admin.sql!(
        `ALTER TABLE sessions ADD CONSTRAINT reject_test_session
         CHECK (user_agent <> 'reject-test-session') NOT VALID`,
      );
      try {
        for (const linkType of ["invite", "magic-link"]) {
          if (linkType === "magic-link") {
            await request.post(`${endpoint}/auth/login`, {
              data: { username: recipient },
            });
          }
          const user = await getUser(recipient);
          if (!user) throw new Error("Retry test user missing");
          const url = getEmailUrl(recipient);
          const sessionCount = await admin.db.sessions!.count({
            user_id: user.id,
          });
          await admin.sql!("DELETE FROM login_attempts");
          const failedResponse = await request.get(url, {
            maxRedirects: 0,
            headers: { "user-agent": "reject-test-session" },
          });
          expect(failedResponse.status()).toBeGreaterThanOrEqual(400);
          expect(failedResponse.headers()["set-cookie"]).toBeUndefined();
          expect(await getUser(recipient)).toMatchObject({
            status: user.status,
            registration: user.registration,
          });
          expect(await admin.db.sessions!.count({ user_id: user.id })).toBe(
            sessionCount,
          );
          expect(await admin.db.login_attempts!.count({ failed: true })).toBe(
            1,
          );
          if (linkType === "magic-link") {
            expect(
              await admin.db.magic_links!.findOne({ user_id: user.id }),
            ).toMatchObject({
              magic_link_used: null,
            });
          }

          const acceptedAt = Date.now();
          const retryResponse = await request.get(url, { maxRedirects: 0 });
          expect(retryResponse.status()).toBe(302);
          expect(await admin.db.sessions!.count({ user_id: user.id })).toBe(
            sessionCount + 1,
          );
          expect(await admin.db.login_attempts!.count({ failed: true })).toBe(
            linkType === "invite" ? 0 : 1,
          );
          expect(await admin.db.login_attempts!.count({ failed: false })).toBe(
            1,
          );
          if (linkType === "invite") {
            const session = await admin.db.sessions!.findOne({
              user_id: user.id,
            });
            const sessionMaxAge =
              stateConfig.session_max_age_days * 24 * 60 * 60_000;
            expect(Number(session?.expires)).toBeGreaterThanOrEqual(
              acceptedAt + sessionMaxAge,
            );
            expect(Number(session?.expires)).toBeLessThanOrEqual(
              Date.now() + sessionMaxAge,
            );
          }
        }
      } finally {
        await admin.sql!(
          "ALTER TABLE sessions DROP CONSTRAINT reject_test_session",
        );
      }
    });

    await test.step("password invitations remain pending until password setup and then use normal login", async () => {
      const previousEmailConfig = (
        await admin.db.database_configs!.findOne({ id: stateConfig.id })
      )?.auth_providers?.email;
      if (!previousEmailConfig) throw new Error("Email configuration missing");
      await admin.sql!(
        "UPDATE database_configs SET auth_providers = jsonb_set(auth_providers, '{email}', auth_providers->'email' || $1::jsonb) WHERE id = $2",
        [
          JSON.stringify({
            emailLoginType: "withPassword",
            emailTemplate: DEFAULT_EMAIL_VERIFICATION_TEMPLATE,
            minPasswordLength: 12,
          }),
          stateConfig.id,
        ],
      );
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${endpoint}/auth/login`);
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.getByTestId("Login.toggle")).toHaveCount(0);
      await page.goto(`${endpoint}/auth/register`);
      await expect(
        page.getByText("An invitation is required to register"),
      ).toBeVisible();
      const recipient = "password-invite@example.com";
      const password = "invited-user-password";
      for (const invitationToken of [undefined, "invalid-token"]) {
        const uninvitedEmail = "uninvited-password@example.com";
        const response = await request.post(`${endpoint}/auth/register`, {
          data: { username: uninvitedEmail, password, invitationToken },
        });
        expect(response.status()).toBe(400);
        expect(await getUser(uninvitedEmail)).toBeFalsy();
      }
      await invite(recipient);
      const invitationUrl = new URL(getEmailUrl(recipient));
      expect(invitationUrl.pathname).toBe("/auth/register");
      const pendingUser = await getUser(recipient);
      if (!pendingUser) throw new Error("Pending password invitation missing");
      const code = invitationUrl.searchParams.get("invitationToken");
      const accept = ({
        code,
        password,
      }: {
        code: string | null;
        password: string;
      }) =>
        request.post(`${endpoint}/auth/register`, {
          data: { username: recipient, invitationToken: code, password },
        });
      await page.goto(invitationUrl.href);
      await expect(
        page.getByRole("heading", { name: "Set your password" }),
      ).toBeVisible();
      await expect(page.locator("#username")).toHaveValue(recipient);
      expect(await getUser(recipient)).toEqual(pendingUser);
      expect(await admin.db.sessions!.count({ user_id: pendingUser.id })).toBe(
        0,
      );

      await admin.sql!("DELETE FROM login_attempts");
      const bypassResponse = await request.post(`${endpoint}/auth/magic-link`, {
        data: { email: recipient, code, returnToken: true },
      });
      expect(await bypassResponse.json()).toMatchObject({ success: false });
      for (const data of [
        { code: null, password },
        { code: "", password },
        { code, password: "" },
        { code, password: "too-short" },
        { code: "invalid-token", password },
        { code, password: "a".repeat(401) },
      ]) {
        const response = await accept(data);
        expect(response.status()).toBe(400);
        expect(await response.json()).toMatchObject({ success: false });
        expect(response.headers()["set-cookie"]).toBeUndefined();
      }
      expect(await getUser(recipient)).toEqual(pendingUser);
      await admin.sql!("DELETE FROM login_attempts");
      await invite(recipient);
      expect((await accept({ code, password })).status()).toBe(400);
      const replacementUrl = new URL(getEmailUrl(recipient));
      await setAllowInvites(false);
      await page.goto(replacementUrl.href);
      await page.locator("#password").fill(password);
      await page.locator("#new-password").fill("different-password");
      await page.getByRole("button", { name: "Activate account" }).click();
      await expect(page.getByText("Passwords do not match")).toBeVisible();
      expect((await getUser(recipient))?.status).toBe("pending");
      await page.locator("#new-password").fill(password);
      await page.getByRole("button", { name: "Activate account" }).click();
      await expect(
        page.getByTestId("AuthNotifPopup").getByTestId("Popup.content"),
      ).toHaveText("Your email has been confirmed. You can now sign in");
      await page.getByRole("button", { name: "OK", exact: true }).click();
      await expect(page).toHaveURL(`${endpoint}/auth/login`);
      expect(await getUser(recipient)).toMatchObject({
        status: "active",
        registration: { type: "invite", confirmed_on: expect.any(String) },
      });
      expect(
        await admin.sql!(
          "SELECT password FROM users WHERE id = $1",
          [pendingUser.id],
          { returnType: "value" },
        ),
      ).toBe(getPasswordHash(pendingUser, password));
      expect(await admin.db.sessions!.count({ user_id: pendingUser.id })).toBe(
        0,
      );
      expect(
        (
          await accept({
            code: replacementUrl.searchParams.get("invitationToken"),
            password,
          })
        ).status(),
      ).toBe(400);
      const emailCount = emails.length;
      await page.locator("#username").fill(recipient.toUpperCase());
      await page.locator("#password").fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).not.toHaveURL(`${endpoint}/auth/login`);
      expect(emails).toHaveLength(emailCount);
      await context.close();
      await setAllowInvites(true);

      await test.step("password sign-in validates the password before two-factor authentication", async () => {
        const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
        const recoveryCode = "password-user-recovery";
        await admin.sql!('UPDATE users SET "2fa" = $1 WHERE id = $2', [
          JSON.stringify({
            secret,
            enabled: true,
            recoveryCode: getPasswordHash(pendingUser, recoveryCode),
          }),
          pendingUser.id,
        ]);
        await admin.sql!("DELETE FROM login_attempts");
        const login = (data: {
          password: string | undefined;
          totp_token?: string;
          totp_recovery_code?: string;
        }) =>
          request.post(`${endpoint}/auth/login`, {
            data: { username: recipient, ...data },
            maxRedirects: 0,
          });
        for (const { credentials, code } of [
          { credentials: { password: undefined }, code: "password-missing" },
          { credentials: { password: "wrong-password" }, code: "no-match" },
          { credentials: { password }, code: "totp-token-missing" },
          {
            credentials: { password, totp_token: "invalid" },
            code: "invalid-totp-code",
          },
        ]) {
          const response = await login(credentials);
          expect(await response.json()).toMatchObject({ success: false, code });
          expect(response.headers()["set-cookie"]).toBeUndefined();
        }
        for (const credentials of [
          { password, totp_token: await generate({ secret }) },
          { password, totp_recovery_code: recoveryCode },
        ]) {
          const response = await login(credentials);
          expect(response.status()).toBe(302);
          expect(response.headers()["set-cookie"]).toBeDefined();
        }
        expect(emails).toHaveLength(emailCount);
        await admin.sql!("DELETE FROM login_attempts");
      });

      for (const reason of ["expired", "disabled"]) {
        /* Exercise invitation validation without failures hitting the rate limit. */
        await admin.sql!("DELETE FROM login_attempts");
        const recipient = `password-${reason}@example.com`;
        await invite(recipient);
        const invitationUrl = new URL(getEmailUrl(recipient));
        if (reason === "expired") {
          await admin.sql!(
            "UPDATE users SET registration = jsonb_set(registration, '{expires}', to_jsonb('2000-01-01T00:00:00.000Z'::text)) WHERE email = $1",
            [recipient],
          );
        } else {
          await admin.db.users!.update(
            { email: recipient },
            { status: "disabled" },
          );
        }
        const pendingUser = await getUser(recipient);
        const response = await request.post(`${endpoint}/auth/register`, {
          data: {
            username: recipient,
            invitationToken: invitationUrl.searchParams.get("invitationToken"),
            password,
          },
        });
        expect(response.status()).toBe(400);
        expect(await response.json()).toMatchObject({
          success: false,
          code:
            reason === "expired" ?
              "expired-email-confirmation-code"
            : "inactive-account",
        });
        expect(await getUser(recipient)).toEqual(pendingUser);
      }

      const concurrentRecipient = "concurrent-password@example.com";
      await invite(concurrentRecipient);
      const concurrentUrl = new URL(getEmailUrl(concurrentRecipient));
      await admin.sql!("DELETE FROM login_attempts");
      const responses = await Promise.all(
        [1, 2].map(() =>
          request.post(`${endpoint}/auth/register`, {
            data: {
              username: concurrentRecipient,
              invitationToken:
                concurrentUrl.searchParams.get("invitationToken"),
              password,
            },
          }),
        ),
      );
      expect(
        responses.filter((response) => response.status() === 200),
      ).toHaveLength(1);
      expect(
        responses.filter((response) => response.status() === 400),
      ).toHaveLength(1);
      expect((await getUser(concurrentRecipient))?.status).toBe("active");

      await test.step("public signup shares the registration page and still requires email confirmation", async () => {
        await admin.sql!(
          "UPDATE database_configs SET auth_providers = jsonb_set(auth_providers, '{signupMode}', '\"public\"'::jsonb) WHERE id = $1",
          [stateConfig.id],
        );
        const publicContext = await browser.newContext();
        const publicPage = await publicContext.newPage();
        const publicEmail = "public-registration@example.com";
        await publicPage.goto(`${endpoint}/auth/login`);
        await publicPage.getByTestId("Login.toggle").click();
        await expect(publicPage).toHaveURL(`${endpoint}/auth/register`);
        await expect(publicPage.locator("#new-password")).toBeVisible();
        await publicPage.locator("#username").fill(publicEmail);
        await publicPage.locator("#password").fill(password);
        await publicPage.locator("#new-password").fill(password);
        await publicPage
          .getByRole("button", { name: "Sign up", exact: true })
          .click();
        await expect(
          publicPage.locator("#email-verification-code"),
        ).toBeVisible();
        expect((await getUser(publicEmail))?.status).toBe("pending");
        await publicPage
          .getByRole("button", { name: "OK", exact: true })
          .click();
        const confirmationCode = new URL(
          getEmailUrl(publicEmail),
        ).searchParams.get("code");
        if (!confirmationCode) throw new Error("Confirmation code missing");
        await publicPage
          .locator("#email-verification-code")
          .fill(confirmationCode);
        await publicPage
          .getByRole("button", { name: "Confirm email", exact: true })
          .click();
        await expect(
          publicPage.getByTestId("AuthNotifPopup").getByTestId("Popup.content"),
        ).toHaveText("Your email has been confirmed. You can now sign in");
        await publicPage
          .getByRole("button", { name: "OK", exact: true })
          .click();
        await expect(publicPage).toHaveURL(`${endpoint}/auth/login`);
        expect((await getUser(publicEmail))?.status).toBe("active");
        await publicContext.close();
        await admin.sql!(
          "UPDATE database_configs SET auth_providers = jsonb_set(auth_providers, '{signupMode}', '\"invitationOnly\"'::jsonb) WHERE id = $1",
          [stateConfig.id],
        );
      });
      await admin.sql!(
        "UPDATE database_configs SET auth_providers = jsonb_set(auth_providers, '{email}', $1::jsonb) WHERE id = $2",
        [JSON.stringify(previousEmailConfig), stateConfig.id],
      );
      await admin.sql!("DELETE FROM login_attempts");
      await expect
        .poll(async () => {
          const response = await request.post(`${endpoint}/auth/login`, {
            data: { username: email },
          });
          return response.json();
        })
        .toMatchObject({ code: "magic-link-sent" });
    });

    await test.step("enabling two-factor authentication revokes previously issued email links", async () => {
      await request.post(`${endpoint}/auth/login`, {
        data: { username: email },
      });
      const signInUrl = new URL(getEmailUrl(email));
      const response = await request.post(`${endpoint}/auth/magic-link`, {
        data: {
          id: signInUrl.pathname.split("/").at(-1),
          returnToken: true,
        },
      });
      const signInResult = await response.json();
      expect(signInResult).toMatchObject({
        success: true,
        token: expect.any(String),
      });
      const { token } = signInResult as { token: string };
      await request.post(`${endpoint}/auth/login`, {
        data: { username: email },
      });
      const pendingUrl = getEmailUrl(email);
      const invitedClient = await prostgles<
        DBGeneratedSchema,
        Partial<GeneratedFunctionSchema>
      >({
        endpoint,
        token,
        socketOptions: {
          path: "/ws-api-dbs",
          transports: ["websocket"],
          reconnection: false,
        },
      });
      try {
        const setup = await invitedClient.methods?.create2FA?.();
        if (!setup || !invitedClient.methods?.enable2FA)
          throw new Error("Two-factor setup missing");
        /* Enabling 2FA closes existing web sessions, including this socket. */
        await invitedClient.methods
          .enable2FA({ token: await generate({ secret: setup.secret }) })
          .catch((error: unknown) => {
            expect(error).toMatchObject({
              message: "Socket disconnected before receiving a response",
            });
          });
        expect(
          await admin.sql!(
            `SELECT ("2fa"->>'enabled')::boolean FROM users WHERE email = $1`,
            [email],
            { returnType: "value" },
          ),
        ).toBe(true);
        await rejectLink(pendingUrl);
      } finally {
        invitedClient.socket.disconnect();
      }
    });

    await test.step("email-link sign-in respects two-factor authentication and disabled accounts", async () => {
      const user = await getUser(email);
      if (!user) throw new Error("Invited user missing");
      const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
      const recoveryCode = "invited-user-recovery";
      await admin.sql!('UPDATE users SET "2fa" = $1 WHERE id = $2', [
        JSON.stringify({
          secret,
          enabled: true,
          recoveryCode: getPasswordHash(user, recoveryCode),
        }),
        user.id,
      ]);
      await admin.sql!("DELETE FROM login_attempts");
      const emailCount = emails.length;
      const login = async (data: {
        totp_token?: string;
        totp_recovery_code?: string;
      }) => {
        const response = await request.post(`${endpoint}/auth/login`, {
          data: { username: email, ...data },
        });
        return response.json();
      };
      expect(await login({})).toMatchObject({ code: "totp-token-missing" });
      expect(await login({ totp_token: "invalid" })).toMatchObject({
        code: "invalid-totp-code",
      });
      expect(emails).toHaveLength(emailCount);
      expect(
        await login({ totp_token: await generate({ secret }) }),
      ).toMatchObject({ code: "magic-link-sent" });
      expect(
        (await request.get(getEmailUrl(email), { maxRedirects: 0 })).status(),
      ).toBe(302);
      expect(await login({ totp_recovery_code: recoveryCode })).toMatchObject({
        code: "magic-link-sent",
      });
      const pendingLoginUrl = getEmailUrl(email);
      await admin.db.users!.update({ id: user.id }, { status: "disabled" });
      await rejectLink(pendingLoginUrl);
      expect(await login({ totp_recovery_code: recoveryCode })).toMatchObject({
        code: "inactive-account",
      });
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${endpoint}/auth/login`);
      await page.locator("#username").fill("Existing");
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.locator("#password").fill("test-password");
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await expect(page).not.toHaveURL(`${endpoint}/auth/login`);
      await context.close();
    });

    await test.step("expired and disabled invitations cannot be accepted", async () => {
      for (const reason of ["expired", "disabled"]) {
        const recipient = `${reason}@example.com`;
        await invite(recipient);
        if (reason === "expired") {
          await admin.sql!(
            "UPDATE users SET registration = jsonb_set(registration, '{expires}', to_jsonb('2000-01-01T00:00:00.000Z'::text)) WHERE email = $1",
            [recipient],
          );
        } else {
          await admin.db.users!.update(
            { email: recipient },
            { status: "disabled" },
          );
        }
        await rejectLink(getEmailUrl(recipient));
        const user = await getUser(recipient);
        expect(await admin.db.sessions!.count({ user_id: user!.id })).toBe(0);
      }
    });

    await test.step("permission removal allows confirmation and concurrent acceptance creates one session", async () => {
      const recipient = "concurrent@example.com";
      await inviteAsOwner({
        email: recipient,
        userType: readerType,
      });
      const rule = await admin.db.access_control_user_types!.findOne({
        user_type: readerType,
      });
      if (!rule) throw new Error("Reader permission missing");
      await admin.db.access_control_user_types!.delete(rule);
      await admin.sql!("DELETE FROM login_attempts");
      const responses = await Promise.all(
        [1, 2].map(() =>
          request.get(getEmailUrl(recipient), { maxRedirects: 0 }),
        ),
      );
      expect(
        responses.filter((response) => response.status() === 302),
      ).toHaveLength(1);
      const user = await getUser(recipient);
      expect(await admin.db.sessions!.count({ user_id: user!.id })).toBe(1);
    });
  } finally {
    await deployment?.dispose();
    await smtp.close();
  }
});
