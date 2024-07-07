import type { PublishMethods } from "prostgles-server/dist/PublishParser/PublishParser";
import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
export type Users = Required<DBSchemaGenerated["users"]["columns"]>;
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
import type { AnyObject } from "prostgles-types";
import type { SampleSchema } from "../../../commonTypes/utils";
export declare const publishMethods: PublishMethods<DBSchemaGenerated>;
export declare const is: {
    readonly string: (v: any, notEmtpy?: boolean) => v is string;
    readonly integer: (v: any) => v is number;
    readonly number: (v: any) => v is number;
    readonly object: (v: any) => v is Record<string, any>;
    readonly oneOf: <T>(v: any, vals: T[]) => v is T;
};
export declare const checkIf: <Obj, isType extends "string" | "number" | "object" | "oneOf" | "integer">(obj: Obj, key: keyof Obj, isType: isType, arg1?: Parameters<{
    readonly string: (v: any, notEmtpy?: boolean) => v is string;
    readonly integer: (v: any) => v is number;
    readonly number: (v: any) => v is number;
    readonly object: (v: any) => v is Record<string, any>;
    readonly oneOf: <T>(v: any, vals: T[]) => v is T;
}[isType]>[1] | undefined) => true;
export declare const getSampleSchemas: () => Promise<SampleSchema[]>;
export declare const runConnectionQuery: (connId: string, query: string, args?: AnyObject | any[]) => Promise<AnyObject[]>;
//# sourceMappingURL=publishMethods.d.ts.map