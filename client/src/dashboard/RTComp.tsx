import React from "react";

export type DeepPartial<T> =
  T extends any[] ? T
  : T extends Record<string, any> ?
    {
      [P in keyof T & string]?: DeepPartial<T[P]>;
    }
  : T;

type CombinedPartial<P, S, D> = Partial<
  DeltaOf<P> & DeltaOf<S> & DeltaOfData<D>
>;

export type DeltaOfData<T> = T | DeepPartial<T> | undefined;
export type DeltaOf<T> = Partial<T> | undefined;

export default class RTComp<
  P = {},
  S = {},
  D = Record<string, any>,
> extends React.Component<P, S, D> {
  mounted = false;
  // private syncs: { [key: string]: any };
  state: S = {} as S;

  private p?: P;
  s?: S;
  d: Partial<D> = {} as D;

  async componentDidMount() {
    this.mounted = true;
    try {
      await this.onMount();
    } catch (e) {
      this.logAsyncErr("onMount", e);
    }
    try {
      this.setDeltaPS({ ...this.props }, { ...this.state });
    } catch (e) {
      this.logAsyncErr("setDeltaPS", e);
    }
  }
  onMount() {
    //empty
  }

  componentWillUnmount = () => {
    this.mounted = false;
    this.onUnmount();
  };

  /**
   * Should be used instead componentWillUnmount ensure this.mounted works as expected
   */
  onUnmount() {
    //empty
  }
  componentDidUpdate = async (prevProps, prevState) => {
    try {
      let deltaP, deltaS;
      Object.keys({ ...prevProps, ...this.props }).map((key) => {
        if (prevProps[key] !== this.props[key]) {
          deltaP = { ...deltaP, ...{ [key]: this.props[key] } };
        }
      });
      Object.keys({ ...prevState, ...this.state }).map((key) => {
        if (prevState[key] !== this.state[key]) {
          deltaS = { ...deltaS, ...{ [key]: this.state[key] } };
        }
      });

      if (deltaS || deltaP) {
        await this.setDeltaPS(deltaP, deltaS);
      }
      await this.onUpdated(prevProps, prevState);
    } catch (e) {
      this.logAsyncErr("onUpdated", e);
    }
  };
  onUpdated(prevProps: P, prevState: S) {
    //empty
  }

  setData = (deltaD: DeepPartial<D>, deepDeltaD?: DeepPartial<D>) => {
    this.d = { ...this.d, ...deltaD };
    try {
      this._onDelta(undefined, undefined, deepDeltaD || deltaD);
    } catch (e) {
      this.logAsyncErr("setData", e);
    }
  };
  private setDeltaPS = (deltaP?: Partial<P>, deltaS?: Partial<S>) => {
    // this.p = { ...this.p, ...deltaP };
    // this.s = { ...this.s, ...deltaS };
    this._onDelta(deltaP, deltaS, undefined);
  };

  private logAsyncErr = (methodName: string, e: any) => {
    console.error(
      `Uncaught promise within ${methodName} of <${this.constructor.name}/> component`,
      e,
    );
  };

  private _onDelta = (
    deltaP?: DeltaOf<P>,
    deltaS?: DeltaOf<S>,
    deltaD?: DeltaOfData<D>,
  ) => {
    (async () => {
      try {
        await this.onDelta(deltaP, deltaS, deltaD);
        const combinedDeltas: CombinedPartial<P, S, D> = {
          ...deltaP,
          ...deltaS,
          ...deltaD,
        } as any;
        await this.onDeltaCombined(
          combinedDeltas,
          Object.keys(combinedDeltas as any) as (keyof CombinedPartial<
            P,
            S,
            D
          > &
            string)[],
        );
      } catch (e) {
        const error = e instanceof Error ? e : new Error(e as any);
        this.logAsyncErr("onDelta", e);
        throw error;
      }
    })();
  };
  /**
   * Here we can use setState for anything that should trigger a render
   */
  onDelta(deltaP: DeltaOf<P>, deltaS: DeltaOf<S>, deltaD: DeltaOfData<D>) {
    //empty
  }
  /** Helper func */
  onDeltaCombined(
    delta: CombinedPartial<P, S, D>,
    deltaKeys: (keyof CombinedPartial<P, S, D> & string)[],
  ) {
    //empty
  }

  setState<K extends keyof S>(
    state:
      | ((prevState: Readonly<S>, props: Readonly<P>) => Pick<S, K> | S | null)
      | (Pick<S, K> | S | null),
    callback?: () => void,
  ): void {
    if (this.mounted) {
      try {
        return super.setState(state, callback);
      } catch (e) {
        console.error("setState error within " + this.constructor.name, e);
        throw e;
      }
    } else {
      // console.error("setState called before mounting")
    }
  }
}
