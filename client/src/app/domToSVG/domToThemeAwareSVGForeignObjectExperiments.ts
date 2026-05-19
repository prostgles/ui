type PortableSvgResult = {
  svg: SVGSVGElement;
  svgString: string;
};

const NON_GRAPHIC_TAGS = new Set([
  "script",
  "noscript",
  "template",
  "meta",
  "base",
  "head",
  "title",
]);

const URL_PROTOCOL_BLOCKLIST = ["javascript:", "vbscript:"];

const toAbsoluteUrl = (raw: string, baseUrl: string): string | null => {
  try {
    return new URL(raw, baseUrl).href;
  } catch {
    return null;
  }
};

const shouldInlineUrl = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("about:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  return !URL_PROTOCOL_BLOCKLIST.some((p) => lower.startsWith(p));
};

const blobToDataUrl = async (blob: Blob): Promise<string> => {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(reader.error || new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
};

const replaceAsync = async (
  input: string,
  regex: RegExp,
  replacer: (match: string, ...groups: string[]) => Promise<string>,
): Promise<string> => {
  const matches = Array.from(input.matchAll(regex));
  if (!matches.length) return input;

  let output = "";
  let lastIndex = 0;

  for (const m of matches) {
    const index = m.index; //?? 0;
    output += input.slice(lastIndex, index);
    output += await replacer(m[0], ...m.slice(1));
    lastIndex = index + m[0].length;
  }

  output += input.slice(lastIndex);
  return output;
};

const rewriteCssUrls = async (
  cssText: string,
  baseUrl: string,
  fetchAsDataUrl: (url: string, base: string) => Promise<string | null>,
): Promise<string> => {
  const urlRegex = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;

  return await replaceAsync(cssText, urlRegex, async (_full, quote, rawUrl) => {
    const cleanUrl = String(rawUrl || "").trim();
    if (!shouldInlineUrl(cleanUrl)) {
      return "url(" + (quote || "") + cleanUrl + (quote || "") + ")";
    }
    const dataUrl = await fetchAsDataUrl(cleanUrl, baseUrl);
    if (!dataUrl) {
      return "url(" + (quote || "") + cleanUrl + (quote || "") + ")";
    }
    return "url(" + (quote || "") + dataUrl + (quote || "") + ")";
  });
};

const inlineSrcset = async (
  srcset: string,
  baseUrl: string,
  fetchAsDataUrl: (url: string, base: string) => Promise<string | null>,
): Promise<string> => {
  const candidates = srcset
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const rewritten = await Promise.all(
    candidates.map(async (candidate) => {
      const firstSpace = candidate.search(/\s/);
      const urlPart =
        firstSpace === -1 ? candidate : candidate.slice(0, firstSpace);
      const descriptor =
        firstSpace === -1 ? "" : candidate.slice(firstSpace).trim();

      if (!shouldInlineUrl(urlPart)) return candidate;

      const dataUrl = await fetchAsDataUrl(urlPart, baseUrl);
      if (!dataUrl) return candidate;

      return descriptor ? dataUrl + " " + descriptor : dataUrl;
    }),
  );

  return rewritten.join(", ");
};

const sanitizeTree = (root: HTMLElement): void => {
  const all = Array.from(root.querySelectorAll("*"));
  for (const el of all) {
    const tag = el.tagName.toLowerCase();

    if (NON_GRAPHIC_TAGS.has(tag)) {
      el.remove();
      continue;
    }

    if (tag === "link") {
      const rel = (el.getAttribute("rel") || "").toLowerCase();
      if (rel !== "stylesheet") {
        el.remove();
        continue;
      }
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value || "";

      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (name === "srcdoc") {
        el.removeAttribute(attr.name);
        continue;
      }

      if (
        (name === "href" ||
          name === "src" ||
          name === "poster" ||
          name === "data" ||
          name === "xlink:href") &&
        URL_PROTOCOL_BLOCKLIST.some((p) =>
          value.trim().toLowerCase().startsWith(p),
        )
      ) {
        el.removeAttribute(attr.name);
      }
    }
  }
};

const inlineExternalResources = async (root: HTMLElement): Promise<void> => {
  const baseUrl = document.baseURI;
  const cache = new Map<string, Promise<string | null>>();

  const fetchAsDataUrl = async (
    raw: string,
    base: string,
  ): Promise<string | null> => {
    if (!shouldInlineUrl(raw)) return null;
    const absolute = toAbsoluteUrl(raw, base);
    if (!absolute) return null;

    if (!cache.has(absolute)) {
      cache.set(
        absolute,
        (async () => {
          try {
            const res = await fetch(absolute);
            if (!res.ok) return null;
            const blob = await res.blob();
            return await blobToDataUrl(blob);
          } catch {
            return null;
          }
        })(),
      );
    }

    return await cache.get(absolute)!;
  };

  const styleTags = Array.from(root.querySelectorAll("style"));
  for (const styleEl of styleTags) {
    const css = styleEl.textContent || "";
    styleEl.textContent = await rewriteCssUrls(css, baseUrl, fetchAsDataUrl);
  }

  const stylesheetLinks = Array.from(
    root.querySelectorAll("link[rel='stylesheet']"),
  );
  for (const link of stylesheetLinks) {
    const href = link.getAttribute("href");
    if (!href || !shouldInlineUrl(href)) {
      link.remove();
      continue;
    }
    const abs = toAbsoluteUrl(href, baseUrl);
    if (!abs) {
      link.remove();
      continue;
    }

    try {
      const res = await fetch(abs);
      if (!res.ok) {
        link.remove();
        continue;
      }
      const css = await res.text();
      const inlinedCss = await rewriteCssUrls(css, abs, fetchAsDataUrl);
      const styleEl = document.createElement("style");
      styleEl.textContent = inlinedCss;
      link.replaceWith(styleEl);
    } catch {
      link.remove();
    }
  }

  const all = [
    root,
    ...Array.from(root.querySelectorAll("*")),
  ] as HTMLElement[];

  for (const el of all) {
    if (el.hasAttribute("style")) {
      const styleText = el.getAttribute("style") || "";
      const next = await rewriteCssUrls(styleText, baseUrl, fetchAsDataUrl);
      el.setAttribute("style", next);
    }

    const tag = el.tagName.toLowerCase();

    if (
      tag === "img" ||
      tag === "source" ||
      (tag === "input" && (el as HTMLInputElement).type === "image")
    ) {
      const src = el.getAttribute("src");
      if (src && shouldInlineUrl(src)) {
        const dataUrl = await fetchAsDataUrl(src, baseUrl);
        if (dataUrl) el.setAttribute("src", dataUrl);
      }

      const srcset = el.getAttribute("srcset");
      if (srcset) {
        const rewritten = await inlineSrcset(srcset, baseUrl, fetchAsDataUrl);
        el.setAttribute("srcset", rewritten);
      }
    }

    if (tag === "video") {
      const poster = el.getAttribute("poster");
      if (poster && shouldInlineUrl(poster)) {
        const dataUrl = await fetchAsDataUrl(poster, baseUrl);
        if (dataUrl) el.setAttribute("poster", dataUrl);
      }
    }

    if (tag === "object") {
      const data = el.getAttribute("data");
      if (data && shouldInlineUrl(data)) {
        const dataUrl = await fetchAsDataUrl(data, baseUrl);
        if (dataUrl) el.setAttribute("data", dataUrl);
      }
    }

    if (tag === "image" || tag === "use") {
      for (const attrName of ["href", "xlink:href"]) {
        const href = el.getAttribute(attrName);
        if (href && shouldInlineUrl(href)) {
          const dataUrl = await fetchAsDataUrl(href, baseUrl);
          if (dataUrl) el.setAttribute(attrName, dataUrl);
        }
      }
    }
  }
};

export const domToThemeAwareSVGPortable = async (
  node: HTMLElement,
): Promise<PortableSvgResult> => {
  const clone = node.cloneNode(true) as HTMLElement;

  const injectedCss = collectRelevantDocumentCss(node);
  if (injectedCss) {
    const styleEl = document.createElement("style");
    styleEl.textContent = injectedCss;
    clone.prepend(styleEl);
  }
  sanitizeTree(clone);
  await inlineExternalResources(clone);

  const rect = node.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width || node.scrollWidth || 1));
  const height = Math.max(1, Math.ceil(rect.height || node.scrollHeight || 1));

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", "0 0 " + width + " " + height);

  const foreignObject = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "foreignObject",
  );
  foreignObject.setAttribute("x", "0");
  foreignObject.setAttribute("y", "0");
  foreignObject.setAttribute("width", "100%");
  foreignObject.setAttribute("height", "100%");

  const htmlWrapper = document.createElement("div");
  htmlWrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  htmlWrapper.style.width = "100%";
  htmlWrapper.style.height = "100%";
  htmlWrapper.appendChild(clone);

  foreignObject.appendChild(htmlWrapper);
  svg.appendChild(foreignObject);

  const rawSvgString = new XMLSerializer().serializeToString(svg);
  const svgString = rawSvgString; //ensureXmlVoidTags(rawSvgString);
  return { svg, svgString };
};
const selectorAffectsRoot = (root: HTMLElement, selector: string): boolean => {
  try {
    if (root.matches(selector)) return true;
    return !!root.querySelector(selector);
  } catch {
    return false;
  }
};

const collectRelevantDocumentCss = (root: HTMLElement): string => {
  const chunks: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }

    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        if (selectorAffectsRoot(root, rule.selectorText)) {
          chunks.push(rule.cssText);
        }
        continue;
      }

      if (rule instanceof CSSMediaRule) {
        const mediaRules: string[] = [];
        for (const inner of Array.from(rule.cssRules)) {
          if (inner instanceof CSSStyleRule) {
            if (selectorAffectsRoot(root, inner.selectorText)) {
              mediaRules.push(inner.cssText);
            }
          } else {
            mediaRules.push(inner.cssText);
          }
        }

        if (mediaRules.length) {
          chunks.push(
            "@media " + rule.conditionText + " {" + mediaRules.join("\n") + "}",
          );
        }
        continue;
      }

      if (
        rule instanceof CSSFontFaceRule ||
        rule instanceof CSSKeyframesRule ||
        rule instanceof CSSSupportsRule
      ) {
        chunks.push(rule.cssText);
      }
    }
  }

  return chunks.join("\n");
};
