import {
  TextLayer,
  type Accessor,
  type AccessorFunction,
  type UpdateParameters,
  type Position,
  type Deck,
} from "deck.gl";
import type { _TextBackgroundLayer as TextBackgroundLayer } from "@deck.gl/layers";
import {
  filterLabelCollisions,
  getLabelBounds,
  type LabelBounds,
} from "./labelCollision";

export class CollisionFilteredTextLayer extends TextLayer<
  unknown,
  {
    collisionPriority: number;
    getCollisionPriority: Accessor<unknown, number>;
  }
> {
  static layerName = "CollisionFilteredTextLayer";
  static defaultProps = {
    ...TextLayer.defaultProps,
    collisionPriority: 1,
    getCollisionPriority: { type: "accessor" as const, value: 0 },
  };

  initializeState() {
    super.initializeState();
    const { deck, layerManager } = this.context;
    if (deck) labelLayerManagers.set(deck, layerManager);
  }

  shouldUpdateState({ changeFlags }: UpdateParameters<this>) {
    return changeFlags.somethingChanged;
  }

  getLabelCandidates() {
    if (!this.props.visible) return [];
    const [background] = super.renderLayers();
    if (!background) return [];
    /* Use deck.gl's layout for exact bounds, including wrapping and alignment. */
    const { getBoundingRect, fontSize } = (
      background as TextBackgroundLayer<unknown>
    ).props;
    const { viewport } = this.context;
    const {
      getSize,
      getPosition,
      getAngle,
      getPixelOffset,
      sizeScale,
      sizeMinPixels,
      sizeMaxPixels,
    } = this.props;
    const data = this.props.data as unknown[];
    const candidates: LabelCandidate[] = [];
    data.forEach((label, index) => {
      const info = { index, data, target: [] };
      if (!this.props.getText(label, info)) return;
      const size = Math.max(
        sizeMinPixels,
        Math.min(
          sizeMaxPixels,
          getAccessorValue(getSize, label, info) * sizeScale,
        ),
      );
      const scale = size / fontSize;
      const [left, top, width, height] = getAccessorValue(
        getBoundingRect,
        label,
        info,
      );
      const angle = getAccessorValue(getAngle, label, info);
      const radians = (-angle * Math.PI) / 180;
      const centerX = (left + width / 2) * scale;
      const centerY = (top + height / 2) * scale;
      const [offsetX, offsetY] = getAccessorValue(getPixelOffset, label, info);
      const [x = 0, y = 0] = this.project(
        Array.from(getAccessorValue(getPosition, label, info)),
      );
      const bounds = getLabelBounds(
        [
          x +
            offsetX +
            centerX * Math.cos(radians) -
            centerY * Math.sin(radians),
          y +
            offsetY +
            centerX * Math.sin(radians) +
            centerY * Math.cos(radians),
        ],
        width * scale,
        height * scale,
        viewport,
        angle,
      );
      if (bounds)
        candidates.push({
          layer: this,
          index,
          size,
          bounds,
          priority: getAccessorValue(
            this.props.getCollisionPriority,
            label,
            info,
          ),
        });
    });
    return candidates;
  }

  setVisibleLabels(visibleSizes: Map<number, number>) {
    const previousSizes = labelVisibility.get(this.state);
    if (
      previousSizes?.size === visibleSizes.size &&
      [...visibleSizes].every(
        ([index, size]) => previousSizes.get(index) === size,
      )
    )
      return;
    labelVisibility.set(this.state, visibleSizes);
    this.setNeedsUpdate();
  }

  renderLayers() {
    const [, characters] = super.renderLayers();
    if (!characters) return [];
    const visibleSizes = labelVisibility.get(this.state);
    return [
      characters.clone({
        getSize: (
          _label: unknown,
          { index }: Parameters<AccessorFunction<unknown, number>>[1],
        ) => visibleSizes?.get(index) ?? 0,
        sizeScale: 1,
        sizeMinPixels: 0,
        updateTriggers: {
          ...characters.props.updateTriggers,
          getSize: [visibleSizes],
        },
      }),
    ];
  }
}

/* Resolve all labels after tile and viewport updates, before drawing a frame. */
export const updateLabelCollisions = (deck: Pick<Deck, "getViewports">) => {
  const layerManager = labelLayerManagers.get(deck);
  const [viewport] = deck.getViewports();
  if (!layerManager || !viewport) return;
  for (const layer of layerManager.getLayers())
    layer.activateViewport(viewport);
  layerManager.updateLayers();
  const textLayers = layerManager
    .getLayers()
    .filter(
      (layer): layer is CollisionFilteredTextLayer =>
        layer instanceof CollisionFilteredTextLayer,
    );
  const candidates = textLayers.flatMap((layer) => layer.getLabelCandidates());
  candidates.sort(
    (first, second) =>
      second.layer.props.collisionPriority -
        first.layer.props.collisionPriority ||
      second.size - first.size ||
      second.priority - first.priority,
  );
  const visibleLabels = new Map<
    CollisionFilteredTextLayer,
    Map<number, number>
  >();
  for (const { layer, index, size } of filterLabelCollisions(candidates)) {
    const visibleSizes = visibleLabels.get(layer) ?? new Map<number, number>();
    visibleSizes.set(index, size);
    visibleLabels.set(layer, visibleSizes);
  }
  for (const layer of textLayers)
    layer.setVisibleLabels(visibleLabels.get(layer) ?? new Map());
  layerManager.updateLayers();
};

type LabelCandidate = {
  layer: CollisionFilteredTextLayer;
  index: number;
  size: number;
  bounds: LabelBounds;
  priority: number;
};
const labelVisibility = new WeakMap<object, Map<number, number>>();
const labelLayerManagers = new WeakMap<
  object,
  TextLayer["context"]["layerManager"]
>();

const getAccessorValue = <
  Label,
  Value extends number | Position | readonly number[],
>(
  accessor: Accessor<Label, Value>,
  label: Label,
  info: Parameters<AccessorFunction<Label, Value>>[1],
) => (typeof accessor === "function" ? accessor(label, info) : accessor);
