import type { UIDocElement } from "../../../UIDocs";

export const apiUIDoc = {
  type: "tab",
  selectorCommand: "config.api",
  title: "API",
  description: "Configure API access settings and view API documentation.",
  docs: `
  The API section allows you to configure the API access settings for your application.
  This enables programmatic access to your application's data and functionality via HTTP or WebSocket protocols.
  Generated database types can be used to interact with the API in a type-safe manner through our TypeScript client library.
  Code snippets are provided to help you get started with using the API in your applications.
  You can also manage API tokens for authentication and access control.
  
  You can set the URL path for the API, manage allowed origins for CORS requests, and create or view API tokens for accessing the API. The API supports both WebSocket and HTTP protocols.`,
  asSeparateFile: true,
  children: [
    {
      type: "input",
      inputType: "text",
      selector: "input#url_path",
      title: "API URL Path",
      description:
        "Set the URL path for the API. This is the base path for all API endpoints.",
    },
    {
      type: "popup",
      title: "Allowed Origin Alert",
      selectorCommand: "AllowedOriginCheck",
      description: "Will only appear if the allowed origin is not set.",
      children: [
        {
          type: "input",
          inputType: "text",
          selectorCommand: "AllowedOriginCheck.FormField",
          title: "Allowed Origin",
          description:
            "Set the allowed origin for CORS requests. This controls which domains can make cross-origin requests to this app by setting the Access-Control-Allow-Origin header.",
        },
      ],
    },
    {
      type: "popup",
      selectorCommand: "APIDetailsWs.Examples",
      title: "Websocket API usage examples",
      description:
        "View examples of how to use the API using typescript and javascript",
      children: [],
    },
    {
      type: "popup",
      selectorCommand: "APIDetailsHttp.Examples",
      title: "HTTP API usage examples",
      description:
        "View examples of how to use the API using typescript and javascript",
      children: [],
    },
    {
      type: "section",
      selectorCommand: "APIDetailsTokens",
      title: "API Tokens",
      description:
        "Shows existing API tokens and allows you to create new ones.",
      children: [
        {
          type: "popup",
          selectorCommand: "APIDetailsTokens.CreateToken",
          title: "Create API Token",
          description:
            "Create a new API token for accessing the API. Tokens can be used for both WebSocket and HTTP API access.",
          children: [
            {
              type: "input",
              inputType: "number",
              selectorCommand:
                "APIDetailsTokens.CreateToken.daysUntilExpiration",
              title: "Expires in (days)",
              description:
                "Set the number of days until the token expires. After expiration, the token will no longer be valid.",
            },
            {
              type: "button",
              selectorCommand: "APIDetailsTokens.CreateToken.generate",
              title: "Generate Token",
              description:
                "Click to generate a new API token. The token will be displayed once generated. After generation, the code examples will be updated to include the new token.",
            },
          ],
        },
      ],
    },
  ],
} satisfies UIDocElement;
