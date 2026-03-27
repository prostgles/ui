import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { FlexRow } from "./Flex";
import Btn from "./Btn";
import { mdiArrowDown, mdiArrowUp, mdiClose } from "@mdi/js";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import Popup from "./Popup/Popup";

declare class Highlight {
  constructor(...ranges: Range[]);
}

declare namespace CSS {
  const highlights: Map<string, Highlight> & {
    set(name: string, highlight: Highlight): void;
    delete(name: string): void;
    clear(): void;
  };
}

const HIGHLIGHT_NAME = "esb-match";
const HIGHLIGHT_ACTIVE_NAME = "esb-active";
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT"]);

const buildRanges = (
  root: HTMLElement,
  query: string,
  skipRoot: HTMLElement | null,
): Range[] => {
  const results: Range[] = [];
  const lower = query.toLowerCase();

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let el = node.parentElement;
      while (el && el !== root) {
        if (el === skipRoot) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
        el = el.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? "";
    const lText = text.toLowerCase();
    let idx = 0;
    while ((idx = lText.indexOf(lower, idx)) !== -1) {
      const range = new Range();
      range.setStart(node, idx);
      range.setEnd(node, idx + query.length);
      results.push(range);
      idx += query.length;
    }
  }

  return results;
};

const supportsHighlightAPI = (): boolean =>
  typeof CSS !== "undefined" && "highlights" in CSS;

const clearHighlights = (): void => {
  if (!supportsHighlightAPI()) return;
  CSS.highlights.delete(HIGHLIGHT_NAME);
  CSS.highlights.delete(HIGHLIGHT_ACTIVE_NAME);
};

const applyHighlights = (ranges: Range[], activeIndex: number): void => {
  if (!supportsHighlightAPI() || ranges.length === 0) return;
  CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
  const active = ranges[activeIndex];
  if (active) {
    CSS.highlights.set(HIGHLIGHT_ACTIVE_NAME, new Highlight(active));
  }
};

const scrollRangeIntoView = (range: Range): void => {
  const el = range.startContainer.parentElement;
  el?.scrollIntoView({
    block: "center",
    inline: "nearest",
    behavior: "smooth",
  });
};

export const ElectronSearchBar = (): JSX.Element | null => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rangesRef = useRef<Range[]>([]);

  // Rebuild ranges when query changes
  useEffect(() => {
    clearHighlights();
    rangesRef.current = [];

    if (!open || query.length < 1) {
      setMatchCount(0);
      setActiveIndex(0);
      return;
    }

    const topMostPopup = Array.from(
      document.querySelectorAll<HTMLElement>(
        `[role="dialog"]:not([data-command=${"ElectronSearchBar"}])`,
      ),
    ).at(-1);
    const ranges = buildRanges(
      topMostPopup || document.body,
      query,
      containerRef.current,
    );
    rangesRef.current = ranges;
    const count = ranges.length;
    setMatchCount(count);
    const next = count > 0 ? 0 : -1;
    setActiveIndex(next);
    applyHighlights(ranges, next);
    if (ranges[next]) scrollRangeIntoView(ranges[next]);
  }, [query, open]);

  // Update active highlight without re-scanning
  useEffect(() => {
    if (rangesRef.current.length === 0) return;
    applyHighlights(rangesRef.current, activeIndex);
    const active = rangesRef.current[activeIndex];
    if (active) scrollRangeIntoView(active);
  }, [activeIndex]);

  const openBar = useCallback(() => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    clearHighlights();
    rangesRef.current = [];
    setMatchCount(0);
    setActiveIndex(0);
  }, []);

  const navigate = useCallback(
    (direction: 1 | -1) => {
      if (matchCount === 0) return;
      console.log(rangesRef.current);
      setActiveIndex((prev) => (prev + direction + matchCount) % matchCount);
    },
    [matchCount],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        navigate(e.shiftKey ? -1 : 1);
      }
    },
    [navigate],
  );

  const { isElectron } = usePrglCore();
  useEffect(() => {
    if (!isElectron) return;

    const handler = (e: globalThis.KeyboardEvent): void => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        open ? inputRef.current?.select() : openBar();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close, isElectron, open, openBar]);

  useEffect(() => () => clearHighlights(), []);

  if (!isElectron || !open) return null;

  const hasQuery = query.length > 0;
  const noResults = hasQuery && matchCount === 0;
  const displayIndex = matchCount > 0 ? activeIndex + 1 : 0;

  return (
    <Popup
      data-command="ElectronSearchBar"
      positioning="as-is"
      contentClassName="bg-transparent"
      rootStyle={{
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 2147483647,
        alignItems: "center",
        minWidth: "300px",
      }}
    >
      <FlexRow
        ref={containerRef}
        role="search"
        aria-label="Find in page"
        className="ElectronSearchBar shadow bg-color-0 p-1 rounded gap-p25"
      >
        <input
          ref={inputRef}
          type="text"
          aria-label="Search text"
          className="font-18"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Find…"
          spellCheck={false}
          style={{
            flex: 1,
            borderRadius: "4px",
            border: "unset",
            outline: "none",
            padding: "4px 8px",
          }}
        />

        <span
          aria-live="polite"
          aria-atomic="true"
          className="text-1p5"
          style={{
            minWidth: "56px",
            textAlign: "center",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          {!hasQuery || noResults ? "" : `${displayIndex} / ${matchCount}`}
        </span>

        <Btn
          onClick={() => navigate(-1)}
          disabledInfo={matchCount === 0 ? "No matches" : undefined}
          aria-label="Previous match (Shift+Enter)"
          style={navBtn(matchCount === 0)}
          iconPath={mdiArrowUp}
          size="small"
        />

        <Btn
          onClick={() => navigate(1)}
          disabledInfo={matchCount === 0 ? "No matches" : undefined}
          aria-label="Next match (Enter)"
          style={navBtn(matchCount === 0)}
          iconPath={mdiArrowDown}
          size="small"
        />

        <Btn
          onClick={close}
          aria-label="Close search (Escape)"
          style={{
            ...navBtn(false),
            marginLeft: "2px",
            color: "var(--text-1)",
          }}
          iconPath={mdiClose}
          size="small"
        />
        <style>{highlighstyle}</style>
      </FlexRow>
    </Popup>
  );
};

const highlighstyle = `
  ::highlight(${HIGHLIGHT_NAME}) {
    background-color: rgba(245, 166, 35, 0.55);
    color: inherit;
  }
  ::highlight(${HIGHLIGHT_ACTIVE_NAME}) {
    background-color: rgba(255, 107, 0, 0.85);
    color: #fff;
  }
`;

const navBtn = (disabled: boolean): React.CSSProperties => ({
  background: "none",
  border: "1px solid transparent",
  borderRadius: "4px",
  color: disabled ? "var(--text-0)" : "var(--text-1)",
  cursor: disabled ? "default" : "pointer",
  fontSize: "11px",
  padding: "3px 7px",
  lineHeight: 1,
  transition: "color 0.1s",
  userSelect: "none",
});
