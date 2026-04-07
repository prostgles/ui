import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import {
  mdiCheckboxBlankOutline,
  mdiCheckboxMarked,
  mdiRadioboxBlank,
  mdiRadioboxMarked,
} from "@mdi/js";
import React, {
  useCallback,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { bytesToSize } from "src/dashboard/BackupAndRestore/BackupsControls";
import { FileIcon } from "./FileIcon";
import type { FileSystemTreeProps } from "./FileTree";
import { FolderIcon } from "./FolderIcon";
import { useFileSystemChecked } from "./useFileSystemChecked";
import type { FileNode } from "./useFileSystemTree";
import "./FileTreeNode.css";

const INDENT_PX = 8;

type TreeNodeProps = {
  tree: FileNode[];
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  loading: Set<string>;
  errors: Map<string, string>;
  searchQuery: string;
  onToggle: (node: FileNode) => void;
} & Pick<
  FileSystemTreeProps,
  "checkBoxes" | "onFileSelect" | "selectedFilePath"
>;

export const FileTreeNode = ({
  tree,
  node,
  depth,
  expanded,
  loading,
  errors,
  searchQuery,
  onToggle,
  onFileSelect,
  checkBoxes,
  selectedFilePath,
}: TreeNodeProps) => {
  const isDir = node.type === "directory";
  const isOpen = expanded.has(node.path);
  const isLoading = loading.has(node.path);
  const isActive = selectedFilePath === node.path;
  const fetchError = errors.get(node.path);
  const checkState = useFileSystemChecked({ node, tree, checkBoxes });

  const click = useCallback(
    ({ currentTarget }: { currentTarget: EventTarget & HTMLDivElement }) => {
      if (!isDir) {
        onFileSelect?.(node);
        return;
      }

      onToggle(node);
      setTimeout(() => {
        const scrollNode =
          isOpen ? currentTarget : (
            (currentTarget.parentElement?.nextSibling as HTMLElement)
          );
        scrollNode.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    },
    [isDir, onFileSelect, node, onToggle, isOpen],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        click(e);
      }
    },
    [click],
  );

  const BASE_STICKY_Z = 1000;
  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    position: "relative",
    ...(isDir &&
      isOpen && {
        position: "sticky",
        top: depth * INDENT_PX * 3,
        zIndex: BASE_STICKY_Z - depth,
      }),
    padding: `2px 8px 2px ${depth * INDENT_PX + 4}px`,
    cursor: "pointer",
    userSelect: "none",
    margin: "0 4px",
    fontSize: 16,
    lineHeight: "22px",
    transition: "background 0.08s",
  };

  return (
    <div
      className=""
      data-command="FileTreeNode"
      data-label={node.name}
      data-key={node.path}
    >
      <div
        className={`fst-tree-row ta-start hover-bg`}
        role={isDir ? "button" : "option"}
        tabIndex={0}
        aria-expanded={isDir ? isOpen : undefined}
        aria-selected={isActive}
        style={rowStyle}
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
              pointerEvents: "none",
            }}
          />
        ))}
        <FileTreeNodeCheckbox
          checkBoxes={checkBoxes}
          checkState={checkState}
          node={node}
        />
        <FlexRow
          title={node.path}
          data-command="FileTreeNode.header"
          className="gap-p25 f-1"
          onClick={click}
          onKeyDown={onKeyDown}
        >
          {isDir ?
            isLoading ?
              <Loading className="f-0" sizePx={14} />
            : <FolderIcon className="f-0" isOpen={isOpen} />
          : <FileIcon className="f-0" name={node.name} />}

          <span
            className={
              "f-1 ws-nowrap text-ellipsis " +
              (checkBoxes?.type === "directory" && node.type === "file" ?
                "disabled"
              : "")
            }
          >
            <Highlighted text={node.name} query={searchQuery} />
          </span>

          {!isDir && node.size !== undefined && (
            <span className="f-0 font-12">{bytesToSize(node.size)}</span>
          )}
        </FlexRow>
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
                className="ta-start text-1"
                style={{
                  paddingLeft: (depth + 1) * INDENT_PX + 8 + 32,
                  fontSize: 12,
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
                tree={tree}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                loading={loading}
                errors={errors}
                selectedFilePath={selectedFilePath}
                checkBoxes={checkBoxes}
                searchQuery={searchQuery}
                onToggle={onToggle}
                onFileSelect={onFileSelect}
              />
            ))}
        </div>
      )}
    </div>
  );
};

const FileTreeNodeCheckbox = ({
  node,
  checkBoxes,
  checkState,
}: Pick<FileSystemTreeProps, "checkBoxes"> & {
  checkState: ReturnType<typeof useFileSystemChecked>;
  node: FileNode;
}) => {
  return (
    checkState &&
    checkBoxes &&
    (checkBoxes.type === "all" ||
      checkBoxes.type === node.type ||
      checkState.isChecked) && (
      <Btn
        data-command="FileTreeNode.checkbox"
        iconPath={
          checkState.radioMode ?
            checkState.isChecked ?
              mdiRadioboxMarked
            : mdiRadioboxBlank
          : checkState.isChecked ?
            mdiCheckboxMarked
          : mdiCheckboxBlankOutline
        }
        style={{
          padding: 0,
          opacity: checkState.isChecked?.type === "inherited" ? 0.7 : 1,
        }}
        color={checkState.isChecked ? "action" : undefined}
        size="micro"
        className={checkState.isChecked ? "" : "show-on-parent-hover"}
        onClick={checkState.onCheckItem}
      />
    )
  );
};

const Highlighted = ({ text, query }: { text: string; query: string }) => {
  if (!query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span className="text-1">
      {text.slice(0, idx)}
      <mark
        className="text-0 bold"
        style={{
          borderRadius: 2,
          padding: "0 1px",
          background: "transparent",
        }}
      >
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
};
