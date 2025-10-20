import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * @deprecated Use SpinnerV4 instead. Deprecated due to performance issues and currentColor issues
 */
export const SpinnerV3 = ({ size }: { size: string }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [color, setColor] = useState("currentColor");

  useEffect(() => {
    if (imgRef.current?.parentElement) {
      const computedColor = getComputedStyle(
        imgRef.current.parentElement,
      ).color;
      setColor(computedColor);
    }
  }, []);

  const dataUrl = useMemo(() => {
    const sizeStringified = JSON.stringify(size);
    const svgString = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="Spinner f-0"
      width=${sizeStringified}
      height=${sizeStringified}
      style="color: ${color};"
      viewBox="0 0 24 24"
    >
      <defs>
        <style>
          .Spinner path {
            transform-box: fill-box;
            transform-origin: center;
            animation: rotator 0.75s infinite linear;
            will-change: transform;
          }
          @keyframes rotator {
            100% {
              transform: translateZ(0) rotate(360deg);
            }
          }
        </style>
      </defs>
      <path
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z"
      />
    </svg>
  `;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
    return dataUrl;
  }, [size, color]);
  return (
    <img ref={imgRef} src={dataUrl} style={{ width: size, height: size }} />
  );
};
