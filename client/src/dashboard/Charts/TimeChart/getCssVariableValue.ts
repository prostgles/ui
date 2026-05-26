export const getCssVariableValue = (
  varName: string,
  node: HTMLElement = document.body,
) => {
  return getComputedStyle(node).getPropertyValue(varName);
};
