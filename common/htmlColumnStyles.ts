const colorValues = [
  /^[a-z]+$/i,
  /^#[\da-f]{3,8}$/i,
  /^(rgb|rgba|hsl|hsla)\([\d.,% /]+\)$/i,
];
const lengthValues = [
  /^0$/,
  /^\d{1,3}(\.\d{1,2})?px$/i,
  /^\d(\.\d{1,2})?(em|rem)$/i,
];
const spacingValues = [...lengthValues, /^\d{1,3}px( \d{1,3}px){1,3}$/i];
const sizeValues = [...lengthValues, /^(\d{1,2}|100)%$/];

export const HTML_COLUMN_ALLOWED_STYLES = {
  color: colorValues,
  "background-color": colorValues,
  "font-size": lengthValues,
  "font-weight": [/^(normal|bold|bolder|lighter|[1-9]00)$/i],
  "font-style": [/^(normal|italic|oblique)$/i],
  "text-align": [/^(left|right|center|justify|start|end)$/i],
  "text-decoration": [/^(none|underline|overline|line-through)$/i],
  "white-space": [/^(normal|nowrap|pre|pre-wrap|pre-line|break-spaces)$/i],
  "line-height": [...lengthValues, /^normal$/i, /^[1-3](\.\d{1,2})?$/],
  padding: spacingValues,
  margin: spacingValues,
  "border-width": spacingValues,
  "border-style": [/^(none|solid|dashed|dotted|double)$/i],
  "border-color": colorValues,
  "border-radius": spacingValues,
  display: [/^(block|inline|inline-block)$/i],
  width: sizeValues,
  height: sizeValues,
  "max-width": sizeValues,
  "max-height": sizeValues,
};
