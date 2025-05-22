import { useIsMounted, usePromise } from "prostgles-client/dist/prostgles";
import React, { useEffect } from "react";
import sanitizeHtml from "sanitize-html";
import { classOverride, type DivProps } from "./Flex";

export const cachedSvgs = new Map<string, string>();

export const fetchNamedSVG = async (iconName: string) => {
  const iconNameContainsOnlyLettersAndMaybeEndWithDigits =
    /^[a-zA-Z]+(\d+)?$/.test(iconName);
  if (!iconNameContainsOnlyLettersAndMaybeEndWithDigits) {
    console.error(
      `Icon name "${iconName}" iconNameContainsOnlyLettersAndMaybeEndWithDigits`,
    );
    return;
  }
  const iconPath = `/icons/${iconName}.svg`;
  const cached = cachedSvgs.get(iconPath);
  if (cached) {
    return cached;
  }
  return fetchIconAndCache(iconPath);
};

export const SvgIcon = ({
  icon,
  className,
  size,
  style,
}: {
  icon: string;
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}) => {
  const getIsMounted = useIsMounted();
  const iconPath = `/icons/${icon}.svg`;
  const [svg, setSvg] = React.useState(cachedSvgs.get(iconPath));
  useEffect(() => {
    fetchIconAndCache(iconPath).then((fetchedSvg) => {
      if (!getIsMounted()) return;
      setSvg(fetchedSvg);
    });
  }, [iconPath, getIsMounted, icon]);

  const sizePx = `${size || 24}px`;
  return (
    <div
      className={className}
      style={{
        width: sizePx,
        height: sizePx,
        ...style,
      }}
      dangerouslySetInnerHTML={!svg ? undefined : { __html: svg }}
    />
  );
};

const fetchIconAndCache = (iconPath: string) => {
  return fetch(iconPath)
    .then((res) => res.text())
    .then((svgRaw) => {
      const svg = sanitizeHtml(svgRaw, {
        allowedTags: ["svg", "path"],
        allowedAttributes: {
          svg: ["width", "height", "view", "style", "xmlns", "viewBox", "role"],
          path: ["d", "style"],
        },
        parser: {
          lowerCaseTags: false,
          lowerCaseAttributeNames: false,
        },
      });
      cachedSvgs.set(iconPath, svg);
      return svg;
    });
};

export const getIcon = async (icon: string) => {
  const iconPath = `/icons/${icon}.svg`;
  if (!cachedSvgs.has(iconPath)) {
    const res = await fetchIconAndCache(iconPath);
    return res;
  }
  return cachedSvgs.get(iconPath)!;
};

type SvgIconFromURLProps = DivProps & {
  url: string;
  /**
   * @default "mask"
   * mask = uses currentColor
   * background = maintains original colours
   */
  mode?: "background" | "mask" | "auto";
};
export const SvgIconFromURL = ({
  url,
  className,
  style,
  mode: propsMode = "auto",
  ...divProps
}: SvgIconFromURLProps) => {
  const modeOverride = usePromise(async () => {
    if (propsMode !== "auto") return;
    const res = await fetch(url);
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("image/svg+xml")) {
      const svg = await res.text();
      if (svg.includes("currentColor")) {
        return "mask";
      }
    }
    return "background";
  }, [propsMode, url]);
  const mode = propsMode === "auto" ? modeOverride : propsMode;

  return (
    <div
      {...divProps}
      className={classOverride("SvgIconFromURL", className)}
      style={{
        ...style,
        ...(mode === "mask" ?
          {
            backgroundColor: "currentColor",
            maskImage: `url(${JSON.stringify(url)})`,
            maskSize: "cover",
          }
        : {
            backgroundImage: `url(${JSON.stringify(url)})`,
            backgroundSize: "cover",
          }),
      }}
    />
  );
};
