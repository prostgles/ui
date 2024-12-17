import React, { useEffect, useMemo, useRef, useState } from "react";
import Btn from "../../components/Btn";
import {
  mdiClose,
  mdiFilter,
  mdiFilterCogOutline,
  mdiGestureTap,
} from "@mdi/js";
import type { TimeChart } from "../Charts/TimeChart";
import type { PopupProps } from "../../components/Popup/Popup";
import Popup from "../../components/Popup/Popup";
import { FlexCol, FlexRow } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { InfoRow } from "../../components/InfoRow";
import type { ActiveRow } from "../W_Table/W_Table";
import { RenderValue } from "../SmartForm/SmartFormField/RenderValue";
import { useEffectDeep } from "prostgles-client/dist/react-hooks";
const filterColor = "rgba(5, 176, 223, 0.1)";
const filterColorOpaque = "rgb(226 248 255)";
type DateFilter = { min: Date; max: Date };
type P = {
  filter: { min: number; max: number } | undefined | null;
  chartRef: TimeChart;
  onStart: VoidFunction;
  onEnd: (filter: DateFilter | undefined) => void;
  myActiveRow: ActiveRow | undefined;
  activeRowColor: string | undefined;
  onCancelActiveRow: VoidFunction;
};

export const AddTimeChartFilter = ({
  onStart,
  onEnd,
  chartRef,
  filter,
  myActiveRow,
  activeRowColor = "blue",
  onCancelActiveRow,
}: P) => {
  const [newFilter, setNewFilter] = useState<
    | {
        changed?: boolean;
        x1?: number;
        x2?: number;
        dates?: DateFilter;
        anchor?: Pick<PopupProps, "anchorEl" | "anchorXY" | "positioning">;
      }
    | undefined
  >();

  const divRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffectDeep(() => {
    if (!newFilter || !chartRef.canv || !chartRef.data) return;
    const canvasLeft = chartRef.canv.getBoundingClientRect().left;
    const onPointerMove = (e: PointerEvent) => {
      if (!divRef.current || newFilter.x1 === undefined) return;
      const x2 = e.clientX - canvasLeft;
      const x1 = newFilter.x1;
      const xLeft = Math.min(x1, x2);
      const width = Math.max(x1, x2) - xLeft;
      divRef.current.style.left = `${xLeft}px`;
      divRef.current.style.width = `${width}px`;
      divRef.current.style.top = "0";
      divRef.current.style.bottom = "0";
      divRef.current.style.opacity = "1";
    };
    const onPointerDown = (e: PointerEvent) => {
      const x = e.clientX - canvasLeft;
      if (newFilter.x1 === undefined) {
        setNewFilter({ x1: x });
      } else {
        if (!chartRef.data) return;
        const x2 = x;
        const { x1 } = newFilter;
        setNewFilter({
          x1,
          x2,
          changed: true,
          anchor: {
            anchorXY: {
              x: e.pageX,
              y: e.pageY,
            },
          },
          dates: {
            min: new Date(
              Math.round(chartRef.data.xScale.invert(Math.min(x1, x2))),
            ),
            max: new Date(
              Math.round(chartRef.data.xScale.invert(Math.max(x1, x2))),
            ),
          },
        });
      }
    };

    chartRef.canv.addEventListener("pointermove", onPointerMove);
    chartRef.canv.addEventListener("pointerdown", onPointerDown);
    return () => {
      chartRef.canv?.removeEventListener("pointermove", onPointerMove);
      chartRef.canv?.removeEventListener("pointerdown", onPointerDown);
    };
  }, [chartRef, divRef, newFilter, onEnd]);

  const stop = () => {
    onEnd(undefined);
    setNewFilter(undefined);
  };
  const activeRow = useMemo(() => {
    if (!myActiveRow?.timeChart || !chartRef.canv || !chartRef.data) return;
    const { min, max } = myActiveRow.timeChart;
    const leftPoint = chartRef.getPointXY({ date: min, value: 0 });
    const rightPoint = chartRef.getPointXY({ date: max, value: 0 });
    if (!leftPoint || !rightPoint) return;
    const [xLeft] = leftPoint;
    const [xRight] = rightPoint;
    return {
      xLeft,
      xRight,
      min,
      max,
    };
  }, [myActiveRow, chartRef]);

  const mainButton = (
    <Btn
      _ref={btnRef}
      title={filter ? "Edit filter" : "Add filter"}
      color={newFilter || filter ? "action" : undefined}
      iconPath={filter ? mdiFilterCogOutline : mdiFilter}
      onClick={({ currentTarget }) => {
        if (filter) {
          setNewFilter({
            anchor: {
              anchorEl: currentTarget,
              positioning: "beneath-left",
            },
            dates: {
              min: new Date(filter.min),
              max: new Date(filter.max),
            },
          });
        } else {
          const isStart = !newFilter;
          if (isStart) {
            onStart();
            setNewFilter({});
          } else {
            stop();
          }
        }
      }}
    />
  );

  return (
    <>
      <FlexRow
        className="AddTimeChartFilter "
        style={{ position: "absolute", right: 0, top: 0, zIndex: 1 }}
      >
        {newFilter && !newFilter.dates && (
          <InfoRow
            iconPath={mdiGestureTap}
            className="shadow bg-color-0 px-1 py-p5"
            color="info"
            variant="naked"
          >
            Tap two points you want to filter between
          </InfoRow>
        )}

        {filter ?
          <TimestampFilter
            min={new Date(filter.min)}
            max={new Date(filter.max)}
            style={{ background: filterColorOpaque }}
            endIcon={mainButton}
          />
        : mainButton}
      </FlexRow>
      {newFilter && !newFilter.dates && (
        <div
          ref={divRef}
          style={{
            position: "absolute",
            borderLeft: `1px solid ${filterColor}`,
            borderRight: `1px solid ${filterColor}`,
            zIndex: 1,
            background: filterColor,
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      )}
      {activeRow && chartRef.chart && (
        <FlexCol
          data-command="W_TimeChart.ActiveRow"
          className="gap-0 absolute ws-nowrap"
          onClick={onCancelActiveRow}
          style={{
            zIndex: 1,
            top: 0,
            bottom: 0,
            left: `${activeRow.xLeft}px`,
          }}
        >
          <TimestampFilter
            style={{
              background: filterColorOpaque,
              ...(chartRef.chart.getWH().w - activeRow.xLeft < 250 ?
                {
                  transform: "translate(-228px, 0)",
                  borderBottomRightRadius: 0,
                }
              : {
                  borderBottomLeftRadius: 0,
                }),
            }}
            {...activeRow}
          />
          <div
            style={{
              borderLeft: `1px ${activeRowColor} blue`,
              borderRight: `1px ${activeRowColor} blue`,
              background: activeRowColor,
              bottom: 0,
              flex: 1,
              height: "100%",
              width: `${activeRow.xRight - activeRow.xLeft}px`,
            }}
          />
        </FlexCol>
      )}
      {newFilter?.dates && newFilter.anchor && (
        <Popup
          title={filter ? "Edit filter" : "Add filter"}
          {...newFilter.anchor}
          clickCatchStyle={{ opacity: 0.2 }}
          onClose={() => {
            setNewFilter(undefined);
          }}
          footerButtons={[
            {
              label: "Remove",
              color: "danger",
              onClick: stop,
            },
            !filter || newFilter.changed ?
              undefined
            : {
                label: "On chart edit",
                color: "action",
                variant: "filled",
                onClick: () => {
                  onStart();
                  setNewFilter({});
                },
              },
            !newFilter.changed && filter ?
              undefined
            : {
                label: filter ? "Update filter" : "Add filter",
                color: "action",
                variant: "filled",
                onClick: () => {
                  onEnd(newFilter.dates);
                  setNewFilter(undefined);
                },
              },
          ]}
        >
          <FlexCol>
            <FormField
              type="text"
              value={newFilter.dates.min.toISOString()}
              onChange={(v) =>
                setNewFilter({
                  ...newFilter,
                  changed: true,
                  dates: { ...newFilter.dates!, min: new Date(v) },
                })
              }
            />
            <FormField
              type="text"
              value={newFilter.dates.max.toISOString()}
              onChange={(v) =>
                setNewFilter({
                  ...newFilter,
                  changed: true,
                  dates: { ...newFilter.dates!, max: new Date(v) },
                })
              }
            />
          </FlexCol>
        </Popup>
      )}
    </>
  );
};

type TimestampFilterProps = {
  min: Date;
  max: Date;
  style: React.CSSProperties;
  endIcon?: React.ReactNode;
};
const TimestampFilter = ({
  min,
  max,
  style,
  endIcon,
}: TimestampFilterProps) => {
  return (
    <FlexRow
      className="TimestampFilter gap-1 p-p5 rounded ai-start"
      style={style}
    >
      <FlexCol className="gap-p5">
        <div style={{}}>
          {RenderValue({
            column: { udt_name: "timestamptz", tsDataType: "any" },
            value: min,
          })}
        </div>
        <div style={{}}>
          {RenderValue({
            column: { udt_name: "timestamptz", tsDataType: "any" },
            value: max,
          })}
        </div>
      </FlexCol>
      {endIcon ?? (
        <Btn
          size="small"
          iconPath={mdiClose}
          style={{ marginTop: "-8px", marginRight: "-8px" }}
        />
      )}
    </FlexRow>
  );
};
