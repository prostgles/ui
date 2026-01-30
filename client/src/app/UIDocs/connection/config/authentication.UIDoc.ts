import type { UIDocElement } from "src/app/UIDocs";
import { getCommandElemSelector, getDataKeyElemSelector } from "src/Testing";

export const authenticationUIDoc: UIDocElement = {
  type: "tab",
  title: "Authentication",
  componentName: "AuthProviderSetup",
  selector: getDataKeyElemSelector("auth"),
  description:
    "Manage user authentication methods, default user roles, and third-party login providers to control access.",
  children: [
    {
      type: "input",
      title: "Website URL",
      inputType: "text",
      selector: getCommandElemSelector("AuthProviderSetup.websiteURL"),
      description:
        "Website URL. Used for email and third-party login redirect URL. When first visiting the app as an admin user, it is automatically set to the current URL which will trigger a page refresh.",
    },
    {
      type: "input",
      title: "Default user type",
      inputType: "select",
      selector: getCommandElemSelector("AuthProviderSetup.defaultUserType"),
      description:
        "The default user type assigned to new users. Defaults to 'default'.",
    },
    {
      type: "accordion-item",
      title: "Email signup",
      description: "Email signup/magic-link authentication setup.",
      selector: getCommandElemSelector("EmailAuthSetup"),
      docs: `
            Provide SMTP or AWS SES credentials to enable email signup and magic-link authentication. 
            By default users authenticate using a password.`,
      children: [
        {
          type: "input",
          title: "Enable/Disable email signup toggle",
          inputType: "checkbox",
          selector: getCommandElemSelector("EmailAuthSetup.toggle"),
          description:
            "Enable email signup. This will allow users to sign up and log in using their email address.",
        },
        {
          type: "input",
          title: "Signup type",
          inputType: "select",
          selector: getCommandElemSelector("EmailAuthSetup.SignupType"),
          description:
            "Signup type. Choose between 'withPassword' or 'withMagicLink'.",
        },
        {
          type: "popup",
          title: "Email verification",
          selector: getCommandElemSelector("EmailSMTPAndTemplateSetup"),
          description: "SMTP and email template setup.",
          children: [
            {
              type: "accordion-item",
              title: "Email provider setup",
              selector: getCommandElemSelector("EmailSMTPSetup"),
              description:
                "SMTP settings for sending registration/magic-link emails. Allowed providers: SMTP (host, port, username, password) or AWS SES (region, accessKeyId, secretAccessKey).",
              children: [],
            },
            {
              type: "accordion-item",
              title: "Email Template setup",
              selector: getCommandElemSelector("EmailTemplateSetup"),
              description: "Email template for registration/magic-link emails",
              children: [],
            },
            {
              type: "button",
              title: "Test and save",
              selector: getCommandElemSelector(
                "EmailSMTPAndTemplateSetup.save",
              ),
              description: "Test and Save SMTP and email template settings.",
            },
          ],
        },
      ],
    },
    {
      type: "list",
      title: "Third-party login providers",
      description: "Third-party login providers (OAuth2)",
      selectorCommand: "AuthProviders.list",
      itemSelector:
        getCommandElemSelector("AuthProviders.list") + " > .Section",
      itemContent: [],
    },
  ],
};
