import React, {
  useCallback,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type { FileNode } from "./FileSystemTree";
import { bytesToSize } from "src/dashboard/BackupAndRestore/BackupsControls";
import { Checkbox } from "@components/Checkbox";

const INDENT_PX = 8;

type TreeNodeProps = {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  loading: Set<string>;
  errors: Map<string, string>;
  selected: string | null;
  searchQuery: string;
  onToggle: (node: FileNode) => void;
  onSelect: (node: FileNode) => void;
};

export const FileTreeNode = ({
  node,
  depth,
  expanded,
  loading,
  errors,
  selected,
  searchQuery,
  onToggle,
  onSelect,
}: TreeNodeProps) => {
  const isDir = node.type === "directory";
  const isOpen = expanded.has(node.path);
  const isLoading = loading.has(node.path);
  const isActive = selected === node.path;
  const fetchError = errors.get(node.path);
  const [hovered, setHovered] = useState(false);

  const click = useCallback(() => {
    if (isDir) onToggle(node);
    else onSelect(node);
  }, [isDir, node, onToggle, onSelect]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        click();
      }
    },
    [click],
  );

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: `2px 8px 2px ${depth * INDENT_PX + 4}px`,
    cursor: "pointer",
    userSelect: "none",
    position: "relative",
    borderRadius: "var(--border-radius-md)",
    margin: "0 4px",
    background:
      isActive ? "var(--bg-active)"
      : hovered ? "var(--bg-color-1)"
      : "transparent",
    color: "var(--color-text-primary)",
    fontSize: 16,
    fontFamily: "var(--font-mono)",
    lineHeight: "22px",
    transition: "background 0.08s",
  };

  return (
    <div className="">
      <div
        className="ta-start"
        role={isDir ? "button" : "option"}
        tabIndex={0}
        aria-expanded={isDir ? isOpen : undefined}
        aria-selected={isActive}
        style={rowStyle}
        onClick={click}
        onKeyDown={onKeyDown}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {Array.from({ length: depth }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: i * INDENT_PX + 8 + 7,
              top: 0,
              bottom: 0,
              width: "0.5px",
              background: "var(--color-border-tertiary)",
              pointerEvents: "none",
            }}
          />
        ))}
        <Checkbox variant="micro" />
        <span
          style={{
            width: 12,
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {isDir &&
            (isLoading ? <SpinnerIcon /> : <ChevronIcon isOpen={isOpen} />)}
        </span>

        <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {isDir ?
            <FolderIcon isOpen={isOpen} />
          : <FileIcon name={node.name} />}
        </span>

        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <Highlighted text={node.name} query={searchQuery} />
        </span>

        {!isDir && node.size !== undefined && (
          <span
            style={{
              fontSize: 11,
              color: "currentColor",
              flexShrink: 0,
            }}
          >
            {bytesToSize(node.size)}
          </span>
        )}
      </div>

      {isDir && isOpen && (
        <div>
          {fetchError && (
            <div
              style={{
                paddingLeft: (depth + 1) * INDENT_PX + 8 + 32,
                fontSize: 12,
                color: "var(--color-text-danger)",
                lineHeight: "22px",
              }}
            >
              ✗ {fetchError}
            </div>
          )}
          {!fetchError &&
            node.children !== null &&
            node.children.length === 0 && (
              <div
                className="ta-start"
                style={{
                  paddingLeft: (depth + 1) * INDENT_PX + 8 + 32,
                  fontSize: 12,
                  color: "currentColor",
                  fontStyle: "italic",
                  lineHeight: "22px",
                }}
              >
                empty
              </div>
            )}
          {!fetchError &&
            node.children !== null &&
            node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                loading={loading}
                errors={errors}
                selected={selected}
                searchQuery={searchQuery}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ))}
        </div>
      )}
    </div>
  );
};

const Highlighted = ({ text, query }: { text: string; query: string }) => {
  if (!query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark
        style={{
          background: "var(--color-background-info)",
          color: "var(--color-text-info)",
          borderRadius: 2,
          padding: "0 1px",
        }}
      >
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
};

const formatSize = (bytes: number | undefined): string => {
  if (bytes === undefined) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    className="text-1"
    style={{
      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
      transition: "transform 0.15s ease",
      flexShrink: 0,
    }}
  >
    <path
      d="M4.5 3L7.5 6L4.5 9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    className="text-1"
    fill="none"
    style={{ flexShrink: 0, animation: "fst-spin 0.7s linear infinite" }}
  >
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M6 1.5A4.5 4.5 0 0 1 10.5 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const FolderIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    className="text-1"
  >
    <path
      d="M1.5 3.5h4l1.5 1.5H14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"
      fill="currentColor"
      opacity={isOpen ? 0.85 : 0.55}
    />
  </svg>
);

const FileIcon = ({ name }: { name: string }) => {
  const colorVar = fileColorVar(name);
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="text-1"
    >
      <path
        d="M4 2h5.5L13 5.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        fill={"currentColor"}
        opacity="0.15"
      />
      <path
        d="M4 2h5.5L13 5.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        stroke={"currentColor"}
        strokeWidth="1"
      />
      <path d="M9.5 2v3.5H13" stroke={"currentColor"} strokeWidth="1" />
    </svg>
  );
};

const EXT_VAR: Record<string, string> = {
  ts: "--color-text-info",
  tsx: "--color-text-info",
  js: "--color-text-warning",
  jsx: "--color-text-warning",
  json: "--color-text-warning",
  css: "--color-text-info",
  scss: "--color-text-info",
  html: "--color-text-danger",
  py: "--color-text-success",
  rb: "--color-text-danger",
  rs: "--color-text-warning",
  go: "--color-text-info",
  yaml: "--color-text-secondary",
  yml: "--color-text-secondary",
  md: "--color-text-secondary",
  mdx: "--color-text-secondary",
  svg: "--color-text-success",
  png: "--color-text-secondary",
  jpg: "--color-text-secondary",
  jpeg: "--color-text-secondary",
  gif: "--color-text-secondary",
  lock: "--color-text-tertiary",
  gitignore: "--color-text-tertiary",
};

const fileColorVar = (name: string): string =>
  EXT_VAR[name.split(".").pop()?.toLowerCase() ?? ""] ?? "--color-text-primary";
