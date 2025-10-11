import type { Coords, Point } from "../Charts";
import type { PanListeners } from "../setPan";
import { setPan } from "../setPan";
import { createHiPPICanvas } from "./createHiPPICanvas";
import { drawMonotoneXCurve } from "./drawMonotoneXCurve";
import { allLowerCase, type ShapeV2 } from "./drawShapes/drawShapes";
import { roundRect } from "./roundRect";
import type { XYFunc } from "./TimeChart";

export type StrokeProps = {
  lineWidth: number;
  strokeStyle: CanvasGradient | string | CanvasPattern;
};
export type FillProps = {
  fillStyle: CanvasGradient | string | CanvasPattern;
};
export type ShapeBase<T = void> = {
  id: string | number;
  elevation?: number;
  opacity?: number;
} & (T extends void ? { data?: T } : { data: T });

export type Circle<T = any> = ShapeBase<T> &
  StrokeProps &
  FillProps & {
    type: "circle";
    r: number;
    coords: Point;
  };

export type Rectangle<T = any, C = void> = ShapeBase<T> &
  StrokeProps &
  FillProps & {
    type: "rectangle";
    w: number;
    h: number;
    borderRadius?: number;
    coords: Point;
    children?: Exclude<ShapeV2<C>, LinkLine>[];
  };

export type ChartedText<T = any> = ShapeBase<T> &
  FillProps & {
    type: "text";
    text: string;
    font?: string;
    textAlign?: CanvasTextAlign;
    coords: Point;
    background?: Partial<StrokeProps> &
      Partial<FillProps> & {
        padding?: number;
        borderRadius?: number;
      };
  };

export type MultiLine<T = any> = ShapeBase<T> &
  StrokeProps & {
    type: "multiline";
    coords: Point[];
    variant?: "smooth";
  };
export type LinkLine<T = any> = ShapeBase<T> &
  StrokeProps & {
    type: "linkline";
    sourceId: string | number;
    targetId: string | number;
    sourceYOffset: number;
    targetYOffset: number;
    variant?: "smooth";
  };
export type Image<T = any> = ShapeBase<T> & {
  type: "image";
  coords: Point;
  w: number;
  h: number;
  image: CanvasImageSource;
};

export type Polygon<T = any> = ShapeBase<T> &
  StrokeProps &
  FillProps & {
    type: "polygon";
    coords: Point[];
  };

export type Shape<T = any> =
  | Rectangle<T>
  | Circle<T>
  | ChartedText<T>
  | MultiLine<T>
  | Polygon<T>;

export type TextMeasurement = {
  width: number;
  fontHeight: number;
  actualHeight: number;
};

type ChartView = {
  xScale: number;
  yScale: number;

  /** topLeft scaled offset used for panning  */
  xO: number;
  yO: number;
};

export type CanvasChartViewDataExtent = {
  /**
   * Left most visible X value
   * To get canvas position use getScreenXY
   */
  leftX: number;
  topY: number;
  /**
   * Right most visible X value
   * To get canvas position use getScreenXY
   */
  rightX: number;
  bottomY: number;
  xScale: number;
  yScale: number;
};
export type GetShapes = (opts: CanvasChartViewDataExtent) => Shape[];

type TimeChartZoomPanEvents = Partial<PanListeners> & {
  zoomPanDisabled?: boolean;
  onExtentChange?: (ext: CanvasChartViewDataExtent) => void;
  onExtentChanged?: (ext: CanvasChartViewDataExtent) => void;
};

type ChartOptions = {
  node: HTMLDivElement;
  canvas: HTMLCanvasElement;
  yScaleLocked?: boolean;
  yPanLocked?: boolean;
  minXScale?: number;
  maxXScale?: number;
  onResize: undefined | VoidFunction;
  events?:
    | {
        disabled: true;
      }
    | (TimeChartZoomPanEvents & { disabled?: undefined });
};

/**
 * Canvas draw component that allows zoom in and panning
 */
export class CanvasChart {
  node?: HTMLDivElement;
  ctx?: CanvasRenderingContext2D;
  opts?: ChartOptions;
  deckLayers?: any[];
  currViewState?: any;
  currViewStateValid = false;
  shapes?: Shape[] = [];

  /**
   * Used for zoom in and panning
   */
  view: ChartView = {
    xScale: 1,
    yScale: 1,
    xO: 0,
    yO: 0,
  };

  static clampScale(newScale: number): number {
    const MIN_SCALE = 0.000001;
    const MAX_SCALE = 12200000;

    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
  }

  get events() {
    return this.opts?.events && this.opts.events.disabled !== true ?
        this.opts.events
      : undefined;
  }

  constructor(opts: ChartOptions) {
    this.opts = opts;
    const { node, canvas, events } = opts;

    this.init();
    const resizeObserver = new ResizeObserver(() => {
      if (this.ctx) {
        const { offsetHeight, offsetWidth } = node;

        createHiPPICanvas(canvas, offsetWidth, offsetHeight);

        /**
         * This cancels createHiPPICanvas. Why was it needed?
         */
        // this.ctx.canvas.width  = offsetWidth;
        // this.ctx.canvas.height = offsetHeight;
        setTimeout(() => {
          this.opts?.onResize?.();
        }, 50);
        this.render();
      }
    });
    resizeObserver.observe(node);

    if (this.opts.events?.disabled) return;
    const getEvents = () => this.events;
    let initialView: ChartView | null = null;
    setPan(node, {
      ...events,
      onPanStart: (ev, e) => {
        initialView = { ...this.view };
        const events = getEvents();
        if (!events) return;

        events.onPanStart?.(ev, e);
      },
      onPan: (ev, e) => {
        if (!initialView) return;
        this.setView({
          ...this.view,
          xO: initialView.xO + ev.xDiff,
          yO: initialView.yO + ev.yDiff,
        });
        canvas.style.cursor = "move";
        const events = getEvents();
        if (!events) return;

        events.onPan?.(ev, e);
      },
      onPanEnd: (ev, e) => {
        canvas.style.cursor = "default";
        const events = getEvents();
        if (!events) return;

        events.onPanEnd?.(ev, e);

        this.onExtentChange();
      },
      onDoubleTap: ({ x, y }) => {
        const delta = 1;
        const xScaleDelta = this.view.xScale * Math.sign(delta) * 2,
          yScaleDelta = this.view.yScale * Math.sign(delta) * 2,
          xScale = CanvasChart.clampScale(this.view.xScale + xScaleDelta),
          yScale = CanvasChart.clampScale(this.view.yScale + yScaleDelta),
          xSF = xScale / this.view.xScale,
          ySF = yScale / this.view.yScale;

        const xO = x - xSF * (x - this.view.xO),
          yO = y - ySF * (y - this.view.yO);

        this.setView({
          ...this.view,
          xScale,
          yScale,
          xO,
          yO,
        });
      },
      onSinglePinch: ({ delta, x, y, w, h }) => {
        const xScaleDelta = this.view.xScale * Math.sign(delta) * 0.1,
          yScaleDelta = this.view.yScale * Math.sign(delta) * 0.1,
          xScale = CanvasChart.clampScale(this.view.xScale + xScaleDelta),
          yScale = CanvasChart.clampScale(this.view.yScale + yScaleDelta),
          xSF = xScale / this.view.xScale,
          ySF = yScale / this.view.yScale;

        const xO = x - xSF * (x - this.view.xO),
          yO = y - ySF * (y - this.view.yO);

        this.setView({
          ...this.view,
          xScale,
          yScale,
          xO,
          yO,
        });
      },
    });
  }

  onExtentChangeTimeout?: NodeJS.Timeout;
  onExtentChange = () => {
    if (!this.events) return;
    this.events.onExtentChange?.({ ...this.getExtent() });

    if (this.onExtentChangeTimeout) {
      clearTimeout(this.onExtentChangeTimeout);
    }

    if (!this.events.onExtentChanged) return;
    this.onExtentChangeTimeout = setTimeout(() => {
      const newExtent = { ...this.getExtent() };

      this.events?.onExtentChanged?.(newExtent);
    }, 200);
  };

  setView(view: Partial<ChartView>) {
    if (!this.opts) throw "No opts";

    const {
      yScaleLocked = false,
      yPanLocked = false,
      minXScale,
      maxXScale,
    } = this.opts;
    const oldView = { ...this.view };
    this.view = {
      ...this.view,
      ...view,
    };

    if (yScaleLocked) {
      this.view.yScale = 1;
    }
    if (yPanLocked) {
      this.view.yO = oldView.yO;
    }
    if (
      (typeof minXScale === "number" && this.view.xScale < minXScale) ||
      (typeof maxXScale === "number" && this.view.xScale > maxXScale)
    ) {
      this.view.xO = oldView.xO;
      if (typeof minXScale === "number" && this.view.xScale < minXScale) {
        this.view.xScale = minXScale;
        this.view.xO = Math.max(0, oldView.xO / 10);
      }
      if (typeof maxXScale === "number" && this.view.xScale > maxXScale) {
        this.view.xScale = oldView.xScale;
      }
    }

    if (JSON.stringify(this.view) !== JSON.stringify(oldView)) {
      this.onExtentChange();
      this.render(this.rawShapes);
    }
  }

  init() {
    if (!this.opts) return;
    const { node, canvas, events } = this.opts,
      { w, h } = this.getWH();

    this.ctx = canvas.getContext("2d")!;
    this.ctx.canvas.width = w;
    this.ctx.canvas.height = h;

    createHiPPICanvas(canvas, node.offsetWidth, node.offsetHeight);

    this.ctx.imageSmoothingEnabled = true;

    if (events?.disabled) return;
    node.onwheel = (e) => {
      e.preventDefault();
      e.preventDefault();
      const { xScale, yScale } = this.view;
      let { xO, yO } = this.view;

      const r = node.getBoundingClientRect(),
        xNode = e.pageX - r.left,
        yNode = e.pageY - r.top,
        // { deltaY } = e;
        getFactor = (deltaV) => Math.abs(deltaV) * (0.2 / 50),
        ne = normalizeWheel(e),
        deltaY = ne.pixelY, // (-1 * (e as any).wheelDeltaY) || e.deltaY,
        deltaX = ne.pixelX, //(-1 * (e as any).wheelDeltaX) || e.deltaX;
        factor = Math.max(0.1, getFactor(deltaY));

      // console.log(factor)
      let newYScale = yScale * Math.exp(-Math.sign(deltaY) * factor),
        newXScale = xScale * Math.exp(-Math.sign(deltaY) * factor);

      newXScale = CanvasChart.clampScale(newXScale);
      newYScale = CanvasChart.clampScale(newYScale);

      const xSF = newXScale / xScale;
      const ySF = newYScale / yScale;
      xO = -deltaX + xNode - xSF * (xNode - xO);
      yO = yNode - ySF * (yNode - yO);

      this.setView({ xO, yO, yScale: newYScale, xScale: newXScale });
    };
  }

  getWH() {
    const { canvas } = this.opts!;
    return {
      w: canvas.offsetWidth,
      h: canvas.offsetHeight,
    };
  }

  /** Used to get initial XY of data after panning and zooming is reversed. Used for tooltips */
  getDataXY = (xCanvas: number, yCanvas: number): [number, number] => {
    const {
      view: { xScale, yScale, xO, yO },
    } = this;
    return [(xCanvas - xO) / xScale, (yCanvas - yO) / yScale];
  };

  /** Used to get final drawing XY that takes into account panning and zooming. Used for drawing data on canvas */
  getScreenXY: XYFunc = (xData: number, yData?: number | undefined) => {
    const {
      view: { xScale, yScale, xO, yO },
    } = this;
    const x = xData * xScale + xO;
    let y: number | undefined = undefined;
    if (yData !== undefined) {
      y = yData * yScale + yO;
    }
    return [x, y] as any;
  };

  getExtent = (): CanvasChartViewDataExtent => {
    const { w, h } = this.getWH();
    const [leftX, topY] = this.getDataXY(0, 0);
    const [rightX, bottomY] = this.getDataXY(w, h);

    return {
      leftX,
      topY,
      rightX,
      bottomY,
      ...this.view,
    };
  };

  measureTextCache: Map<string, TextMeasurement> = new Map();
  measureText = (s: ChartedText): TextMeasurement => {
    const { ctx } = this;
    if (!ctx) throw "No ctx";
    const { textAlign = "", text = "", font = "" } = s;
    const key = [textAlign, text.length, font].join(";");
    const cached = this.measureTextCache.get(key);
    if (cached) return cached;
    ctx.fillStyle = s.fillStyle;
    ctx.textAlign = s.textAlign ?? ctx.textAlign;
    ctx.font = s.font || ctx.font;
    const metrics = ctx.measureText(s.text);

    const fontHeight =
      metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    const actualHeight =
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const result = {
      width: metrics.width,
      fontHeight,
      actualHeight,
    };
    this.measureTextCache.set(key, result);
    return result;
  };

  private parseData(_shapes: (Shape | GetShapes)[]): Shape[] {
    let shapes: Shape[] = [];
    const ext = this.getExtent();
    _shapes.map((s) => {
      if (typeof s === "function") {
        shapes = shapes.concat(s(ext));
      } else {
        shapes.push(s);
      }
    });
    return window.structuredClone(shapes);
  }

  rawShapes: (Shape | GetShapes)[] = [];
  render(_shapes?: (Shape | GetShapes)[]) {
    let shapes: Shape[] = [];

    if (_shapes) {
      this.rawShapes = [..._shapes];
      shapes = this.parseData(_shapes);
      this.shapes = shapes;
    } else if (this.shapes) {
      shapes = [...this.shapes];
    }

    const { w, h } = this.getWH();
    const { ctx } = this;
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    shapes.map((s) => {
      const getCoords = <C extends Coords>(coords: C): C => {
        if (Array.isArray(coords[0])) {
          return coords.map((p) => getCoords(p)) as C;
        }
        const point = coords as Point;
        const [x, y] = this.getScreenXY(point[0], point[1]);
        return [x, y] as C;
      };
      const coords: any = getCoords(s.coords);

      if (!coords) return;

      ctx.lineJoin = "bevel";
      if (s.type === "rectangle") {
        ctx.fillStyle = s.fillStyle;
        ctx.lineWidth = s.lineWidth;
        ctx.strokeStyle = s.strokeStyle;
        const [x1] = this.getScreenXY(coords[0]);
        const [x2] = this.getScreenXY(s.w + coords[0]);
        const w = x2 - x1;
        if (s.borderRadius) {
          roundRect(ctx, coords[0], coords[1], w, s.h, s.borderRadius);
        } else {
          ctx.beginPath();
          ctx.rect(coords[0], coords[1], w, s.h);
        }
        ctx.fill();
        ctx.stroke();
      } else if (s.type === "circle") {
        ctx.fillStyle = s.fillStyle;
        ctx.lineWidth = s.lineWidth;
        ctx.strokeStyle = s.strokeStyle;
        ctx.beginPath();
        ctx.arc(coords[0], coords[1], s.r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (s.type === "multiline") {
        ctx.lineCap = "round";
        ctx.lineWidth = s.lineWidth;
        ctx.strokeStyle = s.strokeStyle;

        if (s.variant === "smooth" && coords.length > 2) {
          drawMonotoneXCurve(ctx, coords);
        } else {
          coords.forEach(([x, y], i) => {
            if (!i) {
              ctx.beginPath();
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.stroke();
        }
      } else if (s.type === "polygon") {
        ctx.fillStyle = s.fillStyle;
        ctx.lineWidth = s.lineWidth;
        ctx.strokeStyle = s.strokeStyle;
        ctx.beginPath();
        coords.map(([x, y], i) => {
          if (!i) {
            ctx.beginPath();
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
      } else if ((s.type as any) === "text") {
        const { textAlign = "start" } = s;

        if (s.background) {
          const txtSize = this.measureText(s);
          const txtPadding = s.background.padding || 6;
          ctx.fillStyle = s.background.fillStyle ?? ctx.fillStyle;
          if (s.background.strokeStyle) {
            ctx.strokeStyle = s.background.strokeStyle;
          }
          ctx.lineWidth = s.background.lineWidth ?? ctx.lineWidth;
          let x = coords[0] - txtSize.width / 2 - txtPadding;
          const y =
            coords[1] -
            (allLowerCase(s.text) ? 1 : 1) * txtSize.actualHeight -
            txtPadding;

          if (["left", "start"].includes(textAlign)) {
            x = coords[0] - txtPadding;
          } else if (["right", "end"].includes(textAlign)) {
            x = coords[0] - txtSize.width - txtPadding;
          }

          roundRect(
            ctx,
            x,
            y,
            txtSize.width + 2 * txtPadding,
            txtSize.actualHeight + 2 * txtPadding,
            s.background.borderRadius || 0,
          );
          ctx.closePath();
          if (s.background.strokeStyle) {
            ctx.stroke();
          }
          ctx.fill();
        }

        ctx.fillStyle = s.fillStyle;
        ctx.textAlign = textAlign;
        ctx.font = s.font || ctx.font;
        ctx.fillText(s.text, coords[0], coords[1]);
        // s.text.split("\n").map(text => {
        //   ctx.fillText(text, coords[0], coords[1]);
        // })
      } else throw "Unexpected shape type: " + (s as any).type;
    });

    const { canvas } = this.opts ?? {};
    if (canvas) {
      canvas._drawn = {
        shapes,
        scale: 1,
        translate: { x: 0, y: 0 },
      };
    }
  }
}

const PIXEL_STEP = 10;
const LINE_HEIGHT = 40;
const PAGE_HEIGHT = 800;
function normalizeWheel(event): {
  spinX: number;
  spinY: number;
  pixelX: number;
  pixelY: number;
} {
  let sX = 0,
    sY = 0, // spinX, spinY
    pX = 0,
    pY = 0; // pixelX, pixelY

  // Legacy
  if ("detail" in event) {
    sY = event.detail;
  }
  if ("wheelDelta" in event) {
    sY = -event.wheelDelta / 120;
  }
  if ("wheelDeltaY" in event) {
    sY = -event.wheelDeltaY / 120;
  }
  if ("wheelDeltaX" in event) {
    sX = -event.wheelDeltaX / 120;
  }

  // side scrolling on FF with DOMMouseScroll
  if ("axis" in event && event.axis === event.HORIZONTAL_AXIS) {
    sX = sY;
    sY = 0;
  }

  pX = sX * PIXEL_STEP;
  pY = sY * PIXEL_STEP;

  if ("deltaY" in event) {
    pY = event.deltaY;
  }
  if ("deltaX" in event) {
    pX = event.deltaX;
  }

  if ((pX || pY) && event.deltaMode) {
    if (event.deltaMode == 1) {
      // delta in LINE units
      pX *= LINE_HEIGHT;
      pY *= LINE_HEIGHT;
    } else {
      // delta in PAGE units
      pX *= PAGE_HEIGHT;
      pY *= PAGE_HEIGHT;
    }
  }

  // Fall-back if spin cannot be determined
  if (pX && !sX) {
    sX = pX < 1 ? -1 : 1;
  }
  if (pY && !sY) {
    sY = pY < 1 ? -1 : 1;
  }

  return {
    spinX: sX,
    spinY: sY,
    pixelX: pX,
    pixelY: pY,
  };
}
