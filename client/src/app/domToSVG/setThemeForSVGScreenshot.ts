import { localSettings } from "../../dashboard/localSettings";
import { tout } from "../../utils/utils";

export const setThemeForSVGScreenshot = async (theme: undefined | "dark") => {
  const resetUICallbacks: (() => void)[] = [];

  /** Ensure that any sql suggestion popups are opened back */
  const sqlEditor = document.querySelector<HTMLDivElement>(`div.ProstglesSQL`);
  if (sqlEditor?.sqlRef?.editor) {
    const suggestionsAreShown = //@ts-ignore
      sqlEditor.sqlRef.editor._contextKeyService?.getContextKeyValue(
        "suggestWidgetVisible",
      );
    const position = sqlEditor.sqlRef.editor.getPosition();
    if (suggestionsAreShown && position) {
      resetUICallbacks.push(async () => {
        await tout(500);
        const editor =
          document.querySelector<HTMLDivElement>(`div.ProstglesSQL`);
        editor?.sqlRef?.editor.setPosition(position);
        await tout(100);
        editor?.sqlRef?.editor.trigger(
          "demo",
          "editor.action.triggerSuggest",
          {},
        );
      });
    }
  }

  /** Re-open any closed popup menus */
  const openPopupSelectors = Array.from(
    document.querySelectorAll<HTMLDivElement>(
      `div.PopupMenu_triggerWrapper.is-open, .select-button.is-open`,
    ),
  ).map((el) => getUniqueSelector(el));
  openPopupSelectors.forEach((selector) => {
    resetUICallbacks.push(async () => {
      await tout(500);
      const triggerBtn = document.querySelector<HTMLDivElement>(selector);
      if (triggerBtn && !triggerBtn.classList.contains("is-open")) {
        triggerBtn.click();
      }
    });
  });

  localSettings.get().$set({ themeOverride: theme });
  await tout(500);
  for (const cb of resetUICallbacks) {
    await cb();
  }
  await tout(500);
};
// function getUniqueSelector(element: HTMLElement) {
//   // If element has an ID, use it
//   if (element.id) {
//     return `#${element.id}`;
//   }

//   // Build path from element to root
//   const path: string[] = [];
//   let current: HTMLElement | null = element;

//   while (current && current !== document.body) {
//     let selector = current.tagName.toLowerCase();

//     // Add class if available
//     if (current.className && typeof current.className === "string") {
//       const classes = current.className.trim().split(/\s+/).join(".");
//       if (classes) {
//         selector += `.${classes}`;
//       }
//     }

//     // Add nth-child if needed to make it unique
//     const parent: HTMLElement | null = current.parentElement;
//     if (parent) {
//       const siblings = Array.from(parent.children);
//       const sameTagSiblings = siblings.filter(
//         (s) => s.tagName === current?.tagName,
//       );

//       if (sameTagSiblings.length > 1) {
//         const index = siblings.indexOf(current) + 1;
//         selector += `:nth-child(${index})`;
//       }
//     }

//     path.unshift(selector);
//     current = parent;
//   }

//   return path.join(" > ");
// }
function getUniqueSelector(element: HTMLElement): string {
  // If element has an ID, use it
  if (element.id) {
    return `#${element.id}`;
  }

  // Build path from element to root
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.documentElement) {
    const parent = current.parentElement;

    if (!parent) break;

    // Get index among all siblings
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(current) + 1;

    // Build selector: tagname:nth-child(index)
    const selector = `${current.tagName.toLowerCase()}:nth-child(${index})`;
    path.unshift(selector);

    current = parent;
  }

  return path.join(" > ");
}
