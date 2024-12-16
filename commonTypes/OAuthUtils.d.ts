export declare const OAuthProviderOptions: {
  google: {
    scopes: {
      key: string;
      subLabel: string;
    }[];
  };
  facebook: {
    scopes: {
      key: string;
      subLabel: string;
    }[];
  };
  github: {
    scopes: {
      key: string;
      subLabel: string;
    }[];
  };
  microsoft: {
    scopes: {
      key: string;
      subLabel: string;
    }[];
    /**
     * Indicates the type of user interaction that is required.
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/src/request/AuthorizationUrlRequest.ts
     */
    prompts: {
      key: string;
      subLabel: string;
    }[];
  };
};
