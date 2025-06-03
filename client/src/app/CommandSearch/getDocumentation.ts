import { flatDocs, UIDocs, type UIDoc, type UIDocElement } from "../UIDocs";

const maxDepthForMarkdown = 6;
export const documentation = flatDocs
  .map((doc) => {
    const depth = Math.min(maxDepthForMarkdown, doc.parentTitles.length + 1);
    const title = `${"#".repeat(depth)} ${doc.title}`;
    return [title, doc.docs ?? doc.description].join("\n\n");
  })
  .join("\n\n");

type SeparatePage = { doc: UIDoc; parentDocs: UIDoc[]; depth: number };
const separatePages: SeparatePage[] = [];

const asList = (
  children: UIDocElement[],
  parentDocs: UIDoc[],
  separatePage: SeparatePage | undefined,
) => {
  const depth = parentDocs.length;
  const listItemDepth = depth - (separatePage?.depth ?? 1);
  return children
    .map((child) => {
      /** This one must be within the AI section */
      if (child.title.includes("Message input and footer actions")) {
        debugger;
      }
      // const willSeparatelyRender = !separatePage && child.docs;
      const willSeparatelyRender = child.docs;
      if (willSeparatelyRender) {
        if (separatePage) {
          console.log(separatePage.doc.title, ">", child.title);
        }
        separatePages.push({ doc: child, depth, parentDocs });
      }
      let result = `${"  ".repeat(listItemDepth)}- **${child.title}**: ${child.description}  `;
      const items = willSeparatelyRender ? [] : getItemChildren(child);
      if (items.length) {
        result += "\n" + asList(items, [...parentDocs, child], separatePage);
      }
      return result;
    })
    .join("\n");
};

const getItemChildren = (doc: UIDoc) =>
  "children" in doc ? doc.children
  : "itemContent" in doc ? doc.itemContent
  : "pageContent" in doc ? (doc.pageContent ?? [])
  : [];

const getUIDocAsMarkdown = (
  doc: UIDoc,
  parentDocs: UIDoc[],
  separatePage: SeparatePage | undefined,
): string => {
  const depth = parentDocs.length;
  const parentPathTitle = parentDocs.map((d) => d.title).join(" > ");
  const title =
    parentPathTitle ? `${parentPathTitle} > ${doc.title}` : doc.title;
  return [
    `#${"#".repeat(depth)} ${doc.title}`,
    parentPathTitle ? `*${parentPathTitle}*  \n  ` : "",
    `${doc.docs ?? doc.description}\n`,
    asList(getItemChildren(doc), [...parentDocs, doc], separatePage),
  ].join("\n");
};

export const getDocumentation = () => {
  let docs2 = "";

  UIDocs.forEach((doc) => {
    do {
      const separatePage = separatePages.shift();
      if (separatePage) {
        docs2 +=
          getUIDocAsMarkdown(
            separatePage.doc,
            separatePage.parentDocs,
            separatePage,
          ) + "\n\n";
      }
    } while (separatePages.length);
    const docItem = getUIDocAsMarkdown(doc, [], undefined);
    docs2 += docItem + "\n\n";
  });
  console.log({ docs2 });
  return docs2;
};
