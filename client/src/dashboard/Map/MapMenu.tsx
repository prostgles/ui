import { mdiChevronLeft, mdiFilterOutline, mdiImageFilterCenterFocus, mdiLaserPointer, mdiTargetVariant } from "@mdi/js";
import React from "react";
import Btn from "../../components/Btn";
import Slider from "../../components/Slider";
import { DecKGLMapProps, DeckGLMapState } from "./DeckGLMap";

type MapMenuProps = Pick<DeckGLMapState, "basemap" | "dataOpacity" | "autoZoom"> & Pick<DecKGLMapProps, "options" | "onOptionsChange"> & {
  onBaseMapChange: (baseMap: DeckGLMapState["basemap"])=>void;
  onDataOpacityChange: (dataOpacity: number)=>void;
  onAutoZoomChange: (autoZoom: boolean)=>void;
  onFitBounds: ()=>void;
  cursorCoords: {
    show: boolean;
    onChange: (hoverCoords: any) => void;
  }
}

export default function MapMenu({ 
  basemap, 
  onBaseMapChange, 
  dataOpacity, 
  onDataOpacityChange, 
  options, 
  autoZoom, 
  onFitBounds, 
  onOptionsChange, 
  onAutoZoomChange, 
  cursorCoords 
}: MapMenuProps){
  return <div className="map-controls-right " style={{ position: "absolute", right: 0, top: 0, bottom: 0 }}>
    {window.isMobileDevice && <Btn iconPath={mdiChevronLeft} style={{ marginLeft: "-4em"}} />}
    <Slider label={"Basemap opacity " + `${basemap.opacity.toFixed(1)}`} min={0} max={1} value={basemap.opacity} 
      onChange={opacity => {
        onBaseMapChange({ ...basemap, opacity })
      }}
    />
    <Slider label={"Basemap desaturate " + `${basemap.desaturate.toFixed(1)}`} min={-15} max={15} value={basemap.desaturate} 
      onChange={desaturate => {
        onBaseMapChange({ ...basemap, desaturate })
      }}
    />
    
    <Slider label="Data opacity" min={0.001} max={1} value={dataOpacity} 
    onChange={dataOpacity => {
      onDataOpacityChange(dataOpacity);
    }}/>
    <div className="w-full">
      <Btn title="Zoom to data extent"
        iconPath={mdiImageFilterCenterFocus} 
        className="b b-gray-200 mt-1 bg-0"
        disabledInfo={autoZoom? "Must disable Auto zoom to data extent" : options.filterExtent? "Must disable 'Auto Filter map extent'" : undefined}
        onClick={onFitBounds}
      >Zoom to data extent</Btn>
      <Btn title="Auto zoom to data extent"
        iconPath={mdiImageFilterCenterFocus}
        color={autoZoom? "action" : undefined} 
        className="b b-gray-200 mt-1  bg-0"
        disabledInfo={options.filterExtent? "Must disable 'Auto Filter map extent'" : undefined}
        onClick={async e => {
          onAutoZoomChange(!autoZoom);
          onOptionsChange({ filterExtent: !!autoZoom });
        }}
      >Auto Zoom to data extent</Btn>
      <Btn title="Filter data to map extent"
        iconPath={mdiFilterOutline}
        color={options.filterExtent? "action" : undefined} 
        className="b b-gray-200 mt-1  bg-0"
        disabledInfo={autoZoom? "Must disable 'Auto Zoom to data extent'" : undefined}
        onClick={async e => {
          onOptionsChange({ filterExtent: !options.filterExtent });
          onAutoZoomChange(false);
        }}
      >Filter data to map extent</Btn>
      <Btn title="Show cursor coords"
        iconPath={mdiTargetVariant}
        color={cursorCoords.show? "action" : undefined}  
        className="b b-gray-200 mt-1  bg-0"
        onClick={async e => {
          cursorCoords.onChange(!cursorCoords.show);
        }}
      >Show cursor coords</Btn>
    </div>
    
  </div>
}