import type { SVGContext, SVGNodeLayout } from "../containers/elementToSVG";
import { SVG_NAMESPACE } from "../domToSVG";

export const addImageFromDataURL = (
  g: SVGGElement,
  dataUrl: string,
  context: SVGContext,
  { style, height, width, x, y }: SVGNodeLayout,
) => {
  let imageId: string | null = null;

  // Loop through existing image elements in defs to find a match
  const existingImages = context.defs.querySelectorAll("image");
  for (const img of existingImages) {
    if (img.getAttribute("href") === dataUrl) {
      imageId = img.getAttribute("id")!;
      break;
    }
  }

  if (!imageId) {
    imageId = `svg-image-${context.idCounter++}`;
    const imageElem = document.createElementNS(SVG_NAMESPACE, "image");
    imageElem.setAttribute("id", imageId);
    imageElem.setAttribute("href", dataUrl);
    imageElem.setAttribute("width", width);
    imageElem.setAttribute("height", height);
    context.defs.appendChild(imageElem);
  }

  // Reference the image
  const useElem = document.createElementNS(SVG_NAMESPACE, "use");
  useElem.setAttribute("href", `#${imageId}`);
  useElem.setAttribute("x", x);
  useElem.setAttribute("y", y);
  useElem.style.opacity = style.opacity || "1";

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
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Error converting image to data URL:", error);
    // Fallback to original source if conversion fails
    return img.src;
  }
};
