export function rgba2hex(color: string): string {
  // Remove whitespace and parse RGB/RGBA values
  const match = color
    .replace(/\s/g, "")
    .match(/^rgba?\((\d+),(\d+),(\d+),?([^,\s)]+)?/i);

  if (!match) {
    // Return original if parsing fails, or throw error for strict validation
    return color.startsWith("#") ? color : "#000000";
  }

  const [, r, g, b, alphaStr] = match as [
    string,
    string,
    string,
    string,
    string?,
  ];

  // Convert RGB to hex
  const toHex = (value: string): string => {
    const num = parseInt(value, 10);
    const clamped = Math.max(0, Math.min(255, num)); // Clamp to valid range
    return clamped.toString(16).padStart(2, "0");
  };

  const hex = toHex(r) + toHex(g) + toHex(b);

  // Handle alpha channel
  const alpha = alphaStr ? parseFloat(alphaStr.trim()) : 1;
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${hex}${alphaHex}`;
}
