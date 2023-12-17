import { mdiCheck, mdiCheckCircleOutline, mdiTable } from "@mdi/js";
import React from "react";
import Loading from "../../components/Loading";
import Btn from "../../components/Btn";
import { getJoinTree, JoinTree } from "../SmartFilter/SmartFilter";
import { CommonWindowProps, DashboardState } from "../Dashboard/Dashboard";
import RTComp from "../RTComp";
import SearchList from "../../components/SearchList";

type P = {
  tableName: string;
  tables: CommonWindowProps["tables"];
  onSelect?: (path: string[], jpath: JoinTree[]) => any;
  variant?: "hover";

  className?: string;
  style?: React.CSSProperties;
  onLinkTable?: (tableName: string, path: string[]) => any;
}

type S = {
  jpath: JoinTree[];
  joins?: JoinTree[];
  j?: JoinTree;
}

export default class JoinPathSelector extends RTComp<P, S> {
  state: S = {
    jpath: []
  }

  static hasJoins(
    tableName: string,
    tables: CommonWindowProps["tables"]
  ){
    return Boolean(
      tables.find(t => 
        t.name === tableName && t.columns.find(c => c.references) ||
        t.name !== tableName && t.columns.find(c => c.references?.some(r => r.ftable === tableName))
      )
    );
  }

  onDelta(){
    const { tables, tableName } = this.props;

    if(tableName && !this.state.joins){
      this.setState({
        joins: getJoinTree({ tables, tableName })
      })
    }
  }

  render() {
    const { jpath, joins: js, j } = this.state;
    const { onSelect, className = "", style = {}, tableName, onLinkTable } = this.props;

    let joins = js;
    if(j){
      joins = j.joins
    }

    if(!js) return <Loading />

    const setpath = (_jpath: JoinTree[], j?: JoinTree) => {
      this.setState({ jpath: _jpath, j })
      onSelect?.(_jpath.map(j => j.table), _jpath);
    }

    const _header = jpath.map((j, i)=> (
      <div key={i} className="flex-col " style={{ marginLeft: `${i*5 + 5}px`}}>
        <div className={"flex-col p-p25 font-bold " + 
            (i === jpath.length - 1? "" : " pointer  text-hover ")
          }
          style={{ marginLeft: `${(i+1)*5}px`}}
          onClick={i === jpath.length - 1? undefined : () => {
            const idx = jpath.findIndex(_j => _j.table === j.table);
            const _jpath = jpath.slice(0, idx + 1);
            setpath(_jpath, j)
          }}
        >
          
          <div className="ws-pre"><span className="text-1p5 ">INNER JOIN </span> {JSON.stringify(j.table)}</div>
          <div className="flex-row p-p25 text-1p5" style={{ marginLeft: `${(i-1)*5}px`}}>ON {j.on.map(c => c.join(" = ")).join(" AND")}</div>
        </div>
      </div>
    ));
    const header = !jpath.length? null : <div className="flex-col ta-left">
      {/* <div className="flex-row p-p5 text-1p5 p-p25 bold font-18" >Current path:</div> */}
      <div className="flex-row p-p25 pointer text-hover ws-pre  bold" 
        onClick={() => {
          setpath([], undefined)
        }}
      >
        <span className="text-1p5 ">FROM </span> {JSON.stringify(tableName)}
      </div>
      {_header}
    </div>

    let selector: React.ReactNode = null;
    if(joins?.length){
      selector = <SearchList
        style={{
          backgroundColor: "transparent"
        }}
        className={""}
        id="link-menu"
        noSearchLimit={15}
        items={joins.map(j => ({
          key: j.table,
          label: j.table,
          styles: {
            label: { color: "var(--blue-700)" },
            subLabel: { color: "var(--blue-500)" },
          },
          subLabel: ` (${j.on.flatMap(c => c[0] + " = " + c[1]).join(", ")})`,
          onPress: () => {
            const _jpath = [...jpath, j];
            setpath(_jpath, j)
          }
        }))}
     />;

    }

    const linkTablePath = jpath.map(j => j.table);
    const ftable = linkTablePath[linkTablePath.length - 1];

    let contentMiddle: React.ReactNode = null;
    if(onLinkTable && ftable){
      contentMiddle = <div className="flex-col w-fit">
        <Btn 
          iconPath={mdiCheck}
          variant="filled"
          color="action" 
          className=" m-1"
          onClick={() => {
            onLinkTable(ftable, linkTablePath);
          }}
        >
          Join to {JSON.stringify(ftable)}
        </Btn>
        {selector && <div className="mt-p5">or</div>}
      </div>
    }

    return <div className={"flex-col gap-1 noselect " + className} style={style}>
      {header && <div className="p-1">
        {header}
      </div>}
      {contentMiddle}
      {selector && <div className="flex-col  bg-bldue-50  ">
        {!!jpath.length && <div className="flex-row p-p5 bold font-18 p-1 text-1p5" >Join to</div>}
        {selector}
      </div>}
    </div>

  }
}