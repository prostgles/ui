
import DOMPurify from "dompurify";
import { marked } from "marked";
import type { DivProps } from "../Flex";
import React from "react";
import { useMemoDeep } from "prostgles-client/dist/prostgles";

// const renderer = new marked.Renderer();

marked.Renderer.prototype.paragraph = ({ text }) => {
  const noWrapTags = ["img", "code"];
  if (noWrapTags.some(tag => text.startsWith("<" + tag))) {
    return text + "\n";
  }
  return "<p>" + text + "</p>";
};

// renderer.code = function(href, title, text) {
//   return `<a target="_blank" href="${href}" title="${title}">${text}</a>`;
// };

type P = { content: string } & DivProps
export const Marked = ({ content, ...divProps }: P) => {

  const __html = useMemoDeep(() => DOMPurify.sanitize(marked.parse(content)), [content]);

  return <div {...divProps} dangerouslySetInnerHTML={{ __html }}/>
}