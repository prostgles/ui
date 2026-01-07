import { useIsMounted, usePromise } from "prostgles-client";
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
  if (cachedSvgs.has(iconPath)) {
    return cached;
  }
  return fetchIconAndCache(iconPath, undefined);
};

const getIconPath = (icon: string) => `/icons/${icon}.svg`;

export const SvgIcon = ({
  icon,
  className,
  size,
  style,
  fallbackIcon = "CrosshairsQuestion",
}: {
  icon: string;
  fallbackIcon?: string;
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}) => {
  const getIsMounted = useIsMounted();
  const iconPath = getIconPath(icon);
  const fallbackIconPath = fallbackIcon ? getIconPath(fallbackIcon) : undefined;
  const [svg, setSvg] = React.useState(
    cachedSvgs.get(iconPath) ||
      (fallbackIconPath && cachedSvgs.get(fallbackIconPath)),
  );
  useEffect(() => {
    void fetchIconAndCache(iconPath, fallbackIconPath).then((fetchedSvg) => {
      if (!getIsMounted()) return;
      setSvg(fetchedSvg);
    });
  }, [iconPath, getIsMounted, icon, fallbackIconPath]);

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

const fetchIconAndCache = (
  iconPath: string,
  fallbackIcon: string | undefined,
): Promise<string> => {
  return fetch(iconPath)
    .then((res) => (!res.ok ? Promise.reject(res.statusText) : res.text()))
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
    })
    .catch((err) => {
      if (fallbackIcon) {
        return fetchIconAndCache(fallbackIcon, undefined);
      }
      console.error(`Error fetching SVG icon at ${iconPath}:`, err);
      cachedSvgs.set(iconPath, "");
      return "";
    });
};

export const getIcon = async (icon: string) => {
  const iconPath = `/icons/${icon}.svg`;
  if (!cachedSvgs.has(iconPath)) {
    const res = await fetchIconAndCache(iconPath, undefined);
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
