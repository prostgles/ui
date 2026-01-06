import ErrorComponent from "@components/ErrorComponent";
import Loading from "@components/Loader/Loading";
import React, { useEffect, useState } from "react";
import type { GeoJsonLayerProps } from "src/dashboard/Map/DeckGLMap";
import type { W_MapProps } from "../W_Map";
import { classOverride } from "@components/Flex";

type P = {
  loadingLayers: boolean;
  fetchedLayers: GeoJsonLayerProps[];
  error: unknown;
} & Pick<W_MapProps, "active_row" | "w">;
export const MapInfoSection = (props: P) => {
  const { loadingLayers, w, active_row, fetchedLayers, error } = props;
  const [show, setShow] = useState(false);
  const { extentBehavior } = w.options;
  /** Debounce show */
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShow(true);
    }, 1000);
    return () => {
      setShow(false);
      clearTimeout(timeout);
    };
  }, [props]);

  if (error) {
    return (
      <Wrapper className="relative flex-row m-2 p-2 bg-color-0 rounded max-h-fit ">
        <ErrorComponent title="Map error" withIcon={true} error={error} />
      </Wrapper>
    );
  }

  if (loadingLayers && w.options.refresh?.type !== "Realtime") {
    return (
      <Wrapper>
        <Loading delay={100} />
      </Wrapper>
    );
  }

  if (!show) return null;
  if (!loadingLayers && fetchedLayers.every((l) => !l.features.length)) {
    const message =
      active_row ?
        extentBehavior === "autoZoomToData" ?
          "No location data found for the selected row."
        : "Data not within the current bounds. Set map extent behaviour to 'Follow data'"
      : "No location data to display.";
    return (
      <Wrapper className="w-full h-full ">
        <div
          className="p-p5 rounded"
          style={{
            background: "rgb(255 255 255 / 20%)",
            backdropFilter: "blur(4px)",
          }}
        >
          {message}
        </div>
      </Wrapper>
    );
  }

  return null;
};

const Wrapper = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={classOverride(
        "MapInfoSection f-1 flex-col jc-center ai-center absolute pl-2 mt-1 ml-2",
        className,
      )}
      style={{
        zIndex: 1,
        /** No dark tiles */
        color: "black",
      }}
    >
      {children}
    </div>
  );
};
