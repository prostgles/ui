import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { SUser } from "@src/authConfig/sessionUtils";
import {
  createFunctionGroupDefiner,
  createFunctionsDefiner,
} from "prostgles-server";

export const defineFunctionGroup = createFunctionGroupDefiner<
  DBGeneratedSchema,
  SUser
>();

export const defineFunctionGroupFunctions = createFunctionsDefiner<
  DBGeneratedSchema,
  SUser
>();
