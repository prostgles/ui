import React from "react";
import { FlexRowWrap } from "../../../../components/Flex";
import { StyledCell } from "../../tableUtils/StyledTableColumn";

type ChipStylePaletteProps = {
  onChange: (chipStyle: (typeof chipColors)[number]) => void;
};

export const chipColors = [
  { color: "#E91E63", borderColor: undefined, textColor: "#ffffff" }, // Red
  { color: "#9C27B0", borderColor: undefined, textColor: "#ffffff" }, // Purple
  { color: "#673AB7", borderColor: undefined, textColor: "#ffffff" }, // Deep Purple
  { color: "#2196F3", borderColor: undefined, textColor: "#ffffff" }, // Blue
  { color: "#00BCD4", borderColor: undefined, textColor: "#ffffff" }, // Cyan
  { color: "rgb(57 185 121)", borderColor: undefined, textColor: "#ffffff" }, // Green
  { color: "rgb(189 171 0)", borderColor: undefined, textColor: "#ffffff" }, // Yellow
  { color: "rgb(156 156 156)", borderColor: undefined, textColor: "#ffffff" }, // Gray

  // { color: '#2196F3', borderColor: undefined, textColor: undefined }, // Blue
  // { color: '#03A9F4', borderColor: undefined, textColor: undefined }, // Light Blue
  // { color: '#00BCD4', borderColor: undefined, textColor: undefined }, // Cyan
];

export const chipColorsFadedBorder = [
  {
    color: "#ffd0cd",
    borderColor: "rgb(216 71 71)",
    textColor: "#940000",
    textColorDarkMode: "#ff004a",
  }, // Red
  {
    color: "#f6beff",
    borderColor: "rgb(172 64 211)",
    textColor: "#490063",
    textColorDarkMode: "#a95cc5",
  }, // Pink
  {
    color: "#e5e9ff",
    borderColor: "rgb(108 130 231)",
    textColor: "#002fff",
    textColorDarkMode: "#4f6ffb",
  }, // Purple
  {
    color: "#c9e7ff7d",
    borderColor: "rgb(120 189 243)",
    textColor: "#0075d2",
    textColorDarkMode: "#2386d5",
  }, // Blue

  {
    color: "#00bcd42e",
    borderColor: "rgb(93 186 198)",
    textColor: "#009aad",
    textColorDarkMode: "#0cbacf",
  }, // Indigo
  {
    color: "#01d4002e",
    borderColor: "#01d4008a",
    textColor: "#00ad44",
    textColorDarkMode: "#0ad75b",
  }, // Green
  {
    color: "#d4b7002e",
    borderColor: "rgb(227 217 41)",
    textColor: "#716400",
    textColorDarkMode: "#c1ad10",
  }, // Yellow

  {
    color: "#b4b4b42e",
    borderColor: "rgb(169 169 169)",
    textColor: "#4b4b4b",
    textColorDarkMode: "#838181",
  }, // Gray
];

export const CHIP_COLOR_NAMES = {
  red: chipColorsFadedBorder[0],
  pink: chipColorsFadedBorder[1],
  purple: chipColorsFadedBorder[2],
  blue: chipColorsFadedBorder[3],
  indigo: chipColorsFadedBorder[4],
  green: chipColorsFadedBorder[5],
  yellow: chipColorsFadedBorder[6],
  gray: chipColorsFadedBorder[7],
};

const chipColorsFaded = chipColorsFadedBorder.map((c) => ({
  ...c,
  borderColor: undefined,
}));

export const ChipStylePalette = ({ onChange }: ChipStylePaletteProps) => {
  return (
    <FlexRowWrap className="ChipStylePalette flex-col flex-row gap-1 o-auto mt-1 pt-1 bt b-color noselect pointer">
      {[chipColors, chipColorsFadedBorder, chipColorsFaded].map(
        (colors, ci) => (
          <div key={ci} className="flex-row gap-1 o-auto ">
            {colors.map(({ color, textColor, borderColor }) => (
              <div
                key={color}
                onClick={() => {
                  onChange({ color, textColor, borderColor });
                }}
              >
                <StyledCell
                  style={{
                    chipColor: color,
                    textColor: textColor, // ?? cs.textColor ?? style.textColor ?? "white",
                    borderColor: borderColor ?? "transparent",
                  }}
                  renderedVal={"Lorem"}
                />
              </div>
            ))}
          </div>
        ),
      )}
    </FlexRowWrap>
  );
};
