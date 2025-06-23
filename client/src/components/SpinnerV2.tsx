import React, { useCallback, useEffect, useRef } from "react";
import { useResizeObserver } from "./ScrollFade/useResizeObserver";

/**
 * Used to reduce CPU load
 */
export const SpinnerV2 = ({ size }: { size: string }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const startAnimation = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null; // Clear the stored ID
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) {
      console.error("SpinnerV2: Failed to get canvas element or 2D context.");
      return;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width;
    canvas.height = height;

    const centerX = width / 2;
    const centerY = height / 2;

    // Spinner properties
    const radius = Math.max(1, (Math.min(width, height) / 2) * 0.8); // Ensure radius is at least 1
    const lineWidth = 2;
    const color = getComputedStyle(canvas).color; // getCssVariableValue("--text-2") || "#888";
    const rotationSpeed = 0.08;
    const arcLength = Math.PI * 1.5; // 270 degrees

    let currentAngle = 0;

    const drawFrame = () => {
      if (canvasRef.current) {
        ctx.clearRect(0, 0, width, height);
        ctx.beginPath();
        ctx.arc(
          centerX,
          centerY,
          radius,
          currentAngle,
          currentAngle + arcLength,
        );
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.lineCap = "round";
        ctx.stroke();
      } else {
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
        }
      }
    };

    const animate = () => {
      // Only proceed if the canvas is still mounted and context exists
      if (!canvasRef.current) {
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
        }
        return;
      }

      currentAngle += rotationSpeed;
      drawFrame();

      // Store the ID of the *next* animation frame request
      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    animate();
  }, []);

  useEffect(() => {
    startAnimation();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [startAnimation]);

  useResizeObserver({
    ref: canvasRef,
    onResize: startAnimation,
  });

  useEffect(() => startAnimation(), [startAnimation]);

  return (
    <div
      className="SpinnerV2 f-0"
      style={{
        width: size,
        height: size,
      }}
    >
      <canvas
        style={{
          width: size,
          height: size,
        }}
        ref={canvasRef}
      />
    </div>
  );
};
