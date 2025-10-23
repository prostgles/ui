import { filterArrInverse } from "@common/llmUtils";
import type { DBSSchema } from "@common/publishUtils";
import type { ROUTES } from "@common/utils";
import type { Route } from "react-router-dom";
import { isPlaywrightTest } from "../i18n/i18nUtils";
import type { Command } from "../Testing";
import { isDefined } from "../utils";
import { domToThemeAwareSVG } from "./domToSVG/domToThemeAwareSVG";
import { accountUIDoc } from "./UIDocs/accountUIDoc";
import { commandPaletteUIDoc } from "./UIDocs/commandPaletteUIDoc";
import { connectionConfigUIDoc } from "./UIDocs/connection/connectionConfigUIDoc";
import { dashboardUIDoc } from "./UIDocs/connection/dashboardUIDoc";
import { connectionsUIDoc } from "./UIDocs/connectionsUIDoc";
import { desktopInstallationUIDoc } from "./UIDocs/desktopInstallation";
import { navbarUIDoc } from "./UIDocs/navbarUIDoc";
import { overviewUIDoc } from "./UIDocs/overviewUIDoc";
import { serverSettingsUIDoc } from "./UIDocs/serverSettingsUIDoc";
import { UIInstallation } from "./UIDocs/UIInstallationUIDoc";
import { getSVGif } from "./domToSVG/SVGif/getSVGif";

/**
 * The purpose of UIDocs is to provide structured metadata about the UI elements.
 * This metadata is used for:
 * 1. Command Palette. It requires a list of all UI elements and their relationships to enable quick navigation.
 * 2. Documentation. Generating user guides and documentation with screenshots and descriptions.
 * 3. Automated testing to ensure UI elements are present and functional.
 *
 * Each UIDoc describes a UI element or a group of elements, including their type, selector, description, and hierarchical relationships.
 * This structured approach allows for easy maintenance and scalability of the documentation system.
 */

type UIDocCommon = {
  title: string;

  /**
   * Optional mdi icon path representing the element, enhancing visual identification in the Command Palette.
   */
  iconPath?: string;

  /**
   * Short description of the element's purpose or functionality used in Command Palette.
   */
  description: string;

  /**
   * If defined, this will be used to generate a separate section in the documentation.
   */
  docs?: string;

  /**
   * If defined, this will be used as the title for the children list in the documentation.
   */
  childrenTitle?: string;

  docOptions?: /**
   * If docs is defined, then it will be rendered as a separate header in the documentation with this title.
   */
  | { title: string }
    /**
     * If "asSeparateFile" AND docs is defined, this will be saved as a separate file in the documentation.
     * By default, a single file is generated for each root UIDoc with child items with docs appended to the bottom.
     */
    | "asSeparateFile"
    /**
     * Hides children from documentation. Meant to be used when the children content is obvious/documented on the parent.
     */
    | "hideChildren";

  /** If true then this is not available for Prostgles Desktop */
  uiVersionOnly?: true;

  /** DBS table info that allows searching it by name */
  entity?: {
    tableName: keyof DBSSchema;
  };
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

type Route = (typeof ROUTES)[keyof typeof ROUTES];

export type UIDocInputElement = UIDocBase<{
  type: "input";
  inputType: "text" | "number" | "checkbox" | "select" | "file";
}>;

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
  | UIDocInputElement
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
      /**
       * Documentation-only. Does not appear in Command Palette.
       */
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
      hotkey: ["Ctrl" | "Alt" | "Shift", "A" | "K"];
      children: UIDocElement[];
    }>;

export type UIDocNavbar = UIDocBase<{
  type: "navbar";
  docs?: string;
  children: UIDocElement[];
  /**
   * List of paths the navbar appears on.
   */
  paths: (Route | { route: Route; exact: true })[];
}>;

export type UIDoc = UIDocContainers | UIDocElement | UIDocNavbar;

export const UIDocs = [
  overviewUIDoc,
  UIInstallation,
  desktopInstallationUIDoc,
  navbarUIDoc,
  connectionsUIDoc,
  dashboardUIDoc,
  connectionConfigUIDoc,
  serverSettingsUIDoc,
  accountUIDoc,
  commandPaletteUIDoc,
] satisfies UIDoc[];

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
export const flatUIDocs = filterArrInverse(UIDocs, { type: "info" } as const)
  .map((doc) => getFlatDocs(doc))
  .filter(isDefined)
  .flat() as UIDocFlat[];
window.flatUIDocs = flatUIDocs;

if (isPlaywrightTest) {
  window.toSVG = domToThemeAwareSVG;
  window.getSVGif = getSVGif;
}
