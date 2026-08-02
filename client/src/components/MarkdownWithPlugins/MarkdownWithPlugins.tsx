import { classOverride, type DivProps } from "@components/Flex";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import React from "react";
import Markdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import "./Marked.css";
import { preserveDisallowedHtmlAsText } from "./preserveDisallowedHtmlAsText";
import Btn from "@components/Btn";
import PopupMenu from "@components/PopupMenu";
import { mdiEye } from "@mdi/js";

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

const allowedTagNames = new Set<string>(sanitizeSchema.tagNames ?? []);

type P = {
  content: string;
  components?: Components;
} & DivProps;

export const MarkdownWithPlugins = ({
  content,
  components,
  ...divProps
}: P) => {
  return (
    <ScrollFade
      {...divProps}
      className={classOverride(
        "Marked MarkdownWithPlugins flex-col o-auto min-w-0 max-w-full ta-start",
        divProps.className,
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeRaw,
          preserveDisallowedHtmlAsText(content, allowedTagNames),
          [rehypeSanitize, sanitizeSchema],
        ]}
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
    </ScrollFade>
  );
};

export const MarkdownWithPluginsPopupBtn = (props: P) => {
  return (
    <PopupMenu
      title="Parsed document"
      positioning="fullscreen"
      onClickClose={false}
      className="max-w-full"
      button={
        <Btn
          className="max-w-full"
          iconPath={mdiEye}
          color="action"
          variant="faded"
        >
          Show parsed document
        </Btn>
      }
    >
      <MarkdownWithPlugins {...props} />
    </PopupMenu>
  );
};
