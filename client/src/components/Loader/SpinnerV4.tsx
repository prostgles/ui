import React from "react";

export const SpinnerV4 = ({ size }: { size: string }) => {
  return (
    <div
      className="SpinnerV3"
      style={{
        width: size,
        height: size,

        backgroundColor: "currentColor",
        maskImage: spinnerDataUrl,
        WebkitMaskImage: spinnerDataUrl,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",

        // borderWidth: "2px",
        // borderStyle: "solid",
        // borderColor: "currentColor",
        // borderBottomColor: "transparent",
        // borderRadius: "50%",

        // animation: "rotator 0.75s infinite linear",

        animation: "rotator 0.75s steps(36) infinite ", // reduce cpu by using steps
        willChange: "transform",
        backfaceVisibility: "hidden",
      }}
    />
  );
};
const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z"/>
      </svg>
    `;
const spinnerDataUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(svgString)}")`;
