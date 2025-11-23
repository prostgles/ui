import ErrorComponent from "@components/ErrorComponent";
import Loading from "@components/Loader/Loading";
import React from "react";
import type { GeoJsonLayerProps } from "src/dashboard/Map/DeckGLMap";
import type { W_MapProps } from "../W_Map";
import { classOverride } from "@components/Flex";

type P = {
  loadingLayers: boolean;
  fetchedLayers: GeoJsonLayerProps[];
  error: any;
} & Pick<W_MapProps, "active_row" | "w">;
export const MapInfoSection = ({
  loadingLayers,
  w,
  active_row,
  fetchedLayers,
  error,
}: P) => {
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

  if (
    !loadingLayers &&
    active_row &&
    !fetchedLayers.some((l) => l.features.length)
  ) {
    return (
      <Wrapper className="w-full h-full ">
        <div
          className="p-p5 rounded"
          style={{
            background: "rgb(255 255 255 / 20%)",
            backdropFilter: "blur(4px)",
          }}
        >
          No location data for the active row selection.
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
