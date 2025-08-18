import { fixIndent } from "./utils";

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
  customOAuth: {},
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
  const extraPlaceholders = templatedText
    .match(/{{\w+}}/g)
    ?.filter((placeHolder) => {
      const key = placeHolder.slice(2, -2);
      return !Object.keys(data).includes(key);
    });
  if (extraPlaceholders?.length)
    throw `Extra placeholders: ${extraPlaceholders.join(", ")} in ${propertyName}`;
  return Object.entries(data).reduce((acc, [key, { value, required }]) => {
    const placeholder = "{{" + key + "}}";
    if (required && !value) throw `Missing required value for key: ${key}`;
    if (required && !acc.includes(placeholder)) {
      throw `Missing placeholder: ${placeholder} from ${propertyName}`;
    }
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
  if (!template.body) throw "Email template: No body provided";
  if (!template.from) throw "Email template: No from provided";
  if (!template.subject) throw "Email template: No subject provided";

  return {
    ...template,
    body: getTemplatedText(template.body, bodyData, "body"),
    subject: getTemplatedText(template.subject, subjectData, "subject"),
  };
};

export const MOCK_SMTP_HOST = "prostgles-test-mock";

export const DEFAULT_EMAIL_VERIFICATION_TEMPLATE = {
  from: `noreply@abc.com`,
  subject: "Please verify your email address",
  body: fixIndent(`
    Hello,
    <br/><br/>
    Somebody just used this email address to sign up.
    <br/><br/>
    If this was you, verify your email by clicking on the link below:
    <br/><br/>
    <a href="{{url}}">{{url}}</a>.
    <br/><br/>
    Alternatively, you can fill in the code below on the login page:
    <br/><br/>
    <strong>{{code}}</strong>
    <br/><br/>

    If this was not you, any other accounts you may own, and your internet properties are not at risk.
`),
} as const;

export const DEFAULT_MAGIC_LINK_TEMPLATE = {
  from: `noreply@abc.com`,
  subject: "Login to your account",
  body: fixIndent(`
    Hey,
    <br/><br/>
    Login by clicking <a href="{{url}}">here</a>. Or by entering the code below on the login page:
    <br/><br/>
    {{code}}
    <br/><br/>
    If you didn't request this email there's nothing to worry about - you can safely ignore it.`),
} as const;

export const getMagicLinkEmailFromTemplate = ({
  url,
  template,
  code,
}: {
  url: string;
  code: string;
  template: { from: string; subject: string; body: string };
}) => {
  return getEmailFromTemplate(
    template,
    {},
    {
      code: { required: true, value: code },
      url: { required: true, value: url },
    },
  );
};

export const getVerificationEmailFromTemplate = ({
  url,
  code,
  template,
}: {
  code: string;
  url: string;
  template: { from: string; subject: string; body: string };
}) => {
  return getEmailFromTemplate(
    template,
    {
      code: { required: false, value: code },
    },
    {
      code: { required: true, value: code },
      url: { required: true, value: url },
    },
  );
};
try {
  getMagicLinkEmailFromTemplate({
    url: "a",
    code: "a",
    template: DEFAULT_MAGIC_LINK_TEMPLATE,
  });
  getVerificationEmailFromTemplate({
    template: DEFAULT_EMAIL_VERIFICATION_TEMPLATE,
    code: "a",
    url: "a",
  });
} catch (e) {
  // console.trace(e);
  throw e;
}
