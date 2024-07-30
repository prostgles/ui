
import { type Command, getCommandElemSelector } from "../Testing"
import { tout } from "../pages/ElectronSetup";

let pointer: HTMLDivElement | null = null;

export const movePointer = async (x: number, y: number) => {
  if(pointer){
    pointer.style.display = "block";
    pointer.style.transition = ".5s ease";
    pointer.style.left = x + "px";
    pointer.style.top = y + "px";
    await tout(500);
  }
}
type GetElemOpts = {
  noSpaceBetweenSelectors?: boolean;
  nth?: number;
}
export const getElement = <T extends Element>(testId: Command | "", endSelector = "", { noSpaceBetweenSelectors, nth = -1 }: GetElemOpts = {}) => {
  const testIdSelector = testId? getCommandElemSelector(testId) : "";
  const allMatchingElements = Array.from(document.querySelectorAll<T>(`${testIdSelector}${noSpaceBetweenSelectors? "" : " "}${endSelector}`));
  /** Only the last matching element is clicked to ensure only the top ClickCatchOverlay is clicked to maintain correct context */
  return allMatchingElements.at(nth);
}
const hoverTriggerClasses = [
  "show-on-hover",
  "show-on-parent-hover", 
  "show-on-trigger-hover",
];
type ClickOpts = GetElemOpts & {
  timeout?: number;
}

export const waitForElement = async <T extends Element>(testId: Command | "", endSelector = "", { timeout = 10e5, ...otherOpts }: ClickOpts = { }) => {
  await tout(100);
  let elem = getElement<T>(testId, endSelector, otherOpts);
  if(!elem && timeout) {
    let timeoutLeft = timeout;
    while(!elem && timeoutLeft > 0){
      await tout(100);
      elem = getElement<T>(testId, endSelector, otherOpts);
      timeoutLeft -= 100;
    }
  }
  if(!elem){
    throw `Could not find ${[testId, endSelector].filter(Boolean).join(" ")} element to click`;
  }
  return elem
}

export const click = async (testId: Command | "", endSelector = "", opts: ClickOpts = {}) => {
  // window.document.body.classList.toggle("is_demo_mode", true);
  const elem = await waitForElement<HTMLButtonElement>(testId, endSelector, opts);
  const hideClassNode = elem.closest(hoverTriggerClasses.map(v => `.${v}`).join(", "))?.parentElement;
  hideClassNode?.classList.toggle("is_demo_mode", true);
  const bbox = elem.getBoundingClientRect();
  
  if((elem as any).scrollIntoViewIfNeeded){
    (elem as any).scrollIntoViewIfNeeded({ behavior: "smooth" });
    await tout(200);
  }
  await movePointer(
    (bbox.left + Math.min(60, bbox.width/2)),
    (bbox.top + bbox.height/2)
  )
  elem.click();
  // hideClassNode?.classList.toggle("is_demo_mode", false);
}

export const type = async (value: string, testId: Command, endSelector = "") => {
  const input = getElement<HTMLInputElement>(testId, endSelector);
  if(!input) return;
  input.focus();
  input.value = "";
  input.focus();
  const chars = value.split("");
  for (const char of chars) {
    input.value += char;
    await tout(100);
  }
  await tout(200); 
  input.value = value;
  //@ts-ignore
  input.forceDemoValue?.(value); 
  await tout(500); 
}

export const setPointer = (p: HTMLDivElement | null) => {
  pointer = p;
}