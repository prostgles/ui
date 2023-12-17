import React from 'react';
import { FlexRowWrap } from "../../../../components/Flex"; 
import { StyledCell } from '../../tableUtils/StyledTableColumn';

 
type ChipStylePaletteProps = {
  onChange: (chipStyle: typeof chipColors[number]) => void
}

export const chipColors = [
  { color: '#E91E63', borderColor: undefined, textColor: "#ffffff" }, // Red
  { color: '#9C27B0', borderColor: undefined, textColor: "#ffffff" }, // Purple
  { color: '#673AB7', borderColor: undefined, textColor: "#ffffff" }, // Deep Purple
  { color: '#2196F3', borderColor: undefined, textColor: "#ffffff" }, // Blue
  { color: '#00BCD4', borderColor: undefined, textColor: "#ffffff" }, // Cyan
  { color: 'rgb(57 185 121)', borderColor: undefined, textColor: "#ffffff" }, // Green
  { color: 'rgb(189 171 0)', borderColor: undefined, textColor: "#ffffff" }, // Yellow
  { color: 'rgb(156 156 156)', borderColor: undefined, textColor: "#ffffff" }, // Gray


  // { color: '#2196F3', borderColor: undefined, textColor: undefined }, // Blue
  // { color: '#03A9F4', borderColor: undefined, textColor: undefined }, // Light Blue
  // { color: '#00BCD4', borderColor: undefined, textColor: undefined }, // Cyan
];
 
export const chipColorsFadedBorder = [

  { color: '#ffd0cd',   borderColor: "rgb(216 71 71)", textColor: "#940000" }, // Red
  { color: '#f6beff',   borderColor: "rgb(172 64 211)", textColor: "#490063" }, // Pink
  { color: '#e5e9ff',   borderColor: "rgb(108 130 231)", textColor: "#002fff" }, // Purple
  { color: '#c9e7ff7d', borderColor: "rgb(120 189 243)", textColor: "#0075d2" }, // Deep Purple

  { color: '#00bcd42e', borderColor: "rgb(93 186 198)", textColor: "#009aad" }, // Indigo
  { color: '#01d4002e', borderColor: "#01d4002e",       textColor: "#00ad44" }, // Green
  { color: '#d4b7002e', borderColor: "rgb(227 217 41)", textColor: "#716400" }, // Yellow

  { color: '#b4b4b42e', borderColor: "rgb(169 169 169)", textColor: "#4b4b4b" }, // Gray
  
];

const chipColorsFaded = chipColorsFadedBorder.map(c => ({ ...c, borderColor: undefined }));

export const ChipStylePalette = ({ onChange }: ChipStylePaletteProps) => {

  return <FlexRowWrap className="ChipStylePalette flex-col flex-row gap-1 o-auto mt-1 pt-1 bt b-gray-300 noselect pointer">
    {[chipColors, chipColorsFadedBorder, chipColorsFaded].map((colors, ci) => (
      <div key={ci} className="flex-row gap-1 o-auto ">
        {colors.map(({ color, textColor, borderColor }) => 
          <div 
            key={color} 
            onClick={() => { 
              onChange({ color, textColor, borderColor }); 
            }}
          >
            <StyledCell 
              style={{ 
                chipColor: color, 
                textColor: textColor,// ?? cs.textColor ?? style.textColor ?? "white",
                borderColor: borderColor ?? "transparent"
              }} 
              renderedVal={"Lorem"} 
            />
          </div>
        )}
      </div>
    ))}
  </FlexRowWrap>
}
