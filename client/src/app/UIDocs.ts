import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { isPlaywrightTest } from "../i18n/i18nUtils";
import type { Command } from "../Testing";
import { isDefined } from "../utils";
import { domToSVG } from "./domToSVG/domToSVG";
import { connectionUIDoc } from "./UIDocs/connection/connectionUIDoc";
import { connectionsUIDoc } from "./UIDocs/connectionsUIDoc";
import { serverSettingsUIDoc } from "./UIDocs/serverSettingsUIDoc";

type UIDocBase<T> = (
  | {
      selector: string;
      selectorCommand?: undefined;
    }
  | {
      selector?: undefined;
      selectorCommand: Command;
    }
) & {
  title: string;
  description: string;
} & T;

export type UIDocElement =
  | UIDocBase<{
      type: "button";
    }>
  | UIDocBase<{
      type: "drag-handle";
      direction: "x" | "y";
    }>
  | UIDocBase<{
      type: "input";
      inputType: "text" | "number" | "checkbox" | "select" | "file";
    }>
  | UIDocBase<{
      type: "text";
    }>
  | UIDocBase<{
      type: "list";
      itemSelector: string;
      itemContent: UIDocElement[];
    }>
  | UIDocBase<{
      type: "select";
    }>
  | UIDocBase<{
      type: "link";
      pagePath: string;
    }>
  | UIDocBase<{
      type: "popup";
      children: UIDocElement[];
    }>
  | UIDocBase<{
      type: "tab" | "accordion-item";
      children: UIDocElement[];
    }>
  | UIDocBase<{
      type: "section";
      children: UIDocElement[];
    }>
  | UIDocBase<{
      type: "smartform" | "smartform-popup";
      tableName: string;
      fieldNames?: string[];
    }>;

export type UIDocContainers = {
  type: "page";
  path: string;
  pathItem?: {
    tableName: keyof DBSSchema;
  };
  title: string;
  description: string;
  children: UIDocElement[];
};

export const UIDocs = [
  connectionsUIDoc,
  connectionUIDoc,
  serverSettingsUIDoc,
] satisfies UIDocContainers[];

const getFlatDocs = (
  doc: UIDocContainers | UIDocElement | undefined,
  parentDocs: (UIDocContainers | UIDocElement)[] = [],
):
  | ({
      parentTitles: string[];
      parentDocs: (UIDocContainers | UIDocElement)[];
    } & (UIDocContainers | UIDocElement))[]
  | undefined => {
  if (!doc) return [];
  const parentTitles = parentDocs.map((d) => d.title);
  const children =
    "children" in doc ? doc.children
    : "itemContent" in doc ? doc.itemContent
    : undefined;
  if (!children?.length) {
    return [
      {
        parentTitles,
        ...doc,
        parentDocs,
      },
    ];
  }

  const nextParentDocs = [...parentDocs, doc];
  const flatChildren = children.flatMap(
    (childDoc: UIDocContainers | UIDocElement) => {
      const flatChildren = getFlatDocs(childDoc, nextParentDocs) ?? [];
      return flatChildren;
    },
  );
  return [
    {
      parentTitles,
      ...doc,
      parentDocs,
    },
    ...flatChildren,
  ];
};

export const flatDocs = UIDocs.map((doc) => getFlatDocs(doc))
  .filter(isDefined)
  .flat();

if (isPlaywrightTest) {
  //@ts-ignore
  window.toSVG = domToSVG;
}
// window.onkeydown = (e: KeyboardEvent) => {
//   if (!e.shiftKey) return;
//   e.preventDefault();
//   domToSVG(document.body, true);
// };
