import React from "react";
import { FlexRowWrap } from "@components/Flex";
import { StyledCell } from "../../RenderColumn/StyledTableColumn";
import {
  chipColors,
  chipColorsFaded,
  chipColorsFadedBorder,
} from "@common/ColumnConfig/chipColors";

type ChipStylePaletteProps = {
  onChange: (chipStyle: {
    color: string;
    borderColor: string | undefined;
    textColor: string;
  }) => void;
};

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
