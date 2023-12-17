import { TableHandlerClient } from "prostgles-client/dist/prostgles";
import { TableHandler, SubscriptionHandler } from "prostgles-types";
import React from "react";
import { Unpromise } from "./W_Table/TableMenu/W_TableMenu";
import RTComp from "./RTComp";

type DBH = Record<string, TableHandlerClient>;// | Omit<DBS, "sql">;

type DataSpec<DB extends DBH> = {
  [key in keyof DB as DB[key] extends { find: Function } ? key : never]: {
    filter?: Parameters<DB[key]["find"]>[0];
    select?: Parameters<DB[key]["find"]>[1];
    limit?: number;
  }
}

type GetDataType<D extends DataSpec<DB>, DB extends DBH> = {
  [key in keyof D]: D[key]["limit"] extends 1? Unpromise<ReturnType<DB[key]["findOne"]>> : Unpromise<ReturnType<DB[key]["find"]>>
};

type WithDataProps<D extends DataSpec<DB>, S, DB extends DBH> = {
  dbs: DB;
  data: D;
  defaultState?: S
  onRender: (data: GetDataType<D, DB>, state: S, setState: (newState: S) => any) => React.ReactNode;
  onData?: (data: GetDataType<D, DB>, state: S, setState: (newState: S) => any) => any;
}
type WithDataState = {
  data: any;
  state?: any;
}
export default class WithData<D extends DataSpec<DB>, S, DB extends DBH> extends RTComp<WithDataProps<D, S, DB>, WithDataState> {

  state: WithDataState = {
    data: {},
  }

  dataStr: string = "";
  subs: Record<string, SubscriptionHandler> = {}
  async onDelta(deltaP?: Partial<WithDataProps<D, S, DB>>, deltaS?: Partial<WithDataState>, deltaD?: Partial<{ [x: string]: any; }>) {
    
    if(deltaP){
      const { data, dbs, onData } = this.props;
      const dataStr = JSON.stringify(this.props.data);
      if(this.dataStr !== dataStr){
        this.dataStr = dataStr;

        for await (const sub of Object.values(this.subs)){
          sub.unsubscribe();
        }
        for await (const key of Object.keys(data ?? {})){
          const limit = Number.isFinite(data[key]?.limit )? { limit: data[key]?.limit } : {};
          const select = Number.isFinite(data[key]?.select )? { select: data[key]?.select } : {};
          const filter = data[key]?.filter || {};

          const sub = await dbs[key]?.subscribe(filter, { ...select, ...limit }, items => {
            const newData = {
                ...this.state.data,
                [key]: data[key]?.limit === 1? items[0] : items
              };
            if(!this.mounted) return;
            onData?.(newData, this.state.state, ns => this.setState({ state: ns }))
            this.setState({
              data: newData
            })
          });
          if(sub){
            this.subs[key] = sub;
          }
        }
      }
    }
  }

  render(){
    const { onRender, defaultState = {} } = this.props;
    const { data, state = defaultState } = this.state;

    return onRender(data, state, newState => this.setState({ state: newState }));
  }
}