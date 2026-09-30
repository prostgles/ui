import { getProstglesMCPFullToolName } from "@common/mcpUtils";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { DIRECTORIES } from "../electronConfig";

type AssertIconExistsArgs = {
  iconName: string;
  errorContext?: string;
};

export const assertIconExists = (arg: AssertIconExistsArgs): void => {
  const { iconName, errorContext } = arg;

  const iconPath = join(DIRECTORIES.CLIENT_ICONS, `${iconName}.svg`);
  if (existsSync(iconPath)) return;

  const top10Icons = readdirSync(DIRECTORIES.CLIENT_ICONS)
    .slice(0, 10)
    .map((fileName) => fileName.slice(0, -4)); // remove .svg extension

  throw new Error(
    `${errorContext}. Icon "${iconName}" does not exist. Use ${getProstglesMCPFullToolName("prostgles-ui", "find_icons")} mcp tool to search. The following are example valid icons (not a complete list): ${top10Icons.join(", ")}`,
  );
};
