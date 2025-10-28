import { mdiFullscreen } from "@mdi/js";
import React, { useEffect, useRef, useState } from "react";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { isEmpty } from "../utils";
import { useLocation } from "react-router-dom";
import Loading from "@components/Loader/Loading";

const buttonHeights: Record<string, number> = {};
const buttonLoadingHeights: Record<string, number> = {};

export const ComponentList = () => {
  const { hash } = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [checkMessage, setCheckMessage] = useState(
    "Checking button heights...",
  );
  const isLoaderTest = hash === "#loader-test";

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
          if (isLoaderTest) return;
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
  }, [isLoading, isLoaderTest]);

  if (hash === "#loader") {
    return <Loading />;
  }

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
      {Array(isLoaderTest ? 5000 : 0)
        .fill(0)
        .map((_, i) => (
          <div key={i} style={{ top: 0, left: 0, position: "absolute" }}>
            Increasing node count
          </div>
        ))}
    </FlexCol>
  );
};
