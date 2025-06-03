import { fixIndent, ROUTES } from "../../../../commonTypes/utils";
import type { UIDocContainers } from "../UIDocs";

export const authenticationUIDoc = {
  type: "page",
  path: ROUTES.LOGIN,
  title: "Authentication",
  description: "Authentication and login page for accessing the application",
  docs: fixIndent(`
    When first launching Prostgles UI, an admin user will be created automatically:
    - If \`PRGL_USERNAME\` and \`PRGL_PASSWORD\` environment variables are provided, an admin user is created with these credentials. 
    - Otherwise, a passwordless admin user is created. 
    It gets assigned to the first client that accesses the app. 
    Subsequent clients accessing the app will be rejected with an appropriate error message detailing that the passwordless admin user has already been assigned.

    To setup multiple users, the passwordless admin user must be converted to a normal admin account by setting up a password.
    This will allow accessing /users page where you can manage users.

    Users login using their username and password. Two-factor authentication is provided through TOTP (Time-based One-Time Password) and can be enabled in the account section.

    Email and third-party (OAuth) authentication can be configured in Server Settings section. It allows users to register and log in using their email address or third-party accounts like Google, GitHub, etc.
    `),
  children: [
    {
      type: "input",
      inputType: "text",
      title: "Username",
      description: "Enter your username or email address",
      selectorCommand: "EmailAuthSetup",
    },
    {
      type: "input",
      inputType: "text",
      title: "Password",
      description: "Enter your account password",
      selectorCommand: "Login.toggle",
    },
    {
      type: "button",
      title: "Sign In",
      description: "Click to authenticate and access your account",
      selectorCommand: "EmailAuthSetup.SignupType",
    },
  ],
} satisfies UIDocContainers;
