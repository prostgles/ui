import { Icon } from "@components/Icon/Icon";
import {
  mdiBash,
  mdiCodeJson,
  mdiDocker,
  mdiFileDocument,
  mdiFileDocumentOutline,
  mdiFilePdfBox,
  mdiImage,
  mdiLanguageGo,
  mdiLanguageHtml5,
  mdiLanguageJavascript,
  mdiLanguagePython,
  mdiLanguageRuby,
  mdiLanguageTypescript,
  mdiMicrosoftWord,
  mdiPound,
  mdiReact,
} from "@mdi/js";
import React from "react";

export const FileIcon = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => {
  const extension = name.toLowerCase().split(".").at(-1) ?? "";
  const { iconPath, color } = FILE_EXTENSION_TO_ICON_INFO[extension] ?? {};
  return (
    <Icon
      color={color}
      path={iconPath || mdiFileDocument}
      sizePx={20}
      className={className + " text-1"}
    />
  );
};

export const FILE_EXTENSION_TO_ICON_INFO: Record<
  string,
  { label: string; iconPath?: string; color?: string }
> = {
  ts: {
    iconPath: mdiLanguageTypescript,
    label: "typescript",
    color: "#3178c6",
  },
  mjs: { iconPath: mdiReact, label: "javascript", color: "#cbb60b" },
  cjs: { iconPath: mdiReact, label: "javascript", color: "#cbb60b" },
  jsx: { iconPath: mdiReact, label: "javascript", color: "#34bee4" },
  tsx: { iconPath: mdiReact, label: "typescript", color: "#34bee4" },
  js: {
    iconPath: mdiLanguageJavascript,
    label: "javascript",
    color: "#cbb60b",
  },
  py: { iconPath: mdiLanguagePython, label: "python", color: "#3776ab" },
  rb: { iconPath: mdiLanguageRuby, label: "ruby", color: "#cc342d" },
  go: { iconPath: mdiLanguageGo, label: "go", color: "#00add8" },
  sh: { iconPath: mdiBash, label: "shell", color: "#4fa816" },
  dockerfile: { iconPath: mdiDocker, label: "dockerfile", color: "#2496ed" },
  txt: { label: "plaintext" },
  json: { iconPath: mdiCodeJson, label: "json", color: "#c69b19" },
  yaml: { label: "yaml", color: "#cb171e" },
  css: { iconPath: mdiPound, label: "css", color: "#1572b6" },
  html: { label: "html", iconPath: mdiLanguageHtml5, color: "#e34f26" },
  md: { iconPath: mdiFileDocumentOutline, label: "markdown", color: "#083fa1" },
  pdf: { iconPath: mdiFilePdfBox, label: "pdf", color: "#f40f02" },
  doc: { iconPath: mdiMicrosoftWord, label: "doc", color: "#2b579a" },
  docx: { iconPath: mdiMicrosoftWord, label: "docx", color: "#2b579a" },
  png: { iconPath: mdiImage, label: "png", color: "#af4c99" },
  jpg: { iconPath: mdiImage, label: "jpg", color: "#af4c99" },
  sql: { label: "sql", color: "#336791" },
  Dockerfile: { iconPath: mdiDocker, label: "dockerfile", color: "#2496ed" },
};
