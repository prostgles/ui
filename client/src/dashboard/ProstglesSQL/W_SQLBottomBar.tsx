import { mdiAlertOutline, mdiCancel, mdiInformation, mdiPlay, mdiPlayCircleOutline, mdiStopCircleOutline, mdiTable } from "@mdi/js"; 
import { DBHandler } from "prostgles-types";
import React, { useEffect, useRef, useState } from "react"
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { FlexRow } from "../../components/Flex"; 
import Loading from "../../components/Loading";
import { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { CopyResultBtn } from "./CopyResultBtn"; 
import W_SQL, { Counter, ProstglesSQLState, SQL_NOT_ALLOWED } from "./W_SQL";
import { dataCommand } from "../../Testing";
import Popup from "../../components/Popup/Popup";
import ButtonGroup from "../../components/ButtonGroup";
import { SwitchToggle } from "../../components/SwitchToggle";
import PopupMenu from "../../components/PopupMenu";
import { InfoRow } from "../../components/InfoRow";
import { useReactiveState } from "../ProstglesMethod/hooks";

export const includes = <T extends string, ArrV extends T,>(v: T | undefined, arr: ArrV[]): v is ArrV => arr.includes(v as ArrV);

type P = {
  killQuery: (terminate: boolean) => void;
  db: DBHandler;
  runSQL: W_SQL["runSQL"];
  streamData: W_SQL["streamData"];
  noticeEventListener: W_SQL["noticeEventListener"];
  w: WindowSyncItem<"sql">;
  onChangeState: (newState: Pick<ProstglesSQLState, "noticeSub" | "notices" | "notifEventSub">) => void;
} & Pick<ProstglesSQLState, "loadingSuggestions" | "cols" | "rows" | "noticeSub" | "activeQuery" | "queryEnded" | "notifEventSub">;

export const W_SQLBottomBar = ({
  db, killQuery, runSQL, w, activeQuery,
  notifEventSub, 
  cols, loadingSuggestions, noticeSub, 
  noticeEventListener, onChangeState, streamData
}: P) => {
  const myRef = useRef<HTMLDivElement>(null);
  const refRowCount = myRef.current;
  const [showRunOptions, setShowRunOptions] = useState<HTMLElement | null>(null);
  const [loopMode, setLoopMode] = useState({ show: false, seconds: 0, enabled: false });

  const { state: { rows } } = useReactiveState(streamData);

  useEffect(() => {
    if(!loopMode.enabled || !loopMode.seconds) return;

    const interval = setInterval(runSQL, loopMode.seconds * 1e3);

    return () => clearInterval(interval);
  }, [loopMode.enabled, loopMode.seconds, runSQL]);

  const stopQuery = (terminate: boolean) => {
    killQuery(terminate);
    setLoopMode({ ...loopMode, enabled: false, show: false, seconds: 0 })
  }

  const duration = activeQuery?.state === "running" ? Date.now() - activeQuery.started.getTime() : activeQuery?.state === "ended" ? activeQuery.ended.getTime() - activeQuery.started.getTime() : 0;

  return <div className={"flex-row text-gray-400 ai-center text-sm o-auto "} style={{ borderTop: "1px solid #0000000d" }}>
    {showRunOptions && 
      <Popup contentClassName="flex-col gap-1 p-p5"
        positioning="beneath-left"
        anchorEl={showRunOptions} 
        clickCatchStyle={{ opacity: 0 }}
        onClose={() => setShowRunOptions(null)}
      >
        <ButtonGroup 
          label={"Execution mode"} 
          value={w.sql_options.executeOptions ?? "block"} 
          options={["full", "block", "smallest-block"]} 
          onChange={executeOptions => w.$update({ sql_options: { executeOptions } }, { deepMerge: true })}
        />
        <SwitchToggle 
          label={"Loop query execution"}
          checked={loopMode.enabled}
          onChange={() => {
            setLoopMode({ ...loopMode, show: true });
            setShowRunOptions(null);
          }}
        />
      </Popup>
    }
    {activeQuery?.state === "running" ?
      <>
        <Btn 
          size="medium" 
          color="action"
          iconPath={mdiStopCircleOutline}
          title="Cancel this query (Esc)" 
          { ...dataCommand("dashboard.window.cancelQuery")}
          loading={activeQuery.stopped?.type === "cancel"}
          onClick={() => {
            stopQuery(false);
          }}
        >Cancel</Btn>
        <Btn 
          size="medium" 
          title="Terminate this query" 
          { ...dataCommand("dashboard.window.terminateQuery")}
          color="danger" 
          iconPath={mdiCancel} 
          loading={activeQuery.stopped?.type === "terminate"}
          onClick={() => {
            stopQuery(true);
          }}
        >Terminate</Btn>
        <Counter 
          title="Query running time" 
          className="p-p5 mr-1 noselect"
          from={activeQuery.started} 
        />
      </>
      :
      <>
        {notifEventSub ?
          <Btn title="Stop LISTEN" 
            size="medium" 
            color="action" 
            iconPath={mdiStopCircleOutline}
            { ...dataCommand("dashboard.window.stopListen")}
            onClick={async () => {
              await notifEventSub.removeListener();
              onChangeState({ notifEventSub: undefined })
            }}
            fadeIn={true}
          >Stop LISTEN</Btn> :
          loopMode.show? <FlexRow>
            <Btn color={loopMode.enabled? "action" : undefined} iconPath={mdiCancel} onClick={() => setLoopMode({ ...loopMode, show: false, enabled: false }) } />
            <label>repeat every</label>
            <input {...{ min: 0, max: 20, step: 0.1 }} type="number" style={{ fontSize: "12px" }} value={loopMode.seconds} onChange={v => setLoopMode({ ...loopMode, enabled: true, seconds: +v.target.value })} />
            <label>seconds</label>
          </FlexRow> :
          <Btn
            { ...dataCommand("dashboard.window.runQuery")}
            className="ml-p25"
            color="action"
            title="Run query (CTRL+E, ALT+E)"
            disabledInfo={!db.sql ? SQL_NOT_ALLOWED : undefined}
            size="medium"
            iconPath={mdiPlay}
            onClick={e => {
              runSQL();
              hideKeyboard(e.currentTarget);
            }}
            onContextMenu={e => {
              e.preventDefault();
              setShowRunOptions(e.currentTarget);
            }}
            fadeIn={true}
          >Run</Btn>
        }
        {activeQuery?.state === "ended" && !loopMode.show && 
          <div className="p-p5 mr-1 noselect fade-in"
            title={`Query running time: ${toSecondsString(duration)}`}
          >
            {notifEventSub ? "LISTEN..." : toSecondsString(duration)}
          </div>
        }
      </>

    }

    {activeQuery && activeQuery?.state !== "error" && cols && rows && 
      <div ref={myRef}
        className="flex-row gap-p5 ai-center p-p5 noselect"
        style={{ marginRight: "1em" }}
      >
        <div className="text-1" >
          {(activeQuery.state === "running"? rows.length : activeQuery.rowCount).toLocaleString()} rows
        </div>
        {activeQuery.state === "ended" && activeQuery.rowCount === w.limit && 
          <PopupMenu 
            contentClassName="p-1"
            positioning="above-center"
            footerButtons={[
              { label: "Remove limit", color: "action", variant: "filled", onClick: () => w.$update({ limit: null }) },
            ]}
            button={
              <Btn 
                iconPath={mdiAlertOutline} 
                size="small" 
                color="warn" 
              />
            } 
            render={() => 
              <InfoRow variant="naked">
                Limit was reached
              </InfoRow>
            } 
          />}
        {activeQuery?.state === "ended" && <CopyResultBtn cols={cols} rows={rows} sql={db.sql!} />}
      </div>
    }

    {loadingSuggestions && <Loading message="Loading suggestions" />}

    {w.sql_options.errorMessageDisplay !== "tooltip" &&
      <ErrorComponent
        noScroll={true}
        error={activeQuery?.state === "error"? activeQuery.error?.message : ""}
        color={activeQuery?.state === "error" && !activeQuery.stopped ? "info" : undefined}
        style={{ padding: "1em", fontSize: "16px", whiteSpace: "pre" }}
      />
    }

    <div 
      className="ml-auto flex-row ai-center " 
      style={{ marginRight: "1em" }} 
      title="Clear value to show all rows" 
    >
      <label className="mr-p5">Limit</label>
      <input id={"dd" + w.limit}
        type="number"
        style={{ width: "55px" }}
        min={1}
        max={1000}
        step={1}
        className="text-0 b b-text-2 bg-1 rounded p-p25"
        defaultValue={w.limit ?? ""}
        onChange={({ target: { value } }) => {
          const limit = value.length ? +value : -1;
          if (!Number.isInteger(limit) || limit < 1) {
            w.$update({ limit: null })
          } else {
            w.$update({ limit })
          }
        }}

      />
    </div>
    <Btn title="Show/Hide table"
      iconPath={mdiTable}
      className="mr-1"
      onClick={e => {
        const o = w.options;
        if (o.hideTable && (activeQuery?.state !== "ended" || !activeQuery.rowCount)) {
          if (refRowCount) {
            refRowCount.classList.remove("rubberBand");
            void refRowCount.offsetWidth;
            refRowCount.classList.add("rubberBand");
          }
        } else {
          w.$update({ options: { hideTable: !o.hideTable } }, { deepMerge: true })
        }
      }}
    />
    <Btn title="Show/Hide notices"
      iconPath={mdiAlertOutline}
      color={noticeSub ? "action" : undefined}
      className="mr-1"
      disabledInfo={!db.sql ? SQL_NOT_ALLOWED : undefined}
      onClick={async e => {
        if (noticeSub) {
          await noticeSub.removeListener();
          onChangeState({
            notices: undefined,
            noticeSub: undefined
          })
        } else if (db.sql) {
          const s = await db.sql("", {}, { returnType: "noticeSubscription" });
          const sub = s.addListener(noticeEventListener);
          onChangeState({ noticeSub: sub })
        }
      }}
    />
  </div>
}



function hideKeyboard(element: HTMLElement) {

  if (element.nodeName !== "INPUT") {
    const field = document.createElement('input');
    field.setAttribute('type', 'text');
    (element.parentElement || document.body).appendChild(field);

    setTimeout(function () {
      field.focus();
      setTimeout(function () {
        field.setAttribute('style', 'display:none;');
        field.remove();
      }, 50);
    }, 50);
    return;
  }

  element.setAttribute('readonly', 'readonly'); // Force keyboard to hide on input field.
  element.setAttribute('disabled', 'true'); // Force keyboard to hide on textarea field.
  setTimeout(function () {
    element.blur();  //actually close the keyboard
    // Remove readonly attribute after keyboard is hidden.
    element.removeAttribute('readonly');
    element.removeAttribute('disabled');
  }, 100);
}
const toSecondsString = (v: number) => `${(v / 1000).toFixed(3) || 0}s`;