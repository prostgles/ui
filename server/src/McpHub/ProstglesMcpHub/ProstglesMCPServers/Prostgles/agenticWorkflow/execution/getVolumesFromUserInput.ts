import { getObjectEntries, isDefined } from "prostgles-types";
import type { UserInputItem } from "../runtimeSdk/defineAgenticWorkflow";
import path from "path";
import { realpath, stat } from "fs/promises";
import crypto from "node:crypto";
import { extname } from "node:path";

export const getVolumesFromUserInput = async ({
  userInput,
  userInputValues,
}: {
  userInput: Record<string, UserInputItem> | undefined;
  userInputValues: Record<string, any> | undefined;
}) => {
  if (!userInput || !userInputValues) return undefined;

  const userInputWithOverrides: Record<string, string> = { ...userInputValues };
  const items = await Promise.all(
    getObjectEntries(userInput).map(async ([inputKey, inputDef]) => {
      if (inputDef.type !== "folder-path" && inputDef.type !== "file-path") {
        return;
      }
      const { accessMode, type } = inputDef;

      const inputValue = (
        userInputValues[inputKey] as string | undefined
      )?.trim();
      if (!inputValue) {
        return;
      }

      // 1) absolute only
      if (!path.isAbsolute(inputValue)) {
        throw new Error(`Input "${inputKey}" must be an absolute path`);
      }

      // 2) resolve + existence check
      const real = await realpath(inputValue);
      const st = await stat(real);
      if (type === "folder-path" && !st.isDirectory()) {
        throw new Error(`Input "${inputKey}" must point to a directory`);
      }
      if (type === "file-path" && !st.isFile()) {
        throw new Error(`Input "${inputKey}" must point to a file`);
      }

      const extension = extname(inputValue);

      // 4) stable, collision-safe container path
      const slug =
        inputKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) + extension;
      const hash = crypto
        .createHash("sha256")
        .update(inputKey)
        .digest("hex")
        .slice(0, 8);

      const containerPath = `/inputs/${slug}_${hash}`;

      userInputWithOverrides[inputKey] = containerPath;
      return {
        host: inputValue,
        container: containerPath,
        readOnly: accessMode === "read",
      };
    }),
  );
  const volumes = items.filter(isDefined);
  return {
    volumes,
    userInputWithOverrides,
  };
};
