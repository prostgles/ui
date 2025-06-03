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

      const title = `${"  ".repeat(listItemDepth)}- **${child.title}**: ${child.description}  `;
      if (willSeparatelyRender) {
        return title;
      }
      const items = getItemChildren(child);
      if (items.length) {
        const nestedList = asList(
          items,
          [...parentDocs, child],
          separatePageDepth,
        );
        nestedList.separatePages.forEach((sp) => separatePages.push(sp));
        return title + "\n" + nestedList.listContent;
      }
      return title;
    })
    .join("\n");

  // const separatePageContent = separatePages
  //   .map((sp) => getUIDocAsMarkdown(sp.doc, sp.parentDocs, sp.depth))
  //   .join("\n");

  // return (
  //   listContent + (separatePageContent ? `\n\n${separatePageContent}` : "")
  // );
  return {
    listContent,
    separatePages,
  };
};

const getUIDocAsMarkdown = (
  doc: UIDoc,
  parentDocs: UIDoc[],
  separatePageDepth: number | undefined,
): string => {
  const depth = Math.min(3, parentDocs.length);
  const parentPathTitle = parentDocs.map((d) => d.title).join(" > ");
  const subTitle = parentPathTitle ? `*${parentPathTitle}*  \n  ` : "";
  if (doc.title === "Connection list") {
    debugger;
  }

  const { listContent: childrenContent, separatePages } = asList(
    getItemChildren(doc),
    [...parentDocs, doc],
    separatePageDepth,
  );

  const separatePageContent = separatePages
    .map((sp) => getUIDocAsMarkdown(sp.doc, sp.parentDocs, sp.depth))
    .join("\n");

  return [
    `#${"#".repeat(depth)} ${doc.title}`,
    subTitle,
    `${doc.docs ?? doc.description}\n`,
    childrenContent,
    separatePageContent,
  ].join("\n");
};

export const getDocumentation = () => {
  const documentationPages = UIDocs.map((doc) => {
    const docItem = getUIDocAsMarkdown(doc, [], undefined);
    const text = docItem + "\n\n";

    const snakeCaseTitle = doc.title.toLowerCase().trim().replaceAll(/ /g, "_");
    return {
      title: snakeCaseTitle,
      text,
    };
  });

  return documentationPages;
};

const getItemChildren = (doc: UIDoc) =>
  "children" in doc ? doc.children
  : "itemContent" in doc ? doc.itemContent
  : "pageContent" in doc ? (doc.pageContent ?? [])
  : [];

export const documentation = getDocumentation()
  .map(({ text }) => text)
  .join("\n\n");
