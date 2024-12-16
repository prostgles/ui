import type { ReactElement, CSSProperties, RefObject } from "react";
import { HTMLProps } from "react";
import type { IconProps } from "./Icon";

export interface StackPropsBase {
  ref?: RefObject<SVGSVGElement>;
  title?: string | null;
  description?: string | null;
  size?: number | string | null;
  color?: string | null;
  horizontal?: boolean | null;
  vertical?: boolean | null;
  rotate?: number | null;
  spin?: boolean | number | null;
  style?: CSSProperties;
}

export interface StackProps extends StackPropsBase {
  children: ReactElement<IconProps>[] | ReactElement<IconProps>;
}
