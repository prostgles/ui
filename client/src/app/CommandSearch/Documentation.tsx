import React from "react";
import { flatDocs, UIDocs, type UIDocElement } from "../UIDocs";
import { FlexCol } from "../../components/Flex";
import Markdown from "react-markdown";

const maxDepthForMarkdown = 6;
export const documentation = flatDocs
  .map((doc) => {
    const depth = Math.min(maxDepthForMarkdown, doc.parentTitles.length + 1);
    const title = `${"#".repeat(depth)} ${doc.title}`;
    return [title, doc.docs ?? doc.description].join("\n\n");
  })
  .join("\n\n");

const asList = (children: UIDocElement[], depth = 0) => {
  return children
    .map((child) => {
      let result = `${" ".repeat(depth)}- **${child.title}**: ${child.description}  `;
      const items =
        "children" in child ? child.children
        : "itemContent" in child ? child.itemContent
        : [];
      if (items.length) {
        result += "\n" + asList(items, depth + 2);
      }
      return result;
    })
    .join("\n");
};

const docs2 = UIDocs.map((doc) => {
  console.log(doc);
  if (doc.type === "navbar") {
    return [`# ${doc.title}`, `${doc.description}`, asList(doc.children)].join(
      "\n",
    );
  }
  if (doc.type === "page" && doc.path === "/connections" && !doc.pathItem) {
    return [`# ${doc.title}`, `${doc.docs}\n`, asList(doc.children)].join("\n");
  }
  return [
    `# ${doc.title}`,
    `${doc.docs ?? doc.description}\n`,
    asList(doc.children),
  ].join("\n");
}).join("\n\n");

export const Documentation = () => {
  return (
    <FlexCol
      style={{
        width: "min(100vw, 700px)",
        alignSelf: "center",
        gap: 0,
      }}
    >
      <Markdown>{docs2}</Markdown>
    </FlexCol>
  );
};
