import RTComp from "../RTComp";
import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import { getDistanceBetweenBoxes } from "../SilverGrid/SilverGridChild";
import { getSmartGroupFilter } from "../SmartFilter/SmartFilter";
import type { CardViewProps, CardViewState, IndexedRow } from "./CardView";
import type { ValidatedColumnInfo } from "prostgles-types";
import { Pan } from "../../components/Table/Table";
import { getRowFilter } from "./tableUtils/getEditColumn";
import React from "react";
import { isEmpty } from "../../utils";

type DragHeaderProps = Pick<
  CardViewProps,
  "onDataChanged" | "onEditClickRow"
> & {
  padding: string;
  indexedRow: IndexedRow;
  isMoving: CardViewState["isMoving"];
  onChange: (newIsMoving: CardViewState["isMoving"]) => void;
  allIndexedRows: IndexedRow[];
  groupByColumn: ValidatedColumnInfo;
  orderByColumn: ValidatedColumnInfo | undefined;
  columns: ValidatedColumnInfo[];
  tableHandler: Partial<TableHandlerClient>;
};
export const DragHeaderHeight = 30;
export class DragHeader extends RTComp<DragHeaderProps> {
  render(): React.ReactNode {
    const getNodes = (node: HTMLDivElement) => {
      const rowNode = node.parentElement!;
      const rootView = node.closest(".CardView");
      const siblings = Array.from<HTMLDivElement>(
        rootView?.querySelectorAll(`[data-row-index]`) ?? [],
      )
        .map((n) => {
          const rowIndex = parseInt(n.dataset.rowIndex!);
          const isValid = Number.isInteger(rowIndex);
          const isNotSelf = isValid && rowIndex !== this.props.indexedRow.index;
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
    };
    return (
      <Pan
        data-command="CardView.DragHeader"
        className=" "
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: "3em", // Space for edit button
          height: `${DragHeaderHeight}px`,
          cursor: "move",
        }}
        onPanStart={({ node }, e) => {
          e.preventDefault();
          e.stopPropagation();
          const handlerNode = node.getBoundingClientRect();
          const rowNode = node.parentElement;
          const groupNode = rowNode?.parentElement?.getBoundingClientRect();
          if (!rowNode || !groupNode) return;

          this.props.onChange({
            top: handlerNode.top - groupNode.top,
            left: handlerNode.left - groupNode.left,
            height: rowNode.getBoundingClientRect().height,
            bbox: rowNode.getBoundingClientRect(),
            ...this.props.indexedRow,
          });
        }}
        onPan={({ xDiff, yDiff, x, y, node }, e) => {
          const isMoving = this.props.isMoving;
          if (!isMoving) return;
          const { targetSibling, rowNode, groupNode } = getNodes(node);

          rowNode.style.position = "absolute";
          rowNode.style.zIndex = "22";
          rowNode.style.transform = `translate(${isMoving.left + xDiff}px, ${isMoving.top + yDiff - (groupNode?.parentElement?.scrollTop ?? 0)}px)`;
          e.preventDefault();
          e.stopPropagation();

          const targetIndex =
            targetSibling ?
              parseInt(targetSibling.n.dataset.rowIndex!)
            : undefined;
          const targetIRow = this.props.allIndexedRows.find(
            (d) => d.index === targetIndex,
          );
          if (isMoving.target?.index !== targetIndex) {
            this.props.onChange({
              ...isMoving,
              target: targetIRow,
            });
          }
        }}
        onPanEnd={({ node }, e) => {
          const isMoving = this.props.isMoving;
          if (!isMoving) return;
          e.preventDefault();
          e.stopPropagation();
          const { rowNode, siblings } = getNodes(node);

          (async () => {
            const nodes = {
              didMove: false,
              dragged: rowNode,
              beneathDragged: siblings[isMoving.index + 1],
              target: siblings[isMoving.target?.index ?? -1],
            };
            if (
              isMoving.target &&
              isMoving.index !== isMoving.target.index - 1
            ) {
              const { error, filter } = await getRowFilter(
                isMoving.data,
                this.props.columns,
                this.props.tableHandler,
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
                const { groupByColumn, orderByColumn } = this.props;
                const sourceGroupValue = isMoving.data[groupByColumn.name];
                const targetGroupValue =
                  isMoving.target.data[groupByColumn.name];
                const newGroupFilter = {
                  [groupByColumn.name]: targetGroupValue,
                };
                let newOrderValue = {};
                if (orderByColumn) {
                  const targetOrderValue =
                    isMoving.target.data[orderByColumn.name];
                  newOrderValue = { [orderByColumn.name]: targetOrderValue };
                  const increment = 0.000001;
                  try {
                    const targetSiblingFilter = await getRowFilter(
                      isMoving.target.data,
                      this.props.columns,
                      this.props.tableHandler,
                    );
                    if (targetSiblingFilter.error)
                      throw targetSiblingFilter.error;
                    const finalTargetFilter = getSmartGroupFilter(
                      targetSiblingFilter.filter,
                    );
                    /** Move target order slightly below its current position which will be taken by the dragged item */
                    const prevTargetItem =
                      await this.props.tableHandler.findOne?.(
                        {
                          $and: [
                            finalTargetFilter,
                            { [orderByColumn.name]: { ">": targetOrderValue } },
                          ],
                        },
                        { orderBy: { [orderByColumn.name]: false } },
                      );

                    let newTargetOrderValue =
                      Number(targetOrderValue) + increment;
                    if (prevTargetItem) {
                      newTargetOrderValue =
                        (Number(prevTargetItem[orderByColumn.name]) +
                          Number(targetOrderValue)) /
                        2;
                    }
                    await this.props.tableHandler.update?.(
                      finalTargetFilter,
                      { [orderByColumn.name]: newTargetOrderValue },
                      { returning: "*" },
                    );
                  } catch (err) {
                    this.props.onEditClickRow(
                      filter,
                      noSiblingData,
                      this.props.indexedRow.index,
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
                    await this.props.tableHandler.update!(
                      finalFilter,
                      {
                        ...newGroupValue,
                        ...newOrderValue,
                      },
                      { returning: "*" },
                    );

                    this.props.onDataChanged();
                    nodes.didMove = true;
                  } catch (err) {
                    this.props.onEditClickRow(
                      filter,
                      noSiblingData,
                      this.props.indexedRow.index,
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
            this.props.onChange(undefined);
          })();

          return false;
        }}
      ></Pan>
    );
  }
}
