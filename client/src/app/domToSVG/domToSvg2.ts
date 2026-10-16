const fetchDataUrl = async (url: string): Promise<string> => {
  try {
    const blob = await fetch(url).then((r) => r.blob());
    return await new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
};

export const domToSvg2 = async (): Promise<void> => {
  const canvasDataUrl = (img: HTMLImageElement): string => {
    const c = document.createElement("canvas");
    [c.width, c.height] = [
      img.naturalWidth || img.offsetWidth,
      img.naturalHeight || img.offsetHeight,
    ];
    c.getContext("2d")!.drawImage(img, 0, 0);
    try {
      return c.toDataURL();
    } catch {
      return img.src;
    }
  };

  const abs = (u: string, base: string): string => {
    if (u.startsWith("data:")) return u;
    try {
      return new URL(u, base).href;
    } catch {
      return u;
    }
  };

  const rx = () => /url\(["']?([^"')]+)["']?\)/g;

  // Collect all CSS, resolving relative URLs to absolute per-sheet base
  let css = Array.from(document.styleSheets).reduce<string>((acc, sheet) => {
    try {
      const base = sheet.href ?? document.baseURI;
      return (
        acc +
        Array.from(sheet.cssRules)
          .map((r) => r.cssText.replace(rx(), (_, u) => `url(${abs(u, base)})`))
          .join("")
      );
    } catch {
      return acc;
    }
  }, "");

  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  const styledEls = Array.from(
    clone.querySelectorAll<HTMLElement>('[style*="url("]'),
  );

  // Gather all unique non-data URLs across CSS and inline styles
  const rawUrls = [
    ...Array.from(css.matchAll(rx()), (m) => m[1]!),
    ...styledEls.flatMap((el) =>
      Array.from(el.getAttribute("style")!.matchAll(rx()), (m) =>
        abs(m[1]!, document.baseURI),
      ),
    ),
  ].filter((u) => !u.startsWith("data:"));

  const dataMap = new Map(
    await Promise.all(
      [...new Set(rawUrls)].map(
        async (u) => [u, await fetchDataUrl(u)] as const,
      ),
    ),
  );

  const replaceUrls = (s: string, base = document.baseURI): string =>
    s.replace(
      rx(),
      (_, u) => `url(${dataMap.get(abs(u, base)) ?? abs(u, base)})`,
    );

  css = replaceUrls(css);

  // Strip live references, inject single consolidated stylesheet
  clone
    .querySelectorAll('style, link[rel="stylesheet"], script')
    .forEach((el) => el.remove());
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  (clone.querySelector("head") ?? clone).prepend(styleEl);

  // Patch inline style url() references
  styledEls.forEach((el) =>
    el.setAttribute("style", replaceUrls(el.getAttribute("style")!)),
  );

  // Convert <img> elements via canvas (no re-fetch, uses already-decoded pixels)
  const imgMap = new Map<string, HTMLImageElement>();
  Array.from(document.images).forEach((img) => {
    imgMap.set(img.src, img);
    if (img.currentSrc) imgMap.set(img.currentSrc, img);
  });

  clone.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    if (!img.src.startsWith("data:")) {
      const orig = imgMap.get(img.src) ?? imgMap.get(img.currentSrc);
      if (orig) img.src = canvasDataUrl(orig);
    }
  });

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("xmlns", ns);
  const { scrollWidth: w, scrollHeight: h } = document.documentElement;
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.style.cssText = "position:fixed;top:0;left:0;z-index:2147483647";
  svg.onclick = () => svg.remove();

  const fo = document.createElementNS(ns, "foreignObject");
  fo.setAttribute("width", "100%");
  fo.setAttribute("height", "100%");
  fo.appendChild(clone);
  svg.appendChild(fo);
  document.body.appendChild(svg);
};
