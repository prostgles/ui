import { type Command, getCommandElemSelector } from "../Testing";
import { tout } from "../pages/ElectronSetup";

let pointer: HTMLDivElement | null = null;

export const movePointer = async (x: number, y: number) => {
  if (pointer) {
    pointer.style.display = "block";
    pointer.style.transition = ".5s ease";
    pointer.style.left = x + "px";
    pointer.style.top = y + "px";
    await tout(500);
  }
};
type GetElemOpts = {
  noSpaceBetweenSelectors?: boolean;
  /**
   * Zero based index of the element to click
   */
  nth?: number;
};
export const getElement = <T extends Element>(
  testId: Command | "",
  endSelector = "",
  { noSpaceBetweenSelectors, nth = -1 }: GetElemOpts = {},
) => {
  const testIdSelector = testId ? getCommandElemSelector(testId) : "";
  const allMatchingElements = Array.from(
    document.querySelectorAll<T>(
      `${testIdSelector}${noSpaceBetweenSelectors ? "" : " "}${endSelector}`,
    ),
  );
  /** Only the last matching element is clicked to ensure only the top ClickCatchOverlay is clicked to maintain correct context */
  return allMatchingElements.at(nth);
};
type ClickOpts = GetElemOpts & {
  timeout?: number;
  noTimeToWait?: boolean;
};

export const waitForElement = async <T extends Element>(
  testId: Command | "",
  endSelector = "",
  { noTimeToWait, timeout = 15e3, ...otherOpts }: ClickOpts = {},
) => {
  !noTimeToWait && (await tout(100));
  let elem = getElement<T>(testId, endSelector, otherOpts);
  if (!elem && timeout) {
    const waitTime = noTimeToWait ? 20 : 100;
    let timeoutLeft = timeout;
    while (!elem && timeoutLeft > 0) {
      await tout(waitTime);
      elem = getElement<T>(testId, endSelector, otherOpts);
      timeoutLeft -= waitTime;
    }
  }
  if (!elem) {
    throw `Could not find ${[testId, endSelector].filter(Boolean).join(" ")} element to click`;
  }
  return elem;
};

export const goToElem = async <ElemType = HTMLElement>(
  testId: Command | "",
  endSelector = "",
  opts: ClickOpts = {},
): Promise<ElemType> => {
  const elem = await waitForElement<HTMLButtonElement>(
    testId,
    endSelector,
    opts,
  );
  const bbox = elem.getBoundingClientRect();
  if ((elem as any).scrollIntoViewIfNeeded) {
    (elem as any).scrollIntoViewIfNeeded({ behavior: "smooth" });
    !opts.noTimeToWait && (await tout(200));
  }
  await movePointer(
    bbox.left + Math.min(60, bbox.width / 2),
    bbox.top + bbox.height / 2,
  );
  if (!elem.isConnected) {
    return goToElem(testId, endSelector, opts);
  }
  return elem as any;
};
export const click = async (
  testId: Command | "",
  endSelector = "",
  opts: ClickOpts = {},
): Promise<void> => {
  const elem = await goToElem(testId, endSelector, opts);
  /** In some cases react has since replaced the node content */
  const latestElem = getElement<HTMLButtonElement>(testId, endSelector, opts);
  (latestElem ?? elem).click();
};

export const type = async (
  value: string,
  testId: Command | "",
  endSelector = "",
) => {
  const input = await goToElem<HTMLInputElement>(testId, endSelector);
  input.focus();
  // input.value = "";
  // input.focus();
  // const chars = value.split("");
  // for (const char of chars) {
  //   input.value += char;
  //   await tout(100);
  // }
  // await tout(200);
  // input.value = value;
  //@ts-ignore
  await input.forceDemoValue?.(value);
  await tout(500);
};

let lastHovered:
  | {
      elem: Element;
      hoverElem: Element | null;
    }
  | undefined;
let hoverCheckInterval: NodeJS.Timeout;
export const setPointer = (p: HTMLDivElement | null) => {
  pointer = p;

  if (!p) return;
  p.ontransitionstart = () => {
    hoverCheckInterval = setInterval(() => {
      const bbox = p.getBoundingClientRect();
      const hovered = document.elementFromPoint(
        bbox.left + bbox.width / 2,
        bbox.top + bbox.height / 2,
      );
      if (hovered !== lastHovered?.elem) {
        lastHovered?.hoverElem?.classList.toggle("hover", false);
        if (!hovered) {
          lastHovered = undefined;
          return;
        }
        const hoverElem = getClosestHovereableElem(hovered);
        lastHovered = { elem: hovered, hoverElem };
        hoverElem?.classList.toggle("hover", true);
      }
    }, 100);
  };
  p.ontransitionend = (e) => {
    clearInterval(hoverCheckInterval);
  };
};

const hoverTriggerClasses = [
  "show-on-hover",
  "show-on-row-hover",
  "show-on-parent-hover",
  "show-on-trigger-hover",
  "list-comp li",
];
const getClosestHovereableElem = (elem: Element) => {
  return elem.closest(hoverTriggerClasses.map((v) => `.${v}`).join(", "));
};
