import { fixIndent } from "../../demo/sqlVideoDemo";
import { UIDocs, type UIDoc, type UIDocElement } from "../UIDocs";

type SeparatePage = { doc: UIDoc; parentDocs: UIDoc[]; depth: number };

const asList = (
  children: UIDocElement[],
  parentDocs: UIDoc[],
  separatePageDepth: number | undefined,
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
      const items = getItemChildren(child);
      if (items.length) {
        const nestedList = asList(
          items,
          [...parentDocs, child],
          separatePageDepth,
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
): {
  title: string;
  content: string;
  doc: UIDoc;
}[] => {
  const depth = Math.min(3, parentDocs.length);

  const { listContent: childrenContent, separatePages } = asList(
    getItemChildren(doc),
    [...parentDocs, doc],
    separatePageDepth,
  );

  const separatePagesWithContent = separatePages.flatMap((sp) =>
    getUIDocAsMarkdown(sp.doc, sp.parentDocs, sp.depth),
  );

  const hDepth = depth + 1;
  const content = [
    `<h${hDepth} id=${JSON.stringify(toSnakeCase(doc.title))}> ${doc.title} </h${hDepth}> \n`,
    `${doc.docs ? fixIndent(doc.docs) : doc.description}\n`,
    childrenContent,
  ].join("\n");

  return [
    {
      title: doc.title,
      doc,
      content,
    },
  ].concat(separatePagesWithContent);
};

type DocumentationFile = {
  fileName: string;
  text: string;
};
export const getDocumentationFiles = () => {
  const documentationPages: DocumentationFile[] = [];
  UIDocs.forEach((doc) => {
    const docItems = getUIDocAsMarkdown(doc, [], undefined);

    const pushFile = (title: string, text: string) => {
      const index = documentationPages.length + 1;
      documentationPages.push({
        fileName: `${index.toString().padStart(2, "0")}_${toSnakeCase(title)}.md`,
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

const getItemChildren = (doc: UIDoc) =>
  "children" in doc ? doc.children
  : "itemContent" in doc ? doc.itemContent
  : "pageContent" in doc ? (doc.pageContent ?? [])
  : [];

const documentation = getDocumentationFiles();
//@ts-ignore
window.documentation = documentation;

export const documentationText = documentation
  .map(({ text }) => text)
  .join("\n\n");
