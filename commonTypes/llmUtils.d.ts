import { DBSSchema } from "./publishUtils";
export type LLMMessage = DBSSchema["llm_messages"];
export declare const getLLMMessageText: ({ message, }: Pick<LLMMessage, "message">) => string;
export declare const getLLMMessageToolUse: ({ message, }: Pick<LLMMessage, "message">) => {
    type: "tool_use";
    id: string;
    name: string;
    input: any;
}[];
export declare const getLLMMessageToolUseResult: ({ message, }: Pick<LLMMessage, "message">) => {
    type: "tool_result";
    tool_use_id: string;
    tool_name: string;
    content: string | ({
        type: "text";
        text: string;
    } | {
        type: "image" | "audio";
        mimeType: string;
        data: string;
    } | {
        type: "resource";
        resource: {
            uri: string;
            mimeType?: string | undefined;
            text?: string | undefined;
            blob?: string | undefined;
        };
    } | {
        type: "resource_link";
        uri: string;
        name: string;
        mimeType?: string | undefined;
        description?: string | undefined;
    })[];
    is_error?: boolean | undefined;
}[];
type FilterMatch<T, U> = T extends U ? T : never;
type FilterUnMatch<T, U> = T extends U ? never : T;
export declare const filterArr: <T, U extends Partial<T>>(arr: T[] | readonly T[], pattern: U) => FilterMatch<T, U>[];
export declare const filterArrInverse: <T, U extends Partial<T>>(arr: T[], pattern: U) => FilterUnMatch<T, U>[];
export declare const LLM_PROMPT_VARIABLES: {
    readonly PROSTGLES_SOFTWARE_NAME: "${prostglesSoftwareName}";
    readonly SCHEMA: "${schema}";
    readonly DASHBOARD_TYPES: "${dashboardTypes}";
    readonly TODAY: "${today}";
};
export declare const reachedMaximumNumberOfConsecutiveToolRequests: (messages: Pick<DBSSchema["llm_messages"], "message">[], limit: number, onlyFailed?: boolean) => boolean;
export declare const isAssistantMessageRequestingToolUse: (message: Pick<DBSSchema["llm_messages"], "message"> | undefined) => message is Required<{
    chat_id: number;
    cost?: string | undefined;
    created?: string | null | undefined;
    id?: string | undefined;
    llm_model_id?: number | null | undefined;
    message: ({
        type: "text";
        text: string;
        reasoning?: string | undefined;
    } | {
        type: "text" | "image" | "audio" | "video" | "application";
        source: {
            type: "base64";
            media_type: string;
            data: string;
        };
    } | {
        type: "tool_result";
        tool_use_id: string;
        tool_name: string;
        content: string | ({
            type: "text";
            text: string;
        } | {
            type: "image" | "audio";
            mimeType: string;
            data: string;
        } | {
            type: "resource";
            resource: {
                uri: string;
                mimeType?: string | undefined;
                text?: string | undefined;
                blob?: string | undefined;
            };
        } | {
            type: "resource_link";
            uri: string;
            name: string;
            mimeType?: string | undefined;
            description?: string | undefined;
        })[];
        is_error?: boolean | undefined;
    } | {
        type: "tool_use";
        id: string;
        name: string;
        input: any;
    })[];
    meta?: any;
    user_id?: string | null | undefined;
}>;
export {};
