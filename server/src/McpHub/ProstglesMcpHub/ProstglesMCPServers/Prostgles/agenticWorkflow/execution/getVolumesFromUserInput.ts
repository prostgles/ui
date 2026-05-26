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

  const getPathInfo = async ({
    inputKey,
    inputValue,
    type,
    accessMode,
  }: {
    inputKey: string;
    inputValue: string;
    type: "file" | "dir" | "all";
    accessMode: "read" | "read-write";
  }) => {
    // 1) absolute only
    if (!path.isAbsolute(inputValue)) {
      throw new Error(`Input "${inputKey}" must be an absolute path`);
    }

    // 2) resolve + existence check
    const real = await realpath(inputValue);
    const st = await stat(real);
    if (type === "dir" && !st.isDirectory()) {
      throw new Error(`Input "${inputKey}" must point to a directory`);
    }
    if (type === "file" && !st.isFile()) {
      throw new Error(`Input "${inputKey}" must point to a file`);
    }
    if (type === "all" && !st.isFile() && !st.isDirectory()) {
      throw new Error(`Input "${inputKey}" must point to a file or directory`);
    }

    const extension = extname(inputValue);

    // 4) stable, collision-safe container path
    const slug =
      inputKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) + extension;
    const hash = crypto
      .createHash("sha256")
      .update(inputKey + ":" + inputValue)
      .digest("hex")
      .slice(0, 8);

    const containerPath = `/inputs/${slug}_${hash}`;

    return {
      host: inputValue,
      container: containerPath,
      readOnly: accessMode === "read",
    };
  };

  const userInputWithOverrides: Record<string, string | string[]> = {
    ...userInputValues,
  };
  const items = await Promise.all(
    getObjectEntries(userInput).map(async ([inputKey, inputDef]) => {
      const pathType =
        inputDef.type === "folder-path" || inputDef.type === "folder-paths" ?
          "dir"
        : inputDef.type === "file-path" || inputDef.type === "file-paths" ?
          "file"
        : (
          inputDef.type === "file-or-folder-path" ||
          inputDef.type === "file-or-folder-paths"
        ) ?
          "all"
        : undefined;
      if (!pathType) {
        return;
      }
      const { accessMode } = inputDef as Extract<
        UserInputItem,
        {
          type:
            | "folder-path"
            | "file-path"
            | "file-or-folder-path"
            | "folder-paths"
            | "file-paths"
            | "file-or-folder-paths";
        }
      >;

      const inputValue = userInputValues[inputKey] as
        | string
        | string[]
        | undefined;
      if (
        !inputValue ||
        (Array.isArray(inputValue) && inputValue.length === 0)
      ) {
        return;
      }

      const isArrayType = Array.isArray(inputValue);
      const paths = isArrayType ? inputValue : [inputValue];
      const pathInfos = await Promise.all(
        paths.map((path) =>
          getPathInfo({
            inputKey,
            inputValue: path,
            type: pathType,
            accessMode,
          }),
        ),
      );

      userInputWithOverrides[inputKey] =
        isArrayType ?
          pathInfos.map((p) => p.container)
        : pathInfos[0]!.container;
      return pathInfos;
    }),
  );
  const volumes = items.filter(isDefined).flat();
  return {
    volumes,
    userInputWithOverrides,
  };
};
