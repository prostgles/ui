import { isDefined } from "../utils";
import { domToSVG } from "./domToSVG/domToSVG";
import { connectionsUIDoc } from "./ui-docs/connectionsUIDoc";
import { serverSettingsUIDoc } from "./ui-docs/serverSettingsUIDoc";

type UIDocBase<T> = {
  title: string;
  selector: string;
  description: string;
} & T;

export type UIDocElement =
  | UIDocBase<{
      type: "button";
    }>
  | UIDocBase<{
      type: "input";
      inputType: "text" | "number" | "checkbox" | "select";
    }>
  | UIDocBase<{
      type: "text";
      content: string;
    }>
  | UIDocBase<{
      type: "list";
      itemSelector: string;
      itemContent: UIDocElement[];
    }>
  | UIDocBase<{
      type: "select-list";
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
      type: "smartform-popup";
      tableName: string;
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
      type: "smartform";
      tableName: string;
    }>;

export type UIDocContainers = {
  type: "page";
  path: string;
  title: string;
  description: string;
  children: UIDocElement[];
};

export const UIDocs = [
  connectionsUIDoc,
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

window.onkeydown = (e: KeyboardEvent) => {
  if (!e.shiftKey) return;
  e.preventDefault();
  domToSVG(document.body, true);
};
