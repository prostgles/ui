import { useCallback, useEffect, useRef } from "react";
import { getSmartGroupFilter } from "../../../../../common/filterUtils";
import { isEmpty } from "../../../utils";
import { getDistanceBetweenBoxes } from "../../SilverGrid/SilverGridChild";
import { getRowFilter } from "../tableUtils/getRowFilter";
import type { KanBanDraggedRow } from "./CardViewRow";
import type { DragHeaderProps } from "./DragHeader";

export const useDragHeader = (props: DragHeaderProps) => {
  const {
    indexedRow,
    allIndexedRows,
    groupByColumn,
    orderByColumn,
    table,
    columns,
    tableHandler,
    onDataChanged,
    onEditClickRow,
    draggedRow,
    setDraggedRow,
  } = props;

  const draggedRowRef = useRef<
    {
      top: number;
      left: number;
    } & KanBanDraggedRow
  >();
  useEffect(() => {
    if (!draggedRow || draggedRow.index !== draggedRowRef.current?.index) {
      draggedRowRef.current = undefined;
    }
  }, [draggedRow]);

  const getNodes = useCallback(
    (node: HTMLDivElement) => {
      const rowNode = node.parentElement!;
      const rootView = node.closest(".CardView");
      const siblings = Array.from<HTMLDivElement>(
        rootView?.querySelectorAll(`[data-row-index]`) ?? [],
      )
        .map((n) => {
          const rowIndex = parseInt(n.dataset.rowIndex!);
          const isValid = Number.isInteger(rowIndex);
          const isNotSelf = isValid && rowIndex !== indexedRow.index;
          return {
            n,
            rowIndex,
            isValid,
            isNotSelf,
          };
        })
        .filter((d) => d.isNotSelf);
      const rSource = node.getBoundingClientRect();
      const targetSibling = siblings
        .map((s) => {
          const rTarget = s.n.getBoundingClientRect();
          return { ...s, d: getDistanceBetweenBoxes(rSource, rTarget) };
        })
        .sort((a, b) => a.d - b.d)[0];

      return {
        rowNode,
        groupNode: rowNode.parentElement,
        siblings: siblings.map((s) => s.n),
        targetSibling: targetSibling?.isNotSelf ? targetSibling : undefined,
        rootView,
      };
    },
    [indexedRow.index],
  );

  const onPanStart = useCallback(
    ({ node }, e) => {
      e.preventDefault();
      e.stopPropagation();
      const handlerNode = node.getBoundingClientRect();
      const rowNode = node.parentElement;
      const groupNode = rowNode?.parentElement?.getBoundingClientRect();
      if (!rowNode || !groupNode) return;

      draggedRowRef.current = {
        top: handlerNode.top - groupNode.top,
        left: handlerNode.left - groupNode.left,
        ...indexedRow,
        height: rowNode.getBoundingClientRect().height,
        target: undefined,
      };
      setDraggedRow({
        ...indexedRow,
        height: rowNode.getBoundingClientRect().height,
        target: undefined,
      });
    },
    [indexedRow, draggedRowRef, setDraggedRow],
  );
  const onPan = useCallback(
    ({ xDiff, yDiff, x, y, node }, e) => {
      const draggedRow = draggedRowRef.current;
      if (!draggedRow) return;
      const { targetSibling, rowNode, groupNode } = getNodes(node);

      rowNode.style.position = "absolute";
      rowNode.style.zIndex = "22";
      rowNode.style.transform = `translate(${draggedRow.left + xDiff}px, ${draggedRow.top + yDiff - (groupNode?.parentElement?.scrollTop ?? 0)}px)`;
      e.preventDefault();
      e.stopPropagation();

      const targetIndex =
        targetSibling ? parseInt(targetSibling.n.dataset.rowIndex!) : undefined;
      const targetIRow = allIndexedRows.find((d) => d.index === targetIndex);
      console.log(targetIRow);
      if (draggedRow.target?.index !== targetIndex) {
        draggedRowRef.current = {
          ...draggedRow,
          target: targetIRow,
        };
        setDraggedRow({
          ...draggedRow,
          target: targetIRow,
        });
      }
    },
    [allIndexedRows, getNodes, setDraggedRow],
  );
  const onPanEnd = useCallback(
    ({ node }, e) => {
      const draggedRow = draggedRowRef.current;
      if (!draggedRow) return;
      e.preventDefault();
      e.stopPropagation();
      const { rowNode, siblings } = getNodes(node);

      (async () => {
        const nodes = {
          didMove: false,
          dragged: rowNode,
          beneathDragged: siblings[draggedRow.index + 1],
          target: siblings[draggedRow.target?.index ?? -1],
        };
        if (
          draggedRow.target &&
          draggedRow.index !== draggedRow.target.index - 1
        ) {
          const { error, filter } = await getRowFilter(
            draggedRow.data,
            table,
            columns,
            tableHandler,
          );
          if (error) {
            alert(error);
          } else if (filter) {
            const noSiblingData = {
              nextRow: undefined,
              nextRowFilter: undefined,
              prevRow: undefined,
              prevRowFilter: undefined,
            };
            const sourceGroupValue = draggedRow.data[groupByColumn.name];
            const targetGroupValue = draggedRow.target.data[groupByColumn.name];
            const newGroupFilter = {
              [groupByColumn.name]: targetGroupValue,
            };
            let newOrderValue = {};
            if (orderByColumn) {
              const targetOrderValue =
                draggedRow.target.data[orderByColumn.name];
              newOrderValue = { [orderByColumn.name]: targetOrderValue };
              const increment = 0.000001;
              try {
                const targetSiblingFilter = await getRowFilter(
                  draggedRow.target.data,
                  table,
                  columns,
                  tableHandler,
                );
                if (targetSiblingFilter.error) throw targetSiblingFilter.error;
                const finalTargetFilter = getSmartGroupFilter(
                  targetSiblingFilter.filter,
                );
                /** Move target order slightly below its current position which will be taken by the dragged item */
                const prevTargetItem = await tableHandler.findOne?.(
                  {
                    $and: [
                      finalTargetFilter,
                      { [orderByColumn.name]: { ">": targetOrderValue } },
                    ],
                  },
                  { orderBy: { [orderByColumn.name]: false } },
                );

                let newTargetOrderValue = Number(targetOrderValue) + increment;
                if (prevTargetItem) {
                  newTargetOrderValue =
                    (Number(prevTargetItem[orderByColumn.name]) +
                      Number(targetOrderValue)) /
                    2;
                }
                await tableHandler.update?.(
                  finalTargetFilter,
                  { [orderByColumn.name]: newTargetOrderValue },
                  { returning: "*" },
                );
              } catch (err) {
                onEditClickRow(
                  filter,
                  noSiblingData,
                  indexedRow.index,
                  newGroupFilter,
                );
              }
            }
            const newGroupValue =
              targetGroupValue === sourceGroupValue ?
                {}
              : { [groupByColumn.name]: targetGroupValue };
            if (!isEmpty(newGroupValue) || !isEmpty(newOrderValue)) {
              try {
                const finalFilter = getSmartGroupFilter(filter);
                await tableHandler.update!(
                  finalFilter,
                  {
                    ...newGroupValue,
                    ...newOrderValue,
                  },
                  { returning: "*" },
                );

                onDataChanged();
                nodes.didMove = true;
              } catch (err) {
                onEditClickRow(
                  filter,
                  noSiblingData,
                  indexedRow.index,
                  newGroupFilter,
                );
              }
            }
          }
        }

        setTimeout(() => {
          rowNode.style.opacity = "";
          rowNode.style.position = "";
          rowNode.style.zIndex = "";
          rowNode.style.transform = ``;
          rowNode.style.transition = "";
        }, 22);
        draggedRowRef.current = undefined;
        setDraggedRow(undefined);
      })();

      return false;
    },
    [
      getNodes,
      table,
      columns,
      tableHandler,
      groupByColumn.name,
      orderByColumn,
      onEditClickRow,
      indexedRow.index,
      onDataChanged,
      setDraggedRow,
    ],
  );

  return {
    onPanStart,
    onPan,
    onPanEnd,
  };
};
