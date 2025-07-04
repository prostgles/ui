import { mdiFullscreen } from "@mdi/js";
import React, { useEffect, useRef, useState } from "react";
import Btn from "../components/Btn";
import { FlexCol, FlexRow } from "../components/Flex";
import { isEmpty } from "../utils";

const buttonHeights: Record<string, number> = {};
const buttonLoadingHeights: Record<string, number> = {};

export const ComponentList = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [checkMessage, setCheckMessage] = useState(
    "Checking button heights...",
  );

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setTimeout(() => {
      if (ref.current) {
        ref.current.querySelectorAll("[data-size]").forEach((container) => {
          const size = container.getAttribute("data-size");
          if (!size) return;
          const buttons = container.querySelectorAll("button");
          const firstButtonRect = buttons[0]?.getBoundingClientRect();
          if (!firstButtonRect)
            throw new Error("No buttons found in container");
          const height = firstButtonRect.height;
          if (!isLoading) {
            buttonHeights[size] = height;
          } else {
            buttonLoadingHeights[size] = height;
          }
        });
        if (!isLoading && isEmpty(buttonLoadingHeights)) {
          setIsLoading(true);
        } else if (isLoading) {
          let allHeightsMatch = true as boolean;
          // If we are loading, we want to ensure the heights are set for loading state
          Object.keys(buttonHeights).forEach((size) => {
            if (buttonLoadingHeights[size] !== buttonHeights[size]) {
              allHeightsMatch = false;
              const msg = `Button heights mismatch for size ${size}. Loading height: ${buttonLoadingHeights[size]}, Normal height: ${buttonHeights[size]}`;
              setCheckMessage(msg);
            }
          });
          if (allHeightsMatch) {
            setCheckMessage("All button heights match for loading state.");
          }
          setIsLoading(false);
        }
      }
    }, 1000);
  }, [isLoading]);

  return (
    <FlexCol ref={ref} className="ComponentList f-1 min-w-0 p-2 o-auto">
      {checkMessage}
      {(["micro", "small", "default", "large"] as const).map((size) => (
        <FlexCol key={size} data-size={size} className="mb-2">
          Buttons - {size} - {buttonHeights[size]}px
          {[0, 1, 2, 3, 4].map((n) => (
            <FlexRow key={n + size} className={`bg-color-${n}`}>
              {(
                ["icon", undefined, "faded", "outline", "no-icon"] as const
              ).map((variant, i) => (
                <FlexCol key={variant + size} className="p-2">
                  {([undefined, "action", "danger"] as const).map((color) => (
                    <Btn
                      key={(color ?? "c") + (variant ?? "v") + i}
                      loading={isLoading}
                      iconPath={
                        variant === "no-icon" ? undefined : mdiFullscreen
                      }
                      variant={variant === "no-icon" ? "outline" : variant}
                      size={size}
                      color={color}
                      children={
                        (variant && variant !== "icon") || color ?
                          `${variant} ${color}`
                        : undefined
                      }
                    />
                  ))}
                </FlexCol>
              ))}
            </FlexRow>
          ))}
        </FlexCol>
      ))}
    </FlexCol>
  );
};
