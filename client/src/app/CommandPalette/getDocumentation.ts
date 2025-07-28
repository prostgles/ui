import { isObject } from "../../../../commonTypes/publishUtils";
import { fixIndent } from "../../demo/sqlVideoDemo";
import { COMMANDS } from "../../Testing";
import { flatDocs, UIDocs, type UIDoc, type UIDocElement } from "../UIDocs";

type SeparatePage = { doc: UIDoc; parentDocs: UIDoc[]; depth: number };

const asList = (
  children: UIDocElement[],
  parentDocs: UIDoc[],
  separatePageDepth: number | undefined,
  isElectron: boolean,
) => {
  const depth = parentDocs.length;
  const listItemDepth = depth - (separatePageDepth ?? 1);

  const separatePages: SeparatePage[] = [];

  const listContent: string = children
    .map((child) => {
      const willSeparatelyRender = child.docs;
      if (willSeparatelyRender) {
        separatePages.push({ doc: child, depth, parentDocs });
      }

      const listTitle =
        willSeparatelyRender ?
          `<a href=${JSON.stringify(`#${toSnakeCase(child.title)}`)}>${child.title}</a>`
        : `**${child.title}**`;
      const listItem = `${"  ".repeat(listItemDepth)}- ${listTitle}: ${child.description}  `;
      if (willSeparatelyRender) {
        return listItem;
      }
      const items = getItemChildren(child, isElectron);
      if (items.length) {
        const nestedList = asList(
          items,
          [...parentDocs, child],
          separatePageDepth,
          isElectron,
        );
        nestedList.separatePages.forEach((sp) => separatePages.push(sp));
        return listItem + "\n" + nestedList.listContent;
      }
      return listItem;
    })
    .join("\n");

  return {
    listContent,
    separatePages,
  };
};

const getUIDocAsMarkdown = (
  doc: UIDoc,
  parentDocs: UIDoc[],
  separatePageDepth: number | undefined,
  isElectron: boolean,
): {
  title: string;
  content: string;
  doc: UIDoc;
}[] => {
  const depth = doc.asSeparateFile ? 0 : Math.min(3, parentDocs.length);
  if (isElectron && doc.uiVersionOnly) {
    return [];
  }
  const { listContent: childrenContent, separatePages } = asList(
    getItemChildren(doc, isElectron),
    [...parentDocs, doc],
    separatePageDepth,
    isElectron,
  );

  const separatePagesWithContent = separatePages.flatMap((sp) =>
    getUIDocAsMarkdown(sp.doc, sp.parentDocs, sp.depth, isElectron),
  );

  if (doc.uiVersionOnly) {
    const sel = "selectorCommand" in doc ? doc.selectorCommand : undefined;
    const cmdInfo = sel && COMMANDS[sel];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!cmdInfo || !isObject(cmdInfo) || !cmdInfo.uiOnly) {
      throw new Error(
        `UI Version Only documentation for "${doc.title}" does not have a valid selectorCommand.`,
      );
    }
  }

  const hDepth = depth + 1;
  const content = [
    `<h${hDepth} id=${JSON.stringify(toSnakeCase(doc.title))}> ${doc.title} </h${hDepth}> \n`,
    doc.uiVersionOnly ? `>  Not available on Desktop version\n  ` : "",
    `${doc.docs ? fixIndent(doc.docs) : doc.description}\n`,
    childrenContent,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    {
      title: doc.title,
      doc,
      content,
    },
  ].concat(separatePagesWithContent);
};

export type DocumentationFile = {
  fileName: string;
  text: string;
};
export const getDocumentationFiles = (isElectron: boolean) => {
  const documentationPages: DocumentationFile[] = [];
  UIDocs.forEach((doc) => {
    const docItems = getUIDocAsMarkdown(doc, [], undefined, isElectron);

    const pushFile = (title: string, text: string) => {
      const index = documentationPages.length + 1;
      documentationPages.push({
        fileName: `${index.toString().padStart(2, "0")}_${title.replaceAll(" ", "_")}.md`,
        text,
      });
    };
    if (documentationPages.length) {
      pushFile(doc.title, "");
    }
    do {
      const lastFile = documentationPages.at(-1);
      const currDocItem = docItems.shift();
      if (!currDocItem) {
        continue;
      }
      if (!lastFile || currDocItem.doc.asSeparateFile) {
        const title =
          currDocItem.doc.asSeparateFile ? currDocItem.doc.title : doc.title;
        pushFile(title, currDocItem.content + "\n\n");
      } else {
        lastFile.text += currDocItem.content + "\n\n";
      }
    } while (docItems.length);
  });

  return documentationPages;
};

const toSnakeCase = (str: string) =>
  str.toLowerCase().trim().replaceAll(/ /g, "_");

const getItemChildren = (doc: UIDoc, isElectron: boolean) => {
  const items =
    "children" in doc ? doc.children
    : "itemContent" in doc ? doc.itemContent
    : "pageContent" in doc ? (doc.pageContent ?? [])
    : [];

  if (isElectron) {
    return items.filter((item) => !item.uiVersionOnly);
  }
  return items;
};

window.documentation = getDocumentationFiles(false);
window.flatDocs = flatDocs;
