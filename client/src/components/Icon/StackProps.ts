import { ReactElement, CSSProperties, RefObject, HTMLProps } from "react";
import { IconProps } from "./Icon";

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