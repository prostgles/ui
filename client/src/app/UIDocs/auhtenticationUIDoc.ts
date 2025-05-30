import { fixIndent, ROUTES } from "../../../../commonTypes/utils";
import type { UIDocContainers } from "../UIDocs";

export const auhtenticationUIDoc = {
  type: "page",
  path: ROUTES.LOGIN,
  title: "Authentication",
  description: "Authentication and login page for accessing the application",
  docs: fixIndent(`
    The authentication page allows users to sign in to their account using their credentials. 
    It provides options for both regular login and two-factor authentication when enabled.`),
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
