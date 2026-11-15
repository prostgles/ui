import { API_ENDPOINTS, DAY, ROUTES } from "@common/utils";
import type { DBSSchema } from "@common/publishUtils";
import { randomBytes } from "node:crypto";
import type { DBS, Users } from "../..";
import { renderEmailText } from "../../Emails/renderEmailText";
import { getEmailClient } from "../emailProvider/getEmailClient";
import { createRegistrationConfirmation } from "../registrationConfirmation";

export const sendInviteEmail = async (
  dbs: Pick<DBS, "users">,
  user: Users,
  authProviders: DBSSchema["database_configs"]["auth_providers"],
) => {
  if (!authProviders?.email?.enabled || !authProviders.email.allowInvites) {
    throw new Error("Invitations are disabled");
  }
  const { registration, email } = user;
  if (
    registration?.type !== "invite" ||
    registration.confirmed_on ||
    !email ||
    user.status !== "pending"
  ) {
    throw new Error("This account cannot receive an invitation link");
  }
  const mailClient = await getEmailClient(authProviders);
  if (!mailClient) {
    throw new Error(
      "Configure email delivery and Website URL in Server Settings first",
    );
  }
  const token = randomBytes(32).toString("hex");
  const updatedUsers = await dbs.users.update(
    {
      id: user.id,
      status: user.status,
      type: user.type,
      "2fa": user["2fa"],
      registration,
    },
    {
      registration: {
        ...registration,
        ...createRegistrationConfirmation(token, DAY),
      },
    },
    { returning: "*" },
  );
  if (!updatedUsers?.length)
    throw new Error("Invitation changed; please try again");
  const requiresPassword =
    authProviders.email.emailLoginType === "withPassword";
  const url = new URL(
    requiresPassword ? ROUTES.REGISTER : API_ENDPOINTS.MAGIC_LINK,
    authProviders.website_url,
  );
  url.searchParams.set("email", email);
  url.searchParams.set(requiresPassword ? "invitationToken" : "code", token);
  if (!requiresPassword) url.searchParams.set("returnURL", ROUTES.CONNECTIONS);
  const message =
    requiresPassword ?
      "You have been invited to Prostgles. Open this link to confirm your email and set your password:"
    : "You have been invited to Prostgles. Open this link to confirm your email and sign in:";
  const values = { url: url.href };
  await mailClient.sendEmail({
    from: authProviders.email.emailTemplate.from,
    to: email,
    subject: "Your Prostgles invitation",
    text: renderEmailText(
      `${message}\n\n{{url}}\n\nThis link can only be used once.`,
      values,
    ),
    html: renderEmailText(
      `<p>${message}</p><p><a href="{{url}}">Accept invitation</a></p><p>This link can only be used once.</p>`,
      values,
      true,
    ),
  });
};
