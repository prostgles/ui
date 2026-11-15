import type { DBSSchema } from "@common/publishUtils";
import { DAY, MINUTE, ROUTES } from "@common/utils";
import type { MagicLinkOrOTPData } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBS, Users } from "..";
import { getEmailClient } from "./emailProvider/getEmailClient";

export const sendUserMagicLinkEmail = async (
  dbs: DBS,
  user: Users,
  mailClient: Awaited<ReturnType<typeof getEmailClient>>,
  {
    auth_providers,
    session_max_age_days,
  }: Pick<
    DBSSchema["database_configs"],
    "auth_providers" | "session_max_age_days"
  >,
  getMagicLinkUrl: (data: MagicLinkOrOTPData, websiteUrl: string) => string,
) => {
  const { email } = user;
  if (!email || user.status !== "active") {
    throw new Error("This account cannot receive a sign-in link");
  }
  if (!mailClient || !auth_providers) {
    throw new Error(
      "Configure email delivery and Website URL in Server Settings first",
    );
  }
  const { website_url } = auth_providers;
  await dbs.tx(async (dbsTx) => {
    /* Serialize link issuance with account changes, including enabling 2FA. */
    const matchingUser = await dbsTx.users.findOne(
      {
        id: user.id,
        email,
        status: user.status,
        type: user.type,
        "2fa": user["2fa"],
        registration: user.registration,
      },
      { forUpdate: true },
    );
    if (!matchingUser) {
      throw new Error("Account changed; please try again");
    }
    await dbsTx.magic_links.delete({
      user_id: user.id,
      magic_link_used: null,
    });
    const magicLink = await dbsTx.magic_links.insert(
      {
        user_id: user.id,
        expires: Date.now() + 15 * MINUTE,
        session_expires: Date.now() + (session_max_age_days || 1) * DAY,
      },
      { returning: "*" },
    );
    const url = new URL(
      getMagicLinkUrl(
        { type: "magic-link", id: magicLink.id, returnToken: false },
        website_url,
      ),
    );
    url.searchParams.set("returnURL", ROUTES.CONNECTIONS);
    await mailClient.sendMagicLinkEmail({
      to: email,
      url: url.href,
      code: undefined,
    });
  });
};
