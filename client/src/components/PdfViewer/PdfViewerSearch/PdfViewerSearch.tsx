import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { Input } from "@components/Input";
import { mdiChevronLeft, mdiChevronRight, mdiMagnify } from "@mdi/js";
import type * as pdfjsLib from "pdfjs-dist";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedCallback } from "src/hooks/useDebouncedCallback";
import type { RenderedPdfPage } from "../usePdfContinuousScroll";
import { getPdfSearchRanges } from "./getPdfSearchRanges";

import "./PdfViewerSearch.css";

type SearchMatch = {
  page: number;
};

export type PdfViewerSearchProps = {
  pdfDocument: pdfjsLib.PDFDocumentProxy | null;
  renderedPages: RenderedPdfPage[];
  currentPage: number;
  onPageChange: (page: number) => void;
};

const normalizeText = (text: string) =>
  text.replace(/\s+/g, " ").trim().toLocaleLowerCase();
const getMatchCount = (text: string, query: string) => {
  let count = 0;
  let offset = 0;

  while (offset < text.length) {
    const matchIndex = text.indexOf(query, offset);
    if (matchIndex === -1) {
      break;
    }

    count += 1;
    offset = matchIndex + query.length;
  }

  return count;
};

export const PdfViewerSearch = ({
  pdfDocument,
  renderedPages,
  currentPage,
  onPageChange,
}: PdfViewerSearchProps) => {
  const [query, setQuery] = useState("");
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const scrollToMatchRef = useRef<number>();
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  const [normalizedQuery, setNormalizedQuery] = useState("");
  const updateSearchQuery = useDebouncedCallback(
    (value: string) => setNormalizedQuery(normalizeText(value)),
    [],
  );
  const changeQuery = (value: string) => {
    setQuery(value);
    updateSearchQuery(value);
    if (!value) setNormalizedQuery("");
  };

  /** Intercept ctrl+f */
  const inputRef = useRef<HTMLInputElement>(null);

  /** Intercept ctrl+f */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        const input = inputRef.current;
        if (!input) return;

        const bounds = input.getBoundingClientRect();
        const topElement = document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        );
        if (!topElement || !input.contains(topElement)) return;

        event.preventDefault();
        input.focus();
        input.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let disposed = false;

    setPageTexts([]);
    setActiveMatchIndex(0);

    if (!pdfDocument) {
      return;
    }

    void Promise.all(
      Array.from({ length: pdfDocument.numPages }, async (_, index) => {
        const page = await pdfDocument.getPage(index + 1);
        const textContent = await page.getTextContent();

        return normalizeText(
          textContent.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" "),
        );
      }),
    ).then((texts) => {
      if (!disposed) {
        setPageTexts(texts);
      }
    });

    return () => {
      disposed = true;
    };
  }, [pdfDocument]);

  const matches = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return pageTexts.flatMap((text, pageIndex) =>
      Array.from(
        { length: getMatchCount(text, normalizedQuery) },
        (): SearchMatch => ({ page: pageIndex + 1 }),
      ),
    );
  }, [normalizedQuery, pageTexts]);

  useEffect(() => {
    const firstMatchIndex = Math.max(
      0,
      matches.findIndex(({ page }) => page === currentPageRef.current),
    );
    const firstMatch = matches[firstMatchIndex];
    setActiveMatchIndex(firstMatchIndex);
    scrollToMatchRef.current = firstMatchIndex;

    if (firstMatch) {
      onPageChange(firstMatch.page);
    }
  }, [matches, onPageChange]);

  useEffect(() => {
    const highlights = (CSS as any).highlights as
      Map<string, unknown> | undefined;
    const HighlightConstructor = (window as any).Highlight;

    if (!normalizedQuery || !highlights || !HighlightConstructor) {
      return;
    }

    const pageRanges = renderedPages.map(({ page, element }) => ({
      page,
      ranges: getPdfSearchRanges(element, normalizedQuery),
    }));
    highlights.set(
      "pdf-viewer-search",
      new HighlightConstructor(...pageRanges.flatMap(({ ranges }) => ranges)),
    );

    const activeMatch = matches[activeMatchIndex];
    if (activeMatch) {
      const activeRangeIndex = matches
        .slice(0, activeMatchIndex)
        .filter(({ page }) => page === activeMatch.page).length;
      const activeRange = pageRanges.find(
        ({ page }) => page === activeMatch.page,
      )?.ranges[activeRangeIndex];

      if (activeRange) {
        highlights.set(
          "pdf-viewer-search-active",
          new HighlightConstructor(activeRange),
        );
        if (scrollToMatchRef.current === activeMatchIndex) {
          activeRange.startContainer.parentElement?.scrollIntoView({
            block: "center",
            inline: "nearest",
          });
          scrollToMatchRef.current = undefined;
        }
      }
    }

    return () => {
      highlights.delete("pdf-viewer-search");
      highlights.delete("pdf-viewer-search-active");
    };
  }, [activeMatchIndex, matches, normalizedQuery, renderedPages]);

  const moveToMatch = (direction: 1 | -1) => {
    if (normalizedQuery !== normalizeText(query)) {
      setNormalizedQuery(normalizeText(query));
      return;
    }
    if (!matches.length) {
      return;
    }

    const nextIndex =
      (activeMatchIndex + direction + matches.length) % matches.length;

    setActiveMatchIndex(nextIndex);
    scrollToMatchRef.current = nextIndex;
    onPageChange(matches[nextIndex]!.page);
  };

  const clearSearch = () => {
    changeQuery("");
    setActiveMatchIndex(0);
  };

  const disabled = !pdfDocument;

  return (
    <FlexRow
      className="pdf-viewer-search gap-p25 p-p25 b b-color rounded focus-border"
      role="search"
      aria-label="Search PDF text"
    >
      <Btn
        iconPath={mdiMagnify}
        size="small"
        disabledInfo={disabled && "PDF is still loading"}
        aria-label="Search PDF text"
      />
      <Input
        ref={inputRef}
        className="pdf-viewer-search__input"
        type="search"
        value={query}
        disabled={disabled}
        placeholder="Search document"
        onChange={(event) => changeQuery(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            moveToMatch(event.shiftKey ? -1 : 1);
          }
          if (event.key === "Escape") {
            clearSearch();
          }
        }}
      />
      <FlexRow
        className="gap-0"
        style={{
          visibility: query ? "visible" : "hidden",
        }}
      >
        <span className="pdf-viewer-search__count" aria-live="polite">
          {`${matches.length ? activeMatchIndex + 1 : 0}/${matches.length}`}
        </span>
        <Btn
          iconPath={mdiChevronLeft}
          size="small"
          aria-label="Previous result"
          disabledInfo={!matches.length && "No search results"}
          onClick={() => moveToMatch(-1)}
        />
        <Btn
          iconPath={mdiChevronRight}
          size="small"
          aria-label="Next result"
          disabledInfo={!matches.length && "No search results"}
          onClick={() => moveToMatch(1)}
        />
      </FlexRow>
    </FlexRow>
  );
};
