import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

type P = {
  text: string;
  left: number;
  top: number;
  onFinished: () => void;
};

/** Simple message shown for a short time */
export const FlashMessage = (message: P) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      message.onFinished();
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  /** Clear message on url change */
  const location = useLocation();
  const previousLocation = useRef(location);

  useEffect(() => {
    // Only trigger if location actually changed (not on initial mount)
    if (
      previousLocation.current.pathname !== location.pathname ||
      previousLocation.current.search !== location.search
    ) {
      message.onFinished();
    }
    previousLocation.current = location;
  }, [location, message]);

  /** Clear message on any interaction */
  useEffect(() => {
    const clearMessage = () => {
      message.onFinished();
    };

    window.addEventListener("click", clearMessage);
    window.addEventListener("keydown", clearMessage);

    return () => {
      window.removeEventListener("click", clearMessage);
      window.removeEventListener("keydown", clearMessage);
    };
  }, [message]);

  return (
    <div
      className="text-warning bg-color-0 p-1 rounded b b-warning"
      style={{
        zIndex: 99,
        position: "absolute",
        top: message.top,
        left: message.left,
      }}
    >
      {message.text}
    </div>
  );
};
