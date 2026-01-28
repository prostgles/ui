import type {
  DBGeneratedSchema,
  GeneratedFunctionSchema,
} from "@common/DBGeneratedSchema";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";

export type DBSMethods = Partial<GeneratedFunctionSchema>;

const AdminTableNames = ["connections", "global_settings"] as const;

export type DBS = DBHandlerClient<DBGeneratedSchema> & {
  sql: DBHandlerClient["sql"];
};

type AsOptional<T, Keys extends keyof Partial<T> & string> = Omit<T, Keys> & {
  [K in Keys]?: Partial<T[K]>;
};

export type DbsByUserType = AsOptional<DBS, (typeof AdminTableNames)[number]>;
