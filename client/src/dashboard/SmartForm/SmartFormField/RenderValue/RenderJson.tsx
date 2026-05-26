import { isObject } from "@common/publishUtils";
import React from "react";
import { renderNull } from "../RenderValue";

const styles = {
  key: { color: "var(--color-json)" },
  string: { color: "var(--color-text)" },
  number: { color: "var(--color-number)" },
  boolean: { color: "var(--color-boolean)" },
  punctuation: { color: "var(--text-2)" },
};

export const RenderJson = ({
  value,
  maxLength = 1000,
}: {
  value: unknown;
  maxLength: number | undefined;
}) => {
  let remainingLength = maxLength;
  const cut = (s: string) => {
    if (maxLength <= 0) return null;
    const out = s.slice(0, maxLength);
    remainingLength -= out.length;
    return out;
  };

  const text = (s: string, style: React.CSSProperties) => {
    const out = cut(s);
    return out ? <span style={style}>{out}</span> : null;
  };

  if (value === null) return renderNull(value, undefined, false);
  if (typeof value === "string") return text(`"${value}"`, styles.string);
  if (typeof value === "number") return text(String(value), styles.number);
  if (typeof value === "boolean") return text(String(value), styles.boolean);

  if (Array.isArray(value)) {
    return (
      <>
        {text("[", styles.punctuation)}
        {value.map((v, i) => (
          <span key={i}>
            <RenderJson value={v} maxLength={remainingLength} />
            {i < value.length - 1 && text(", ", styles.punctuation)}
          </span>
        ))}
        {text("]", styles.punctuation)}
      </>
    );
  }

  if (isObject(value)) {
    const entries = Object.entries(value);
    return (
      <>
        {text("{", styles.punctuation)}
        {entries.map(([k, v], i) => (
          <span key={k}>
            {text(`"${k}"`, styles.key)}
            {text(": ", styles.punctuation)}
            <RenderJson value={v} maxLength={remainingLength} />
            {i < entries.length - 1 && text(", ", styles.punctuation)}
          </span>
        ))}
        {text("}", styles.punctuation)}
      </>
    );
  }

  return text(JSON.stringify(value), styles.string);
};
