import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { Input } from "@components/Input";
import { mdiChevronLeft, mdiChevronRight, mdiMagnify } from "@mdi/js";
import type * as pdfjsLib from "pdfjs-dist";
import React, { useEffect, useMemo, useRef, useState } from "react";

import "./PdfViewerSearch.css";

type SearchMatch = {
  page: number;
};

export type PdfViewerSearchProps = {
  pdfDocument: pdfjsLib.PDFDocumentProxy | null;
  pageElement: HTMLDivElement | null;
  currentPage: number;
  onPageChange: (page: number) => void;
};

const normalizeText = (text: string) =>
  text.replace(/\s+/g, " ").trim().toLocaleLowerCase();
const normalizeTextWithOffsets = (source: string) => {
  let text = "";
  const offsets: number[] = [];
  let whitespaceOffset: number | undefined;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;

    if (/\s/.test(character)) {
      whitespaceOffset ??= index;
      continue;
    }

    if (whitespaceOffset !== undefined && text) {
      text += " ";
      offsets.push(whitespaceOffset);
    }

    whitespaceOffset = undefined;

    const normalizedCharacter = character.toLocaleLowerCase();

    text += normalizedCharacter;
    offsets.push(
      ...Array.from({ length: normalizedCharacter.length }, () => index),
    );
  }

  return { text, offsets };
};
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
  pageElement,
  currentPage,
  onPageChange,
}: PdfViewerSearchProps) => {
  const [query, setQuery] = useState("");
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const normalizedQuery = normalizeText(query);

  /** Intercept ctrl+f */
  const inputRef = useRef<HTMLInputElement>(null);

  /** Intercept ctrl+f */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
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
    setActiveMatchIndex(0);

    if (matches.length) {
      onPageChange(matches[0]!.page);
    }
  }, [matches, onPageChange]);

  useEffect(() => {
    const highlights = (CSS as any).highlights as
      Map<string, unknown> | undefined;
    const HighlightConstructor = (window as any).Highlight;

    if (
      !pageElement ||
      !normalizedQuery ||
      !highlights ||
      !HighlightConstructor
    ) {
      return;
    }

    const walker = document.createTreeWalker(pageElement, NodeFilter.SHOW_TEXT);
    const textNodes: { node: Text; start: number; end: number }[] = [];
    let sourceText = "";
    let textNode: Text | null;

    while ((textNode = walker.nextNode() as Text | null)) {
      if (sourceText) {
        sourceText += " ";
      }

      const start = sourceText.length;
      sourceText += textNode.data;

      textNodes.push({
        node: textNode,
        start,
        end: sourceText.length,
      });
    }

    const { text: searchableText, offsets } =
      normalizeTextWithOffsets(sourceText);
    const ranges: Range[] = [];
    let offset = 0;

    while (offset < searchableText.length) {
      const matchStart = searchableText.indexOf(normalizedQuery, offset);

      if (matchStart === -1) {
        break;
      }

      const matchEnd = matchStart + normalizedQuery.length;
      const sourceStart = offsets[matchStart];
      const sourceEnd = offsets[matchEnd - 1];

      if (sourceStart === undefined || sourceEnd === undefined) {
        offset = matchEnd;
        continue;
      }

      const startNode = textNodes.find(
        ({ start, end }) => sourceStart >= start && sourceStart < end,
      );
      const endNode = textNodes.find(
        ({ start, end }) => sourceEnd >= start && sourceEnd < end,
      );

      if (startNode && endNode) {
        const range = document.createRange();
        range.setStart(startNode.node, sourceStart - startNode.start);
        range.setEnd(endNode.node, sourceEnd - endNode.start + 1);
        ranges.push(range);
      }

      offset = matchEnd;
    }

    highlights.set("pdf-viewer-search", new HighlightConstructor(...ranges));

    const activeMatch = matches[activeMatchIndex];
    if (activeMatch?.page === currentPage) {
      const activeRangeIndex = matches
        .slice(0, activeMatchIndex)
        .filter(({ page }) => page === currentPage).length;
      const activeRange = ranges[activeRangeIndex];

      if (activeRange) {
        highlights.set(
          "pdf-viewer-search-active",
          new HighlightConstructor(activeRange),
        );
      }
    }

    return () => {
      highlights.delete("pdf-viewer-search");
      highlights.delete("pdf-viewer-search-active");
    };
  }, [activeMatchIndex, currentPage, matches, normalizedQuery, pageElement]);

  const moveToMatch = (direction: 1 | -1) => {
    if (!matches.length) {
      return;
    }

    const nextIndex =
      (activeMatchIndex + direction + matches.length) % matches.length;

    setActiveMatchIndex(nextIndex);
    onPageChange(matches[nextIndex]!.page);
  };

  const clearSearch = () => {
    setQuery("");
    setActiveMatchIndex(0);
  };

  const disabled = !pdfDocument;

  return (
    <FlexRow
      className="PdfViewerSearch pdf-viewer-search gap-0"
      role="search"
      aria-label="Search PDF text"
    >
      <Btn
        iconPath={mdiMagnify}
        size="small"
        className="mt-p25"
        disabledInfo={disabled && "PDF is still loading"}
        aria-label="Search PDF text"
        style={{ padding: 0, minWidth: 0, minHeight: 0 }}
      />
      <Input
        ref={inputRef}
        className="pdf-viewer-search__input"
        type="search"
        value={query}
        disabled={disabled}
        placeholder="Search document"
        onChange={(event) => setQuery(event.currentTarget.value)}
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
