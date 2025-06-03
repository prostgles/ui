import type { Route } from "react-router-dom";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import type { ROUTES } from "../../../commonTypes/utils";
import { isPlaywrightTest } from "../i18n/i18nUtils";
import type { Command } from "../Testing";
import { isDefined } from "../utils";
import { domToSVG } from "./domToSVG/domToSVG";
import { accountUIDoc } from "./UIDocs/accountUIDoc";
import { authenticationUIDoc } from "./UIDocs/authenticationUIDoc";
import { commandSearchUIDoc } from "./UIDocs/commandSearchUIDoc";
import { dashboardUIDoc } from "./UIDocs/connection/dashboardUIDoc";
import { connectionsUIDoc } from "./UIDocs/connectionsUIDoc";
import { gettingStarted } from "./UIDocs/gettingStarted";
import { navbarUIDoc } from "./UIDocs/navbarUIDoc";
import { serverSettingsUIDoc } from "./UIDocs/serverSettingsUIDoc";

type Route = (typeof ROUTES)[keyof typeof ROUTES];

type UIDocCommon = {
  title: string;
  description: string;
  docs?: string;
};

/**
 * UI Documentation system for generating interactive element guides and documentation.
 * Defines structured metadata for UI elements including selectors, types, and hierarchical relationships.
 * Used for automated testing, user guidance, and generating SVG documentation from DOM elements.
 */
type UIDocBase<T> = (
  | {
      selector: string;
      selectorCommand?: undefined;
    }
  | {
      selector?: undefined;
      /**
       * data-command attribute of the element to be selected.
       */
      selectorCommand: Command;
    }
) &
  UIDocCommon &
  T;

export type UIDocElement =
  | UIDocBase<{
      type: "button";
    }>
  | UIDocBase<{
      type: "drag-handle";
      direction: "x" | "y";
    }>
  | UIDocBase<{
      type: "canvas";
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
      pagePath: Route;
      /**
       * If defined this means that the final url is `${pagePath}/pathItemRow.id`
       */
      pathItem?: {
        tableName: keyof DBSSchema;
      };
      pageContent?: UIDocElement[];
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

export type UIDocContainers =
  | (UIDocCommon & {
      type: "page";
      path: Route;
      pathItem?: {
        tableName: keyof DBSSchema;
        selectorCommand?: Command;
        selector?: string;
      };
      children: UIDocElement[];
    })
  | UIDocBase<{
      type: "hotkey-popup";
      hotkey: string;
      children: UIDocElement[];
    }>;

export type UIDocNavbar = UIDocBase<{
  type: "navbar";
  docs?: string;
  children: UIDocElement[];
  paths: (Route | { route: Route; exact: true })[];
}>;

export const UIDocs = [
  gettingStarted,
  navbarUIDoc,
  connectionsUIDoc,
  dashboardUIDoc,
  serverSettingsUIDoc,
  accountUIDoc,
  authenticationUIDoc,
  commandSearchUIDoc,
] satisfies (UIDocContainers | UIDocNavbar | UIDocElement)[];

export type UIDoc = UIDocContainers | UIDocElement | UIDocNavbar;
const getFlatDocs = (
  doc: UIDoc | undefined,
  parentDocs: UIDoc[] = [],
):
  | ({
      parentTitles: string[];
      parentDocs: UIDoc[];
    } & UIDoc)[]
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
