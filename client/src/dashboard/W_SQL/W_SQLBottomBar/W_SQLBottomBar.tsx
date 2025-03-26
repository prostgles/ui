import {
  mdiAlertOutline,
  mdiCancel,
  mdiChevronDown,
  mdiPlay,
  mdiStopCircleOutline,
  mdiTable,
} from "@mdi/js";
import { isDefined, type DBHandler } from "prostgles-types";
import React, { useEffect, useRef, useState } from "react";
import type { Prgl } from "../../../App";
import { dataCommand } from "../../../Testing";
import { useReactiveState } from "../../../appUtils";
import Btn from "../../../components/Btn";
import ButtonGroup from "../../../components/ButtonGroup";
import ErrorComponent from "../../../components/ErrorComponent";
import { FlexCol, FlexRow } from "../../../components/Flex";
import { InfoRow } from "../../../components/InfoRow";
import Loading from "../../../components/Loading";
import Popup from "../../../components/Popup/Popup";
import PopupMenu from "../../../components/PopupMenu";
import { SwitchToggle } from "../../../components/SwitchToggle";
import type { DBS, DBSMethods } from "../../Dashboard/DBS";
import type { WindowSyncItem } from "../../Dashboard/dashboardUtils";
import { CopyResultBtn } from "../CopyResultBtn";
import type { W_SQL } from "../W_SQL";
import type { W_SQLState } from "../W_SQL";
import { Counter, SQL_NOT_ALLOWED } from "../W_SQL";
import { W_SQLBottomBarProcStats } from "./W_SQLBottomBarProcStats";
import { t } from "../../../i18n/i18nUtils";

export const includes = <T extends string, ArrV extends T>(
  v: T | undefined,
  arr: ArrV[],
): v is ArrV => arr.includes(v as ArrV);

export type W_SQLBottomBarProps = {
  killQuery: (terminate: boolean) => void;
  db: DBHandler;
  dbs: DBS;
  dbsMethods: DBSMethods;
  connectionId: Prgl["connectionId"];
  runSQL: W_SQL["runSQL"];
  streamData: W_SQL["streamData"];
  noticeEventListener: W_SQL["noticeEventListener"];
  w: WindowSyncItem<"sql">;
  onChangeState: (
    newState: Pick<W_SQLState, "noticeSub" | "notices" | "notifEventSub">,
  ) => void;
  toggleCodeEditor: VoidFunction;
  clearActiveQueryError: VoidFunction;
} & Pick<
  W_SQLState,
  | "loadingSuggestions"
  | "cols"
  | "rows"
  | "noticeSub"
  | "activeQuery"
  | "queryEnded"
  | "notifEventSub"
  | "hideCodeEditor"
>;

export const W_SQLBottomBar = (props: W_SQLBottomBarProps) => {
  const {
    db,
    killQuery,
    runSQL,
    w,
    activeQuery,
    notifEventSub,
    cols,
    loadingSuggestions,
    noticeSub,
    clearActiveQueryError,
    noticeEventListener,
    onChangeState,
    streamData,
    hideCodeEditor,
    toggleCodeEditor,
  } = props;
  const myRef = useRef<HTMLDivElement>(null);
  const refRowCount = myRef.current;
  const [showRunOptions, setShowRunOptions] = useState<HTMLElement | null>(
    null,
  );
  const [loopMode, setLoopMode] = useState({
    show: false,
    seconds: 0,
    enabled: false,
  });

  const {
    state: { rows },
  } = useReactiveState(streamData);

  useEffect(() => {
    if (!loopMode.enabled || !loopMode.seconds) return;

    const interval = setInterval(runSQL, loopMode.seconds * 1e3);

    return () => clearInterval(interval);
  }, [loopMode.enabled, loopMode.seconds, runSQL]);

  const stopQuery = (terminate: boolean) => {
    killQuery(terminate);
    setLoopMode({ ...loopMode, enabled: false, show: false, seconds: 0 });
  };

  const duration =
    activeQuery?.state === "running" ?
      Date.now() - activeQuery.started.getTime()
    : activeQuery?.state === "ended" ?
      activeQuery.ended.getTime() - activeQuery.started.getTime()
    : 0;
  const queryIsRunning = activeQuery?.state === "running";
  const fetchedRowCount =
    !activeQuery || activeQuery.state === "error" ? 0
    : activeQuery.state === "running" ? rows.length
    : activeQuery.rowCount;
  const totalRowCount =
    activeQuery?.state === "ended" && isDefined(activeQuery.totalRowCount) ?
      activeQuery.totalRowCount
    : undefined;
  const limitWasReached =
    activeQuery?.state === "ended" && activeQuery.rowCount === w.limit;
  return (
    <div
      className={
        "W_SQLBottomBar relative oy-hidden flex-row text-2 ai-center text-sm o-auto "
      }
      style={{
        borderTop: "1px solid #0000000d",
        /** Ensure big error messages don't obscure the sql editor */
        maxHeight: activeQuery?.state === "error" ? "50%" : undefined,
      }}
    >
      {showRunOptions && (
        <Popup
          contentClassName="flex-col gap-1 p-p5"
          positioning="beneath-left"
          anchorEl={showRunOptions}
          clickCatchStyle={{ opacity: 0 }}
          onClose={() => setShowRunOptions(null)}
        >
          <ButtonGroup
            label={t.W_SQLBottomBar["Execution mode"]}
            value={w.sql_options.executeOptions ?? "block"}
            options={["full", "block", "smallest-block"]}
            onChange={(executeOptions) =>
              w.$update(
                { sql_options: { executeOptions } },
                { deepMerge: true },
              )
            }
          />
          <SwitchToggle
            label={t.W_SQLBottomBar["Loop query execution"]}
            checked={loopMode.enabled}
            onChange={() => {
              setLoopMode({ ...loopMode, show: true });
              setShowRunOptions(null);
            }}
          />
        </Popup>
      )}
      {queryIsRunning ?
        <>
          <Btn
            size="medium"
            color="action"
            iconPath={mdiStopCircleOutline}
            title={t.W_SQLBottomBar["Cancel this query (Esc)"]}
            {...dataCommand("dashboard.window.cancelQuery")}
            loading={activeQuery.stopped?.type === "cancel"}
            onClick={() => {
              stopQuery(false);
            }}
          >
            Cancel
          </Btn>
          <Btn
            size="medium"
            title={t.W_SQLBottomBar["Terminate this query"]}
            {...dataCommand("dashboard.window.terminateQuery")}
            color="danger"
            iconPath={mdiCancel}
            loading={activeQuery.stopped?.type === "terminate"}
            onClick={() => {
              stopQuery(true);
            }}
          >
            Terminate
          </Btn>
          <Counter
            title={t.W_SQLBottomBar["Query running time"]}
            className="p-p5 mr-1 noselect"
            from={activeQuery.started}
          />
          {w.sql_options.showRunningQueryStats && (
            <W_SQLBottomBarProcStats {...props} />
          )}
        </>
      : <>
          {notifEventSub ?
            <Btn
              title={t.W_SQLBottomBar["Stop LISTEN"]}
              size="medium"
              color="action"
              iconPath={mdiStopCircleOutline}
              {...dataCommand("dashboard.window.stopListen")}
              onClick={async () => {
                await notifEventSub.removeListener();
                onChangeState({ notifEventSub: undefined });
              }}
              fadeIn={true}
            >
              {t.W_SQLBottomBar["Stop LISTEN"]}
            </Btn>
          : loopMode.show ?
            <FlexRow>
              <Btn
                color={loopMode.enabled ? "action" : undefined}
                iconPath={mdiCancel}
                onClick={() =>
                  setLoopMode({ ...loopMode, show: false, enabled: false })
                }
              />
              <label>{t.W_SQLBottomBar["repeat every"]}</label>
              <input
                {...{ min: 0, max: 20, step: 0.1 }}
                type="number"
                style={{ fontSize: "12px" }}
                value={loopMode.seconds}
                onChange={(v) =>
                  setLoopMode({
                    ...loopMode,
                    enabled: true,
                    seconds: +v.target.value,
                  })
                }
              />
              <label>{t.W_SQLBottomBar.seconds}</label>
            </FlexRow>
          : <Btn
              {...dataCommand("dashboard.window.runQuery")}
              className="ml-p25"
              color="action"
              title={t.W_SQLBottomBar["Run query (CTRL+E, ALT+E)"]}
              disabledInfo={!db.sql ? SQL_NOT_ALLOWED : undefined}
              size="medium"
              iconPath={mdiPlay}
              onClick={(e) => {
                runSQL();
                hideKeyboard(e.currentTarget);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowRunOptions(e.currentTarget);
              }}
              fadeIn={true}
            >
              {t.W_SQLBottomBar.Run}
            </Btn>
          }
          {activeQuery?.state === "ended" && !loopMode.show && (
            <div
              className="p-p5 mr-1 noselect fade-in"
              title={t.W_SQLBottomBar["Query running time: "]({
                duration: toSecondsString(duration),
              })}
            >
              {notifEventSub ? "LISTEN..." : toSecondsString(duration)}
            </div>
          )}
        </>
      }

      <FlexRow
        ref={myRef}
        className="flex-row gap-p5 ai-center p-p5 noselect"
        style={{ marginRight: "1em" }}
      >
        {activeQuery && activeQuery.state !== "error" && cols && (
          <>
            <FlexCol className="RowCount gap-p25 text-1">
              {fetchedRowCount.toLocaleString()} rows
              {isDefined(totalRowCount) && totalRowCount > fetchedRowCount && (
                <div className="text-warning">
                  {totalRowCount.toLocaleString()} total rows
                </div>
              )}
            </FlexCol>
            {limitWasReached && (
              <PopupMenu
                contentClassName="p-1"
                positioning="above-center"
                button={
                  <Btn iconPath={mdiAlertOutline} size="small" color="warn" />
                }
                footerButtons={[
                  {
                    label: "Remove limit",
                    color: "action",
                    variant: "filled",
                    onClick: () => w.$update({ limit: null }),
                  },
                ]}
                render={() => (
                  <InfoRow variant="naked">
                    Limit was reached: {w.limit} rows fetched out of{" "}
                    {totalRowCount} total rows
                  </InfoRow>
                )}
              />
            )}
          </>
        )}
        {activeQuery?.state !== "error" && (
          <CopyResultBtn
            cols={cols ?? []}
            rows={rows}
            sql={db.sql!}
            queryEnded={activeQuery?.state === "ended"}
          />
        )}
      </FlexRow>

      {loadingSuggestions && db.sql && (
        <Loading message="Loading suggestions" />
      )}

      {w.sql_options.errorMessageDisplay !== "tooltip" && (
        <ErrorComponent
          noScroll={false}
          error={
            activeQuery?.state === "error" ? activeQuery.error?.message : ""
          }
          color={
            activeQuery?.state === "error" && !activeQuery.stopped ?
              "info"
            : undefined
          }
          style={{
            padding: "1em",
            fontSize: "16px",
            whiteSpace: "pre",
            maxHeight: "min(100%, 300px)",
          }}
          onClear={clearActiveQueryError}
        />
      )}

      {!queryIsRunning && (
        <>
          <div
            className={
              "ml-auto flex-row ai-center " +
              (limitWasReached ? "text-warning" : "")
            }
            style={{ marginRight: "1em" }}
            title={t.W_SQLBottomBar["Clear value to show all rows"]}
          >
            <label className="mr-p5">{t.W_SQLBottomBar.Limit}</label>
            <input
              id={"dd" + w.limit}
              type="number"
              style={{ width: "55px" }}
              min={1}
              max={1000}
              step={1}
              className="text-0 b b-color-2 bg-color-2 rounded p-p25"
              defaultValue={w.limit ?? ""}
              onChange={({ target: { value } }) => {
                const limit = value.length ? +value : -1;
                if (!Number.isInteger(limit) || limit < 1) {
                  w.$update({ limit: null });
                } else {
                  w.$update({ limit });
                }
              }}
            />
          </div>
          <Btn
            title={t.W_SQLBottomBar["Show/Hide table"]}
            iconPath={mdiTable}
            className="mr-1"
            onClick={(e) => {
              const o = w.options;
              if (
                o.hideTable &&
                (activeQuery?.state !== "ended" || !activeQuery.rowCount)
              ) {
                if (refRowCount) {
                  refRowCount.classList.remove("rubberBand");
                  void refRowCount.offsetWidth;
                  refRowCount.classList.add("rubberBand");
                }
              } else {
                w.$update(
                  { options: { hideTable: !o.hideTable } },
                  { deepMerge: true },
                );
              }
            }}
          />
          <Btn
            title={t.W_SQLBottomBar["Show/Hide code editor"]}
            iconPath={mdiChevronDown}
            style={{
              transform: `rotate(${hideCodeEditor ? 0 : 180}deg)`,
              transition: "transform .2s",
            }}
            onClick={toggleCodeEditor}
          />
          <Btn
            title={t.W_SQLBottomBar["Show/Hide notices"]}
            iconPath={mdiAlertOutline}
            color={noticeSub ? "action" : undefined}
            className="mr-1"
            disabledInfo={!db.sql ? SQL_NOT_ALLOWED : undefined}
            onClick={async (e) => {
              if (noticeSub) {
                await noticeSub.removeListener();
                onChangeState({
                  notices: undefined,
                  noticeSub: undefined,
                });
              } else if (db.sql) {
                const s = await db.sql(
                  "",
                  {},
                  { returnType: "noticeSubscription" },
                );
                const sub = s.addListener(noticeEventListener);
                onChangeState({ noticeSub: sub });
              }
            }}
          />
        </>
      )}
    </div>
  );
};

function hideKeyboard(element: HTMLElement) {
  if (element.nodeName !== "INPUT") {
    const field = document.createElement("input");
    field.setAttribute("type", "text");
    (element.parentElement || document.body).appendChild(field);

    setTimeout(function () {
      field.focus();
      setTimeout(function () {
        field.setAttribute("style", "display:none;");
        field.remove();
      }, 50);
    }, 50);
    return;
  }

  element.setAttribute("readonly", "readonly"); // Force keyboard to hide on input field.
  element.setAttribute("disabled", "true"); // Force keyboard to hide on textarea field.
  setTimeout(function () {
    element.blur(); //actually close the keyboard
    // Remove readonly attribute after keyboard is hidden.
    element.removeAttribute("readonly");
    element.removeAttribute("disabled");
  }, 100);
}
const toSecondsString = (v: number) => `${(v / 1000).toFixed(3) || 0}s`;
