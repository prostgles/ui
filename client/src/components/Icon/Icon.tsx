import type { CSSProperties } from "react";
import * as React from "react";

export type IconProps = {
  id?: string;
  path: string;
  ref?: React.RefObject<SVGSVGElement>;
  className?: string;
  title?: string | null;
  description?: string | null;
  /**
   * @deprecated Use sizeName instead
   */
  size?: number;
  sizePx?: number;
  sizeName?: "nano" | "micro" | "small" | "default" | "large";
  color?: string;
  rotate?: number;
  spin?: boolean | number;
  style?: CSSProperties;
} & React.AriaAttributes;

let idCounter = 0;

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  (
    {
      path,
      id = ++idCounter,
      title = null,
      description = null,
      size = 1,
      color = "currentColor",
      sizeName,
      rotate = 0,
      spin = false,
      style: _style = {},
      sizePx,
      ...rest
    },
    ref,
  ) => {
    const style = { ..._style };

    const pathStyle: any = {};
    const transform: string[] = [];
    if (sizePx) {
      style.width = `${sizePx}px`;
      style.height = style.width;
    }
    if (size) {
      style.width = `${size * 1.5}rem`;
      style.height = style.width;
    }
    if (sizeName) {
      const sizePx = {
        large: 24,
        default: 22,
        small: 18,
        micro: 16,
        nano: 14,
      }[sizeName];
      style.width = `${sizePx}px`;
      style.height = style.width;
      style.transform = `scale(1.1)`;
    }
    if (rotate !== 0) {
      transform.push(`rotate(${rotate}deg)`);
    }
    if (color) {
      pathStyle.fill = color;
    }
    const pathElement = <path d={path} style={pathStyle} />;
    const transformElement = pathElement;
    if (transform.length > 0) {
      style.transform = transform.join(" ");
      style.transformOrigin = "center";
    }
    let spinElement = transformElement;
    const spinSec = spin === true || typeof spin !== "number" ? 2 : spin;
    let inverse = true;
    if (spinSec < 0) {
      inverse = !inverse;
    }
    if (spin) {
      spinElement = (
        <g
          style={{
            animation: `spin${inverse ? "-inverse" : ""} linear ${Math.abs(spinSec)}s infinite`,
            transformOrigin: "center",
          }}
        >
          {transformElement}
          {!(rotate !== 0) && (
            <rect width="24" height="24" fill="transparent" />
          )}
        </g>
      );
    }
    let ariaLabelledby;
    const labelledById = `icon_labelledby_${id}`;
    const describedById = `icon_describedby_${id}`;
    let role;
    if (title) {
      ariaLabelledby =
        description ? `${labelledById} ${describedById}` : labelledById;
    } else {
      role = "presentation";
      if (description) {
        throw new Error("title attribute required when description is set");
      }
    }
    return (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        style={style}
        role={role}
        aria-labelledby={ariaLabelledby}
        {...rest}
      >
        {title && <title id={labelledById}>{title}</title>}
        {description && <desc id={describedById}>{description}</desc>}
        {spin &&
          (inverse ?
            <style>
              {
                "@keyframes spin-inverse { from { transform: rotate(0deg) } to { transform: rotate(-360deg) } }"
              }
            </style>
          : <style>
              {
                "@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }"
              }
            </style>)}
        {spinElement}
      </svg>
    );
  },
);
