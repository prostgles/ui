import { isElementNode, isElementVisible } from "./utils/isElementVisible";

export const recordDomChanges = (targetNode: HTMLElement) => {
  const config = {
    attributes: true,
    childList: true,
    subtree: true,
    attributeOldValue: true,
  };

  const observer = new MutationObserver((mutationList, observer) => {
    for (const mutation of mutationList) {
      const { target, oldValue } = mutation;
      if (!isElementNode(target) || !isElementVisible(target).isVisible)
        continue;
      if (mutation.type === "childList") {
        console.log(
          "A child node has been added or removed.",
          mutation.addedNodes,
          mutation.removedNodes,
        );
        changes.push({
          type: "childList",
          target: target as HTMLElement,
          addedNodes: mutation.addedNodes,
          removedNodes: mutation.removedNodes,
          timestamp: Date.now(),
        });
      } else if (
        mutation.type === "attributes" &&
        mutation.attributeName === "style"
      ) {
        const currentStyle = target.getAttribute("style");
        const styleDiff = getStyleDiff(oldValue, currentStyle, target);
        changes.push({
          type: "style",
          target: target as HTMLElement,
          oldValue,
          currentStyle,
          changes: styleDiff,
          timestamp: Date.now(),
        });
      }
    }
  });

  observer.observe(targetNode, config);
};

setInterval(() => {
  if (changes.length > 0) {
    console.log("DOM changes detected:", changes);
  }
}, 3000);

type DOMChange =
  | {
      type: "childList";
      target: HTMLElement;
      addedNodes: NodeList;
      removedNodes: NodeList;
      timestamp: number;
    }
  | {
      type: "style";
      target: HTMLElement;
      oldValue: string | null;
      currentStyle: string | null;
      changes: Record<string, any>;
      timestamp: number;
    };
const changes: DOMChange[] = [];

const getStyleDiff = (
  oldStyle: string | null,
  currentStyle: string | null,
  target: HTMLElement,
) => {
  const oldStyleObj = parseStyle(oldStyle);
  const currentStyleObj = parseStyle(currentStyle);

  // Determine added/changed properties
  const added: Record<string, string> = {};
  const changed: Record<string, { old: string; new: string }> = {};
  const removed: Record<string, string> = {};

  // Find added or changed properties
  Object.entries(currentStyleObj).forEach(([prop, value]) => {
    if (!(prop in oldStyleObj)) {
      added[prop] = value;
    } else if (oldStyleObj[prop] !== value) {
      changed[prop] = { old: oldStyleObj[prop]!, new: value };
    }
  });

  // Find removed properties
  Object.entries(oldStyleObj).forEach(([prop, value]) => {
    if (!(prop in currentStyleObj)) {
      removed[prop] = value;
    }
  });

  console.log(`Style attribute was modified on`, target);

  if (Object.keys(added).length > 0) {
    console.log("Added styles:", added);
  }

  if (Object.keys(changed).length > 0) {
    console.log("Changed styles:", changed);
  }

  if (Object.keys(removed).length > 0) {
    console.log("Removed styles:", removed);
  }
  return { added, changed, removed };
};

// Parse the styles into key-value objects for easier comparison
const parseStyle = (styleString: string | null): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!styleString) return result;

  // Split the style string and extract property-value pairs
  styleString.split(";").forEach((pair) => {
    const trimmed = pair.trim();
    if (!trimmed) return;

    const [property, value] = trimmed.split(":").map((s) => s.trim());
    if (property && value) {
      result[property] = value;
    }
  });

  return result;
};
