
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
export const getElement = <T extends Element>(testId: Command | "", endSelector = "") => {
  const testIdSelector = testId? getCommandElemSelector(testId) : "";
  const allMatchingElements = Array.from(document.querySelectorAll<T>(`${testIdSelector} ${endSelector}`));
  /** Only the last matching element is clicked to ensure only the top ClickCatchOverlay is clicked to maintain correct context */
  return allMatchingElements.at(-1);
}
const hoverTriggerClasses = [
  "show-on-hover",
  "show-on-parent-hover", 
  "show-on-trigger-hover",
];
type ClickOpts = {
  timeout?: number;
}
export const click = async (testId: Command | "", endSelector = "", { timeout = 10e5 }: ClickOpts = {}) => {
  // window.document.body.classList.toggle("is_demo_mode", true);
  await tout(100);
  let elem = getElement<HTMLButtonElement>(testId, endSelector);
  if(!elem) {
    if(timeout){
      let timeoutLeft = timeout;
      while(!elem && timeoutLeft > 0){
        await tout(100);
        elem = getElement<HTMLButtonElement>(testId, endSelector);
        timeoutLeft -= 100;
      }
    }
  }
  if(!elem){
    throw `Could not find ${[testId, endSelector].filter(Boolean).join(" ")} element to click`;
  }
  const hideClassNode = elem.closest(hoverTriggerClasses.map(v => `.${v}`).join(", "))?.parentElement;
  hideClassNode?.classList.toggle("is_demo_mode", true);
  const bbox = elem.getBoundingClientRect();
  
  if((elem as any).scrollIntoViewIfNeeded){
    (elem as any).scrollIntoViewIfNeeded({ behavior: "smooth" });
    await tout(200);
  }
  await movePointer(
    (bbox.left + Math.min(150, bbox.width/2)),
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