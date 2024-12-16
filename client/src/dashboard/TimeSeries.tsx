import React from "react";
import RTComp from "./RTComp";

type P = {
  layers: {
    label: string;
    color: string;
    width: number;
    data: {
      time: number;
      value: number;
    }[];
  }[];
};

export default class TimeSeries extends RTComp<P, any> {
  ref?: HTMLDivElement;
  canv?: HTMLCanvasElement;
  deck?: any;
  onMount() {
    if (this.ref) {
    }
  }

  render() {
    const { layers } = this.props;
    return <div className={"timeseries-comp f-1 relative bg-color-0"}></div>;
  }
}
