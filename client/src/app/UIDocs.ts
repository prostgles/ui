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
      type: "link";
      children: UIDocElement[];
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
  prevDocs: (UIDocContainers | UIDocElement)[] = [],
):
  | ({
      prevTitles: string[];
    } & (UIDocContainers | UIDocElement))[]
  | undefined => {
  if (!doc) return [];
  const prevTitles = [...prevDocs.map((d) => d.title), doc.title];
  const children =
    "children" in doc ? doc.children
    : "itemContent" in doc ? doc.itemContent
    : undefined;
  if (!children) {
    return [
      {
        prevTitles,
        ...doc,
      },
    ];
  }
  return children.flatMap((childDoc: UIDocContainers | UIDocElement) => {
    const flatChildren = getFlatDocs(childDoc, [...prevDocs, doc]) ?? [];
    return [
      {
        prevTitles,
        ...doc,
      },
      ...flatChildren,
    ];
  });
};

export const flatDocs = UIDocs.map((doc) => getFlatDocs(doc));
console.log(flatDocs);
