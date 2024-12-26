export const OAuthProviderOptions = {
  google: {
    scopes: [
      {
        key: "profile",
        subLabel: "View your basic profile info",
      },
      {
        key: "email",
        subLabel: "View your email address",
      },
      {
        key: "calendar",
        subLabel: "View and manage your calendars",
      },
      {
        key: "calendar.readonly",
        subLabel: "View your calendars",
      },
      {
        key: "calendar.events",
        subLabel: "View and manage calendar events",
      },
      {
        key: "calendar.events.readonly",
        subLabel: "View calendar events",
      },
    ],
  },
  facebook: {
    scopes: [
      {
        key: "email",
        subLabel: "Access user's primary email address",
      },
      {
        key: "public_profile",
        subLabel: "Basic public profile information",
      },
      {
        key: "user_birthday",
        subLabel: "Access user's birthday",
      },
      {
        key: "user_friends",
        subLabel: "Access user's friend list",
      },
      {
        key: "user_gender",
        subLabel: "Access user's gender",
      },
      {
        key: "user_hometown",
        subLabel: "Access user's hometown",
      },
    ],
  },
  github: {
    scopes: [
      {
        key: "read:user",
        subLabel: "Read all user profile data",
      },
      {
        key: "user:email",
        subLabel: "Access user email addresses (read-only)",
      },
    ],
  },
  microsoft: {
    scopes: [
      {
        key: "openid",
        subLabel: "Sign you in using your OpenID Connect profile",
      },
      {
        key: "profile",
        subLabel: "View your basic profile info",
      },
      {
        key: "email",
        subLabel: "View your email address",
      },
      {
        key: "offline_access",
        subLabel: "Maintain access to data you have given it access to",
      },
      {
        key: "User.Read",
        subLabel: "Sign in and read user profile",
      },
      {
        key: "User.ReadBasic.All",
        subLabel: "Read all users' basic profiles",
      },
      {
        key: "User.Read.All",
        subLabel: "Read all users' full profiles",
      },
    ],
    /**
     * Indicates the type of user interaction that is required.
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/src/request/AuthorizationUrlRequest.ts
     */
    prompts: [
      {
        key: "login",
        subLabel:
          "will force the user to enter their credentials on that request, negating single-sign on",
      },
      {
        key: "none",
        subLabel:
          " will ensure that the user isn't presented with any interactive prompt. if request can't be completed via single-sign on, the endpoint will return an interaction_required error",
      },
      {
        key: "consent",
        subLabel:
          "will the trigger the OAuth consent dialog after the user signs in, asking the user to grant permissions to the app",
      },
      {
        key: "select_account",
        subLabel:
          "will interrupt single sign-on providing account selection experience listing all the accounts in session or any remembered accounts or an option to choose to use a different account",
      },
      {
        key: "create",
        subLabel:
          "will direct the user to the account creation experience instead of the log in experience",
      },
    ],
  },
};

export const EMAIL_CONFIRMED_SEARCH_PARAM = "email-confirmed" as const;

export const PASSWORDLESS_ADMIN_USERNAME = "passwordless_admin";

type TemplateData = Record<
  string,
  {
    required?: boolean;
    value: string;
  }
>;

const getTemplatedText = (
  templatedText: string,
  data: TemplateData,
  propertyName: string,
) => {
  return Object.entries(data).reduce((acc, [key, { value, required }]) => {
    const placeholder = `{{${key}}}`;
    if (required && !value) throw `Missing required value for key: ${key}`;
    if (required && !acc.includes(placeholder))
      throw `Missing placeholder: ${placeholder} from ${propertyName}`;
    return acc.replaceAll(placeholder, value);
  }, templatedText);
};

export const getEmailFromTemplate = <
  EmailTemplate extends { body: string; from: string; subject: string },
>(
  template: EmailTemplate,
  subjectData: TemplateData,
  bodyData: TemplateData,
): EmailTemplate => {
  const keyValues = Object.entries(bodyData);
  if (!keyValues.length) throw "Empty bodyData provided";
  if (!template.body) throw "No body provided";
  if (!template.from) throw "No from provided";
  if (!template.subject) throw "No subject provided";

  return {
    ...template,
    body: getTemplatedText(template.body, bodyData, "body"),
    subject: getTemplatedText(template.subject, subjectData, "subject"),
  };
};
