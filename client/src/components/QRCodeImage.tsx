import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";
import PopupMenu from "./PopupMenu";

type QRCodeImageProps = {
  url: string | undefined;
  size?: number;
  variant: "href-wrapped" | "table-cell" | "canvas-only";
};

export const QRCodeImage = ({ size, url, variant }: QRCodeImageProps) => {
  const canvasNode = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasNode.current;
    if (!canvas) return;

    if (url) {
      const sizeOpts =
        Number.isFinite(size) ?
          { width: size }
        : ({
            width: Math.min(canvas.offsetWidth, canvas.offsetHeight),
          } as const);
      QRCode.toCanvas(canvas, url, sizeOpts);
    } else {
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [size, url, canvasNode]);

  if (!url) return null;

  const canvas = <canvas ref={canvasNode} style={{}} />;

  if (variant === "canvas-only") return canvas;

  const wrappedCanvas = (
    <a href={url} target={"_blank"}>
      {/* {window.isMobileDevice && <div>Tap image</div>} */}
      {canvas}
    </a>
  );

  if (variant === "href-wrapped") {
    return wrappedCanvas;
  }

  return (
    <PopupMenu
      positioning="center"
      title={url}
      button={canvas}
      contentClassName="ai-center"
      render={() => <QRCodeImage size={400} url={url} variant="canvas-only" />}
    />
  );
};
