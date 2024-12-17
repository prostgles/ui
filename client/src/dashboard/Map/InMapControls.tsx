import React, { useCallback, useEffect, useState } from "react";

import { mdiImageFilterCenterFocus, mdiTargetVariant } from "@mdi/js";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow } from "../../components/Flex";
import Select from "../../components/Select/Select";
import { MapExtentBehavior, type DecKGLMapProps } from "./DeckGLMap";
import { DeckGLFeatureEditor } from "./DeckGLFeatureEditor";
import type { DeckGlLibs, DeckWrapped } from "./DeckGLWrapped";
import type { GeoJsonLayer } from "deck.gl";

type P = Pick<
  DecKGLMapProps,
  "tileAttribution" | "onOptionsChange" | "topLeftContent" | "options" | "edit"
> & {
  deckGlLibs: DeckGlLibs;
  fitBounds: VoidFunction;
  deckW: DeckWrapped;
  onRenderLayer: (layer: GeoJsonLayer<any, {}> | undefined) => void;
};
export const InMapControls = ({
  tileAttribution,
  topLeftContent,
  onOptionsChange,
  options,
  deckGlLibs,
  edit,
  fitBounds,
  deckW,
  onRenderLayer,
}: P) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [showCursorCoords, setShowCursorCoords] = useState(false);
  const refCursor = React.useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!showCursorCoords) return;
    const sub = deckW.currHoverRState.subscribe((hover) => {
      if (!refCursor.current) return;
      refCursor.current.innerText =
        !hover?.coordinate ?
          ""
        : `${hover.coordinate.map((v) => v.toString().padStart(3, "0")).join("\n")}`;
    });
    return sub.unsubscribe;
  }, [showCursorCoords, deckW.currHoverRState]);

  const onRenderDrawnLayer = useCallback(
    (editedFeaturesLayer: GeoJsonLayer<any, {}> | undefined) => {
      onRenderLayer(editedFeaturesLayer);
      setIsDrawing(!!editedFeaturesLayer);
    },
    [onRenderLayer],
  );

  return (
    <>
      {showCursorCoords && (
        <div
          ref={refCursor}
          className="absolute bg-color-0 rounded p-p25"
          style={{ bottom: 0, left: 0, zIndex: 1 }}
        />
      )}

      {tileAttribution?.title && (
        <div
          className="text-ellipsis noselect rounded font-14"
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            maxHeight: "1.5em",
            zIndex: 2, // Must be on top of autoZoom button
            backdropFilter: "blur(6px)",
            padding: "4px",
          }}
        >
          <a href={tileAttribution.url} target="_blank">
            {tileAttribution.title}
          </a>
        </div>
      )}

      <FlexCol
        className="MapTopLeftControls ai-start flex-col gap-1 absolute ai-center jc-center"
        style={{ top: "1em", left: "1em", zIndex: 1 }}
      >
        {topLeftContent}

        <Btn
          title="Show cursor coords"
          iconPath={mdiTargetVariant}
          color={showCursorCoords ? "action" : undefined}
          variant="faded"
          size="small"
          className="shadow"
          onClick={() => {
            setShowCursorCoords(!showCursorCoords);
          }}
        />
      </FlexCol>

      <FlexRow
        className="MapTopControls absolute jc-center"
        style={{ top: "1em", left: "5em", right: "1em", zIndex: 1 }}
      >
        {!isDrawing && (
          <FlexRow className="in-map-hover-control mx-auto">
            <Select
              title="Map extent behavior"
              data-command="MapExtentBehavior"
              fullOptions={MapExtentBehavior}
              value={options.extentBehavior}
              onChange={(extentBehavior) => {
                onOptionsChange({ extentBehavior });
              }}
            />
            <Btn
              title="Zoom to data"
              iconPath={mdiImageFilterCenterFocus}
              onClick={fitBounds}
              className="shadow "
              variant="faded"
            />
          </FlexRow>
        )}

        {edit && (
          <DeckGLFeatureEditor
            edit={edit}
            deckW={deckW}
            onRenderLayer={onRenderDrawnLayer}
            deckGlLibs={deckGlLibs}
          />
        )}
      </FlexRow>
    </>
  );
};
