import { vibrateFeedback } from "./Dashboard/dashboardUtils";

export type PanEvent = {
  x: number;
  y: number;
  xOffset: number;
  yOffset: number;
  xStart: number;
  yStart: number;
  xDiff: number;
  yDiff: number;
  xTravel: number;
  yTravel: number;
  xNode: number;
  yNode: number;
  xNodeStart: number;
  yNodeStart: number;
  triggered: boolean;
  node: HTMLDivElement;
};
export type PanListeners = {
  threshold?: number;
  doubleTapThreshold?: number;
  tapThreshold?: number;
  onPress?: (
    e: React.PointerEvent<HTMLDivElement>,
    node: HTMLDivElement,
  ) => void;
  onDoubleTap?: (
    args: { x: number; y: number },
    e: React.PointerEvent<HTMLDivElement>,
    node: HTMLDivElement,
  ) => void;
  onRelease?: (
    e: React.PointerEvent<HTMLDivElement>,
    node: HTMLDivElement,
  ) => void;

  onPanStart?: (pe: PanEvent, e: React.PointerEvent<HTMLDivElement>) => void;
  onPan: (pe: PanEvent, e: React.PointerEvent<HTMLDivElement>) => void;
  onPanEnd?: (pe: PanEvent, e: React.PointerEvent<HTMLDivElement>) => void;
  onPinch?: (ev: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    deltaX: number;
    deltaY: number;
  }) => void;
  onSinglePinch?: (ev: {
    x: number;
    y: number;
    w: number;
    h: number;
    delta: number;
    totalDelta: number;
    goingUp: boolean;
  }) => void;
};

let panEventsAreSet = false;
let panEvents: {
  node: HTMLDivElement;
  events: PanListeners;
  handlers: {
    _onPress: (ev: React.PointerEvent<HTMLDivElement>) => void;
    _onRelease: (ev: React.PointerEvent<HTMLDivElement>) => void;
    onMove: (ev: React.PointerEvent<HTMLDivElement>) => void;
  };
}[] = [];
let _pointerdown: PanEvent | null = null;
let _panning: PanEvent | null = null;
let lastMove: React.PointerEvent<HTMLDivElement> | undefined;
let currEv: (typeof panEvents)[number] | undefined;
let lastRelease:
  | {
      duration: number;
      ended: number;
    }
  | undefined;
let lastPress:
  | {
      ev: React.PointerEvent<HTMLDivElement>;
      started: number;
      onSinglePinch?: boolean;
    }
  | undefined;
export function setPan(node: HTMLDivElement, evs: PanListeners) {
  // const {
  //   onPanStart, onPan, onPanEnd,
  //   threshold = 15,
  //   doubleTapThreshold = 100,
  //   tapThreshold = 30,
  //   onPress, onRelease, onDoubleTap,
  //   onPinch, onSinglePinch
  // } = evs;

  // let pressEvents: Record<string, PointerEvent> = {};
  // let moveEvents: Record<string, PointerEvent> = {};

  const _onPress = (ev: React.PointerEvent<HTMLDivElement>) => {
      currEv = panEvents.find((p) => p.node.contains(ev.target as any));
      if (!currEv) return;

      lastPress = {
        ev,
        started: Date.now(),
      };

      /** Ignore right clicks */
      if (ev.button && ev.pointerType !== "touch") return;

      currEv.events.onPress?.(ev, currEv.node);

      ev.preventDefault();
      ev.stopPropagation();
      const rect = node.getBoundingClientRect();
      const { clientX: x, clientY: y } = ev;
      const [xStart, yStart] = [x, y];
      const [xOffset, yOffset] = [rect.x, rect.y];
      const xNode = x - xOffset; //x position within the element.
      const yNode = y - yOffset; //y position within the element.
      const xNodeStart = x - rect.left;
      const yNodeStart = y - rect.top;
      const [xDiff, yDiff] = [0, 0];
      const [xTravel, yTravel] = [0, 0];

      _pointerdown = {
        node,
        x,
        y,
        xStart,
        yStart,
        xNode,
        yNode,
        xNodeStart,
        yNodeStart,
        xDiff,
        yDiff,
        xOffset,
        yOffset,
        xTravel,
        yTravel,
        triggered: false,
      };
    },
    _onRelease = (ev: React.PointerEvent<HTMLDivElement>) => {
      if (!currEv) return;

      const { onSinglePinch, onDoubleTap, onRelease, onPanEnd } = currEv.events;
      if (onSinglePinch || onDoubleTap) {
        if (
          onDoubleTap &&
          lastRelease &&
          lastRelease.duration < 200 &&
          Date.now() - lastRelease.ended < 400
        ) {
          const r = node.getBoundingClientRect();

          onDoubleTap(
            {
              x: ev.clientX - r.x,
              y: ev.clientY - r.y,
            },
            ev,
            currEv.node,
          );
          lastRelease = undefined;
        } else {
          lastRelease = {
            duration: Date.now() - (lastPress?.started ?? 0),
            ended: Date.now(),
          };
        }
      }

      onRelease?.(ev, currEv.node);

      if (_pointerdown && _pointerdown.triggered && _panning) {
        ev.preventDefault();
        onPanEnd?.({ ..._panning }, ev);
        currEv = undefined;
        lastMove = undefined;
      }
      _pointerdown = null;
    },
    onMove = (ev: React.PointerEvent<HTMLDivElement>) => {
      if (!currEv || !lastPress) return;

      /** onSinglePinch */
      const {
        onSinglePinch,
        onPinch,
        onPanStart,
        onPan,
        threshold = 15,
      } = currEv.events;
      if (
        onSinglePinch &&
        lastMove &&
        lastRelease &&
        _pointerdown &&
        (lastPress.onSinglePinch ||
          (lastRelease.duration < 200 && Date.now() - lastRelease.ended < 400))
      ) {
        lastPress.onSinglePinch = true;

        ev.preventDefault();
        ev.stopPropagation();
        const r = node.getBoundingClientRect();
        const dist = Math.hypot(
          ev.clientX - lastMove.clientX,
          ev.clientY - lastMove.clientY,
        );

        onSinglePinch({
          x: lastPress.ev.clientX - r.x,
          y: lastPress.ev.clientY - r.y,
          w: r.width,
          h: r.height,
          totalDelta: Math.hypot(
            ev.clientX - lastPress.ev.clientX,
            ev.clientY - lastPress.ev.clientY,
          ),
          delta: (ev.clientY < lastMove.clientY ? 1 : -1) * dist,
          goingUp: ev.clientY < lastMove.clientY,
        });
        vibrateFeedback(15);

        /** Pinch zoom */
        // } else if("touches" in ev && ev.touches.length >= 2){
        //   ev.preventDefault();
        //   ev.stopPropagation();
        //   if(onPinch){
        // let [ev1, ev2] = Object.values(moveEvents).sort((a, b) => a.clientX - b.clientX);
        // const r = node.getBoundingClientRect();
        // const o = {
        //   x1: ev1.clientX - r.x,
        //   y1: ev1.clientY - r.y,
        //   x2: ev2.clientX - r.x,
        //   y2: ev2.clientY - r.y,
        // };
        // moveEvents[ev.pointerId] = ev;
        // [ev1, ev2] = Object.values(moveEvents).sort((a, b) => a.clientX - b.clientX);
        // const n = {
        //   x1: ev1.clientX - r.x,
        //   y1: ev1.clientY - r.y,
        //   x2: ev2.clientX - r.x,
        //   y2: ev2.clientY - r.y,
        // };
        // onPinch({
        //   ...n,
        //   deltaX: n.x1 - n.x2,
        //   deltaY: n.y1 - n.y2,
        // })
        // }

        /** Pan */
      } else if (_pointerdown) {
        ev.preventDefault();
        ev.stopPropagation();
        const {
          xOffset,
          yOffset,
          xStart,
          yStart,
          xDiff,
          yDiff,
          xTravel,
          yTravel,
        } = _pointerdown;
        const { clientX: x, clientY: y } = ev;
        _panning = {
          ..._pointerdown,
          x,
          y,
          xNode: x - xOffset,
          yNode: y - yOffset,
          xDiff: x - xStart,
          yDiff: y - yStart,
        };
        _panning.xTravel = xTravel + Math.abs(_panning.xDiff);
        _panning.yTravel = yTravel + Math.abs(_panning.yDiff);

        if (
          !_pointerdown.triggered &&
          (_panning.xTravel >= threshold || _panning.yTravel > threshold)
        ) {
          _pointerdown.triggered = true;
          clearTextSelection();
          onPanStart?.({ ..._panning }, ev);
        } else if (_pointerdown.triggered) {
          clearTextSelection();
          onPan({ ..._panning }, ev);
        }
      }

      lastMove = ev;
    };

  /* Required for pointerup to fire */
  node.style.touchAction = "none";

  if (!panEventsAreSet) {
    panEventsAreSet = true;

    window.document.body.style.touchAction = "none";

    /* Prevent chrome back/forward nav */
    (window.document.documentElement.style as any).overscrollBehavior = "none";

    // addEvent(window.document.body, "pointerdown", _onPress);
    addEvent(window.document.body, "pointerup", _onRelease);
    // addEvent(window.document.body, "pointerleave", _onRelease);
    addEvent(window.document.body, "pointermove", onMove);
  }

  const ev = addEvent(node, "pointerdown", _onPress);
  panEvents.push({
    node,
    events: evs,
    handlers: { _onPress, _onRelease, onMove },
  });

  return function () {
    ev();
    panEvents = panEvents.filter(
      (pev) => pev.events.onPan !== evs.onPan && pev.node !== node,
    );
  };
}

export function addEvent(node: HTMLElement, type, func) {
  const wrappedEvent = function (ev) {
    if (!node.isConnected) {
      node.removeEventListener(type, wrappedEvent);
    } else {
      func(ev);
    }
  };
  node.removeEventListener(type, wrappedEvent);
  node.addEventListener(type, wrappedEvent, { passive: false });
  return function () {
    node.removeEventListener(type, wrappedEvent);
  };
}

export const clearTextSelection = () => {
  window.getSelection()?.empty();
};
