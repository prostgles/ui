import type { SVGContext, SVGNodeLayout } from "../containers/elementToSVG";
import { SVG_NAMESPACE } from "../domToSVG";
import { canvasToDataURL } from "../utils/canvasToDataURL";

export const addImageFromDataURL = (
  g: SVGGElement,
  dataUrl: string,
  context: SVGContext,
  { style, height, width, x, y }: SVGNodeLayout,
) => {
  const sameDataUrlSymbol = Array.from(
    context.defs.querySelectorAll("symbol"),
  ).find((symbol) => {
    const imgInSymbol = symbol.querySelector("image");
    if (!imgInSymbol) {
      return false;
    }
    const href = imgInSymbol.getAttribute("href");
    return href === dataUrl;
  })?.id;

  let imageSymbolId = sameDataUrlSymbol;
  if (!imageSymbolId) {
    imageSymbolId = "id" + hashCode(dataUrl.slice(100));
    while (context.defs.querySelector(`#${imageSymbolId}`)) {
      imageSymbolId += Math.floor(Math.random() * 10).toString();
    }
    const imageElem = document.createElementNS(SVG_NAMESPACE, "image");
    imageElem.setAttribute("href", dataUrl);
    imageElem.setAttribute("width", "100%");
    imageElem.setAttribute("height", "100%");
    imageElem.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const symbolElem = document.createElementNS(SVG_NAMESPACE, "symbol");
    symbolElem.setAttribute("id", imageSymbolId);
    symbolElem.appendChild(imageElem);
    symbolElem.setAttribute("viewBox", `0 0 ${width} ${height}`);
    context.defs.appendChild(symbolElem);
  }

  const useElem = document.createElementNS(SVG_NAMESPACE, "use");
  useElem.setAttribute("href", `#${imageSymbolId}`);
  useElem.setAttribute("x", x);
  useElem.setAttribute("y", y);
  useElem.setAttribute("width", width);
  useElem.setAttribute("height", height);
  if (style.opacity && style.opacity !== "1") {
    useElem.style.opacity = style.opacity;
  }

  g.appendChild(useElem);
};

export const imgToSVG = async (
  g: SVGGElement,
  imgElement: HTMLImageElement,
  layout: SVGNodeLayout,
  context,
) => {
  const loadedImage = await loadImage(imgElement);

  const dataUrl = await convertImageToDataURL(loadedImage);
  addImageFromDataURL(g, dataUrl, context, layout);
};

const loadImage = async (
  imgSource: HTMLImageElement,
): Promise<HTMLImageElement> => {
  if (!imgSource.complete) {
    return new Promise((resolve, reject) => {
      imgSource.onload = () => resolve(imgSource);
      imgSource.onerror = () =>
        reject(new Error("Failed to load the provided image element"));
    });
  }
  return imgSource;
};

const convertImageToDataURL = (img: HTMLImageElement): string => {
  try {
    if (img.src.startsWith("data:")) {
      return img.src;
    }
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    ctx.drawImage(img, 0, 0);
    return canvasToDataURL(canvas);
  } catch (error) {
    console.error("Error converting image to data URL:", error);
    // Fallback to original source if conversion fails
    return img.src;
  }
};

const hashCode = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};
