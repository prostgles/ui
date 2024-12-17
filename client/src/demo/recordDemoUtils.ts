const clickedPaths: { selector: string; timestamp: number }[] = [];
export const startRecordingDemo = () => {
  window.addEventListener("pointerdown", (e) => {
    const path = getClickPath(e.target);
    const selector = getClickSelector(path);
    const firstPath = clickedPaths[0];
    clickedPaths.push({
      selector,
      timestamp: Date.now() - (!firstPath ? 0 : firstPath.timestamp),
    });
    // console.log(clickedPaths.at(-1));
  });
};

type ClickedNode = {
  type: string;
  node: Element;
  value?: string;
};

const getClickSelector = (path: ClickedNode[]) => {
  return path
    .slice(0)
    .reverse()
    .map((n) =>
      n.value ? `[data-${n.type}=${JSON.stringify(n.value)}]` : n.type,
    )
    .join(" ");
};

const getClickPath = (el: HTMLElement | Element | EventTarget | null) => {
  if (!el || !(el instanceof Element)) {
    return [];
  }

  /** Used to ignore paths/svgs inside buttons */
  const closestButton = el.closest("button");
  const closestAnchor = el.closest("a");
  const closestListItem = el.closest("li");
  const currAction = getClosestActionElement(
    closestButton ?? closestAnchor ?? closestListItem ?? el,
    true,
  );
  const path: ClickedNode[] = [
    currAction ?? {
      type: el.nodeName,
      node: el,
    },
  ];
  let currElem = getClosestActionElement(undefined);
  do {
    currElem = getClosestActionElement(path.at(-1)?.node);
    if (currElem) path.push(currElem);
  } while (currElem);
  return path;
};

const getClosestActionElement = (
  eventTarget: HTMLElement | Element | EventTarget | undefined,
  onlySelf = false,
): ClickedNode | undefined => {
  if (!(eventTarget instanceof Element)) {
    return undefined;
  }
  const el = onlySelf ? eventTarget : eventTarget.parentElement;
  if (!el || !("closest" in el)) {
    return undefined;
  }

  const DATA_TEST_SELECTORS = ["key", "command", "table-name"];
  let actionNode: ClickedNode | undefined;
  DATA_TEST_SELECTORS.find((selector) => {
    const attributeName = `data-${selector}`;
    const closest = el.closest(`[${attributeName}]`);
    if (closest && (!onlySelf || closest === el)) {
      actionNode ??= {
        type: selector,
        node: closest,
        value: (closest as HTMLElement).getAttribute(attributeName) ?? "",
      };
      return actionNode;
    }
    return undefined;
  });

  return actionNode;
};
