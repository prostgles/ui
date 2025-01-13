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
    customOAuth: {};
};
export declare const EMAIL_CONFIRMED_SEARCH_PARAM: "email-confirmed";
export declare const PASSWORDLESS_ADMIN_USERNAME = "passwordless_admin";
type TemplateData = Record<string, {
    required?: boolean;
    value: string;
}>;
export declare const getEmailFromTemplate: <EmailTemplate extends {
    body: string;
    from: string;
    subject: string;
}>(template: EmailTemplate, subjectData: TemplateData, bodyData: TemplateData) => EmailTemplate;
export declare const MOCK_SMTP_HOST = "prostgles-test-mock";
export declare const DEFAULT_EMAIL_VERIFICATION_TEMPLATE: {
    readonly from: "noreply@abc.com";
    readonly subject: "Please verify your email address";
    readonly body: string;
};
export declare const DEFAULT_MAGIC_LINK_TEMPLATE: {
    readonly from: "noreply@abc.com";
    readonly subject: "Login to your account";
    readonly body: string;
};
export declare const getMagicLinkEmailFromTemplate: ({ url, template, code, }: {
    url: string;
    code: string;
    template: {
        from: string;
        subject: string;
        body: string;
    };
}) => {
    from: string;
    subject: string;
    body: string;
};
export declare const getVerificationEmailFromTemplate: ({ url, code, template, }: {
    code: string;
    url: string;
    template: {
        from: string;
        subject: string;
        body: string;
    };
}) => {
    from: string;
    subject: string;
    body: string;
};
export {};
