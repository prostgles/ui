import { tout } from "src/utils/utils";
import {
  click,
  movePointer,
  openConnection,
  waitForElement,
} from "../demoUtils";

export const AIAssistantDemo = async () => {
  await click("dashboard.goToConnections");
  await openConnection("food_delivery");
  await click("AskLLM");

  await click("LLMChatOptions.Model");
  const modelSearch = await waitForElement<HTMLTextAreaElement>(
    "SearchList",
    "input",
    { nth: -1 },
  );
  await naturalType("prost", modelSearch);
  pressEnter(modelSearch);

  const el = await waitForElement<HTMLTextAreaElement>(
    "AskLLM.popup",
    "textarea",
  );
  const elRect = el.getBoundingClientRect();
  await tout(500);
  await movePointer(elRect.left + elRect.width, elRect.top + 10);
  await tout(500);
  await naturalType("which tables should I vacuum and reindex?", el);
  pressEnter(el);
  await tout(1000);
};

const naturalType = async (text: string, el: HTMLTextAreaElement) => {
  for (const char of text.split("")) {
    el.value += char;
    el.dispatchEvent(new Event("input", { bubbles: true }));

    // Variable delays to simulate human typing
    let delay = 40 + Math.random() * 40;

    // Longer pauses after punctuation and spaces
    if (char === " ") delay += 50 + Math.random() * 100;
    if (char === "." || char === "," || char === "!")
      delay += 100 + Math.random() * 200;

    // Slightly longer for uppercase letters (shift key)
    if (char >= "A" && char <= "Z") delay += 20;

    await tout(delay);
  }
};

const pressEnter = (el: HTMLTextAreaElement) => {
  el.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
  );
};
