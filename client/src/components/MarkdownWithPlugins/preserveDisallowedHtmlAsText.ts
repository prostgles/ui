type HastNode = {
  type: string;
  tagName?: string;
  value?: unknown;
  children?: HastNode[];
  position?: {
    start: { offset?: number };
    end: { offset?: number };
  };
};

/**
 * Replaces elements not allowed by the sanitization schema with text nodes
 * containing their exact original source.
 *
 * This must run after rehypeRaw and before rehypeSanitize.
 */
export const preserveDisallowedHtmlAsText = (
  source: string,
  allowedTagNames: ReadonlySet<string>,
) => {
  return function preserveDisallowedHtmlAsTextPlugin() {
    return function transform(tree: unknown) {
      const walk = (node: HastNode) => {
        if (!node.children) return;

        node.children = node.children.map((child) => {
          if (
            child.type === "element" &&
            child.tagName &&
            !allowedTagNames.has(child.tagName)
          ) {
            const start = child.position?.start.offset;
            const end = child.position?.end.offset;

            if (
              typeof start === "number" &&
              typeof end === "number" &&
              start >= 0 &&
              end >= start &&
              end <= source.length
            ) {
              return {
                type: "text",
                value: source.slice(start, end),
              };
            }

            // Positions should normally exist for source-backed elements.
            // This fallback remains safe, though it cannot preserve exact
            // formatting for parser-generated/implied nodes.
            return {
              type: "text",
              value: `<${child.tagName}>${extractText(
                child,
              )}</${child.tagName}>`,
            };
          }

          walk(child);
          return child;
        });
      };

      walk(tree as HastNode);
    };
  };
};

const extractText = (node: HastNode): string => {
  if (node.type === "text") {
    return typeof node.value === "string" ? node.value : "";
  }

  return node.children?.map(extractText).join("") ?? "";
};
