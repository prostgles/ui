import type React from "react";
import { useRef, useState, useCallback, useEffect } from "react";

export type PointEvent = {
  x: number;
  y: number;
};

interface PanEvent {
  /**
   * x position within the element.
   */
  x: number;
  /**
   * y position within the element.
   */
  y: number;
  deltaX: number;
  deltaY: number;
  startX: number;
  startY: number;
  event: PointerEvent;
}

interface PanHookOptions {
  /**
   * Minimum distance (in pixels) before a pan gesture is recognized
   */
  threshold?: number;
  /**
   * Element to attach the event listeners to
   */
  node: HTMLElement | null;
  /**
   * Fires whenever the pointer moves except when panning
   */
  onPointerMove: (e: PointEvent) => void;
  /**
   * Fires after the pointer is pressed down and the threshold is reached
   */
  onPanStart: (ev: PanEvent) => void;
  /**
   * Fires after onPanStart and when the pointer moves
   */
  onPan: (ev: PanEvent) => void;
  /**
   * Fires after onPan and when the pointer is released
   */
  onPanEnd: () => void;
}

export const usePanEvents = ({
  threshold = 1,
  node,
  onPan,
  onPanEnd,
  onPanStart,
  onPointerMove,
}: PanHookOptions) => {
  // Refs to track the panning state
  const isPanning = useRef(false);
  const hasStartedPan = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });
  const previousPoint = useRef({ x: 0, y: 0 });

  // Clean up function to remove event listeners
  const cleanup = useRef<(() => void) | null>(null);

  // Reset all panning state
  const resetPanState = useCallback(() => {
    isPanning.current = false;
    hasStartedPan.current = false;
    startPoint.current = { x: 0, y: 0 };
    previousPoint.current = { x: 0, y: 0 };
  }, []);

  // Handle pointer down event
  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      // Only handle left-click (button === 0)
      if (event.button !== 0) return;

      // Store the starting point
      const x = event.clientX;
      const y = event.clientY;

      startPoint.current = { x, y };
      previousPoint.current = { x, y };
      isPanning.current = true;
      hasStartedPan.current = false;

      // Create and attach document-level event listeners
      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!isPanning.current) return;

        const currentX = moveEvent.clientX;
        const currentY = moveEvent.clientY;

        // Calculate distance moved from start
        const deltaX = currentX - startPoint.current.x;
        const deltaY = currentY - startPoint.current.y;
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;

        // If not yet panning, check if we've exceeded threshold
        if (!hasStartedPan.current) {
          if (distanceSquared >= threshold * threshold) {
            hasStartedPan.current = true;
            onPanStart({
              x: currentX,
              y: currentY,
              deltaX,
              deltaY,
              startX: startPoint.current.x,
              startY: startPoint.current.y,
              event: moveEvent,
            });
          } else {
            // Not panning yet but still moving, call the pointer move callback
            onPointerMove({ x: currentX, y: currentY });
            return;
          }
        }

        // Call the pan callback
        if (hasStartedPan.current) {
          onPan({
            x: currentX,
            y: currentY,
            deltaX,
            deltaY,
            startX: startPoint.current.x,
            startY: startPoint.current.y,
            event: moveEvent,
          });

          previousPoint.current = { x: currentX, y: currentY };
        }
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        if (isPanning.current && hasStartedPan.current) {
          onPanEnd();
        }

        resetPanState();

        // Remove document event listeners
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
        document.removeEventListener("pointercancel", handlePointerUp);
      };

      // Add document-level event listeners
      document.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      document.addEventListener("pointerup", handlePointerUp, {
        passive: true,
      });
      document.addEventListener("pointercancel", handlePointerUp, {
        passive: true,
      });

      // Store cleanup function
      cleanup.current = () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
        document.removeEventListener("pointercancel", handlePointerUp);
      };
    },
    [threshold, onPanStart, onPan, onPanEnd, onPointerMove, resetPanState],
  );

  // Handle regular pointer move when not panning
  const handleNormalPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isPanning.current) {
        onPointerMove({
          x: event.clientX,
          y: event.clientY,
        });
      }
    },
    [onPointerMove],
  );

  // Set up and clean up event listeners on the node
  useEffect(() => {
    if (!node) return;

    // Add event listeners to the provided node
    node.addEventListener("pointerdown", handlePointerDown);
    node.addEventListener("pointermove", handleNormalPointerMove);

    return () => {
      // Clean up event listeners
      node.removeEventListener("pointerdown", handlePointerDown);
      node.removeEventListener("pointermove", handleNormalPointerMove);

      // Call additional cleanup for document listeners if needed
      if (cleanup.current) {
        cleanup.current();
        cleanup.current = null;
      }

      resetPanState();
    };
  }, [node, handlePointerDown, handleNormalPointerMove, resetPanState]);
};
