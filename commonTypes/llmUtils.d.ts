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
    tool_name?: string | undefined;
    content: string | ({
        type: "text";
        text: string;
    } | {
        type: "image";
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
    })[];
    is_error?: boolean | undefined;
}[];
type FilterMatch<T, U> = T extends U ? T : never;
type FilterUnMatch<T, U> = T extends U ? never : T;
export declare const filterArr: <T, U extends Partial<T>>(arr: T[], pattern: U) => FilterMatch<T, U>[];
export declare const filterArrInverse: <T, U extends Partial<T>>(arr: T[], pattern: U) => FilterUnMatch<T, U>[];
export {};
