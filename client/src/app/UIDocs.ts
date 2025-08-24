import type { Route } from "react-router-dom";
import type { DBSSchema } from "../../../common/publishUtils";
import { ROUTES } from "../../../common/utils";
import { isPlaywrightTest } from "../i18n/i18nUtils";
import type { Command } from "../Testing";
import { isDefined } from "../utils";
import { domToThemeAwareSVG } from "./domToSVG/domToThemeAwareSVG";
import { accountUIDoc } from "./UIDocs/accountUIDoc";
import { commandPaletteUIDoc } from "./UIDocs/commandPaletteUIDoc";
import { dashboardUIDoc } from "./UIDocs/connection/dashboardUIDoc";
import { connectionsUIDoc } from "./UIDocs/connectionsUIDoc";
import { desktopInstallationUIDoc } from "./UIDocs/desktopInstallation";
import { navbarUIDoc } from "./UIDocs/navbarUIDoc";
import { overviewUIDoc } from "./UIDocs/overviewUIDoc";
import { serverSettingsUIDoc } from "./UIDocs/serverSettingsUIDoc";
import { UIInstallation } from "./UIDocs/UIInstallationUIDoc";
import { connectionConfigUIDoc } from "./UIDocs/connection/connectionConfigUIDoc";
import { editConnectionUIDoc } from "./UIDocs/editConnectionUIDoc";

type Route = (typeof ROUTES)[keyof typeof ROUTES];

type UIDocCommon = {
  title: string;
  description: string;
  /**
   * If defined, this will be used to generate a separate section in the documentation.
   */
  docs?: string;
  /**
   * If true AND docs is defined, this will be saved as a separate file in the documentation.
   * By default, a single file is generated for each root UIDoc.
   */
  asSeparateFile?: boolean;

  /** If true then this is not available for Prostgles Desktop */
  uiVersionOnly?: true;
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
      path: Route;
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
    }>
  | (UIDocCommon & {
      type: "info";
    });

export type UIDocPage = UIDocCommon & {
  type: "page";
  path: Route;
  pathItem?: {
    tableName: keyof DBSSchema;
    selectorCommand?: Command;
    selector?: string;
    selectorPath?: Route;
  };
  children: UIDocElement[];
};
export type UIDocContainers =
  | UIDocPage
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
  overviewUIDoc,
  UIInstallation,
  desktopInstallationUIDoc,
  navbarUIDoc,
  connectionsUIDoc,
  {
    ...editConnectionUIDoc,
    path: ROUTES.NEW_CONNECTION,
  },
  dashboardUIDoc,
  connectionConfigUIDoc,
  serverSettingsUIDoc,
  accountUIDoc,
  commandPaletteUIDoc,
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
    : "pageContent" in doc ? doc.pageContent
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
export type UIDocNonInfo = Exclude<UIDoc, { type: "info" }>;
export type UIDocFlat = UIDocNonInfo & {
  parentTitles: string[];
  parentDocs: UIDoc[];
};
export const flatDocs = UIDocs.filter((d) => d.type !== "info")
  .map((doc) => getFlatDocs(doc))
  .filter(isDefined)
  .flat() as UIDocFlat[];

if (isPlaywrightTest) {
  window.toSVG = domToThemeAwareSVG;
}
