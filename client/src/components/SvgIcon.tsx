import { useIsMounted } from "prostgles-client/dist/prostgles";
import React, { useEffect } from "react";
import sanitizeHtml from "sanitize-html";

export const cachedSvgs = new Map<string, string>();

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
    const iconNameContainsOnlyLetters = /^[a-zA-Z]+$/.test(icon);
    if (!iconNameContainsOnlyLetters) {
      console.error(`Icon name "${icon}" must contain only letters`);
      return;
    }
    const cached = cachedSvgs.get(iconPath);
    if (cached) {
      setSvg(cached);
      return;
    }
    fetchIcon(iconPath).then((fetchedSvg) => {
      cachedSvgs.set(iconPath, fetchedSvg);
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

const fetchIcon = (iconPath: string) => {
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
    const res = await fetchIcon(iconPath);
    return res;
  }
  return cachedSvgs.get(iconPath)!;
};
