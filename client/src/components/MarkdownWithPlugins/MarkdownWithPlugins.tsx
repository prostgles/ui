import React from "react";
import Markdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    /**
     * Allow data- attributes for links so that we can have links that open smart form popups
     */
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      "dataTableName",
      "dataColumnName",
      "dataColumnValue",
    ],
  },
};

export const MarkdownWithPlugins = ({
  content,
  components,
}: {
  content: string;
  components?: Components;
}) => {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
      components={{
        pre: React.Fragment,
        a: ({ node, ...props }) => {
          return (
            <a
              {...props}
              className="link"
              target={props.href?.startsWith("#") ? undefined : "_blank"}
              rel={props.href?.startsWith("#") ? undefined : "noreferrer"}
            />
          );
        },
        ...components,
      }}
    >
      {content}
    </Markdown>
  );
};
