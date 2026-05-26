import { getCssVariableValue } from "./TimeChart/getCssVariableValue";

export const DEFAULT_SHADOW = {
  color: getCssVariableValue("--shadow1"), //"rgba(73, 56, 56, 0.5)",
  blur: 15,
  offsetX: 3,
  offsetY: 3,
};
