/// <reference types="node" />
import { AnyObject, TS_COLUMN_DATA_TYPES } from ".";
export declare function asName(str: string): string;
export declare function stableStringify(data: AnyObject, opts: any): string | undefined;
export declare type TextPatch = {
    from: number;
    to: number;
    text: string;
    md5: string;
};
export declare function getTextPatch(oldStr: string, newStr: string): TextPatch | string;
export declare function unpatchText(original: string, patch: TextPatch): string;
export declare type SyncTableInfo = {
    id_fields: string[];
    synced_field: string;
    throttle: number;
    batch_size: number;
};
export declare type BasicOrderBy = {
    fieldName: string;
    tsDataType: TS_COLUMN_DATA_TYPES;
    asc: boolean;
}[];
export declare type WALConfig = SyncTableInfo & {
    onSendStart?: () => any;
    onSend: (items: any[], fullItems: WALItem[]) => Promise<any>;
    onSendEnd?: (batch: any[], fullItems: WALItem[], error?: any) => any;
    orderBy?: BasicOrderBy;
    historyAgeSeconds?: number;
    DEBUG_MODE?: boolean;
    id?: string;
};
export declare type WALItem = {
    initial?: any;
    current: any;
};
export declare type WALItemsObj = {
    [key: string]: WALItem;
};
export declare class WAL {
    private changed;
    private sending;
    private sentHistory;
    private options;
    private callbacks;
    constructor(args: WALConfig);
    sort: (a?: AnyObject, b?: AnyObject) => number;
    isSending(): boolean;
    isInHistory: (item: AnyObject) => boolean;
    getIdStr(d: AnyObject): string;
    getIdObj(d: AnyObject): AnyObject;
    getDeltaObj(d: AnyObject): AnyObject;
    addData: (data: WALItem[]) => void;
    isOnSending: boolean;
    isSendingTimeout?: ReturnType<typeof setTimeout>;
    willDeleteHistory?: ReturnType<typeof setTimeout>;
    private sendItems;
}
export declare function isEmpty(obj?: any): boolean;
export declare function get(obj: any, propertyPath: string | string[]): any;
export declare function isObject(obj: any): obj is Record<string, any>;
export declare function isDefined<T>(v: T | undefined | void): v is T;
export declare function getKeys<T>(o: T): Array<keyof T>;
export declare type Explode<T> = keyof T extends infer K ? K extends unknown ? {
    [I in keyof T]: I extends K ? T[I] : never;
} : never : never;
export declare type AtMostOne<T> = Explode<Partial<T>>;
export declare type AtLeastOne<T, U = {
    [K in keyof T]: Pick<T, K>;
}> = Partial<T> & U[keyof U];
export declare type ExactlyOne<T> = AtMostOne<T> & AtLeastOne<T>;
//# sourceMappingURL=util.d.ts.map