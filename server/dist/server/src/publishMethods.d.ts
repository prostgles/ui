import { PublishMethods } from "prostgles-server/dist/PublishParser";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
export declare type Users = Required<DBSchemaGenerated["users"]["columns"]>;
export declare type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
import BackupManager from "./BackupManager";
export declare let bkpManager: BackupManager;
export declare const publishMethods: PublishMethods<DBSchemaGenerated>;
export declare const is: {
    readonly string: (v: any, notEmtpy?: boolean) => v is string;
    readonly integer: (v: any) => v is number;
    readonly number: (v: any) => v is number;
    readonly object: (v: any) => v is Record<string, any>;
    readonly oneOf: <T>(v: any, vals: T[]) => v is T;
};
export declare const checkIf: <Obj, isType extends "string" | "number" | "object" | "integer" | "oneOf">(obj: Obj, key: keyof Obj, isType: isType, arg1?: Parameters<{
    readonly string: (v: any, notEmtpy?: boolean) => v is string;
    readonly integer: (v: any) => v is number;
    readonly number: (v: any) => v is number;
    readonly object: (v: any) => v is Record<string, any>;
    readonly oneOf: <T>(v: any, vals: T[]) => v is T;
}[isType]>[1] | undefined) => true;
//# sourceMappingURL=publishMethods.d.ts.map