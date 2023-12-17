import { AnyObject } from "prostgles-types";
import { useEffect, useState } from "react";
import { DBSSchema } from "../../../../commonTypes/publishUtils";
import { DBS } from "../Dashboard/DBS";
import { useEffectAsync } from "../DashboardMenu/DashboardMenuSettings";
import { useIsMounted } from "../Backup/CredentialSelector";

export { usePromise, useSubscribe, useIsMounted } from "prostgles-client/dist/react-hooks"; 

export const useMethods = (dbs: DBS, connection_id: string) => {
  
  const [methods, setMethods] = useState<(DBSSchema["published_methods"] & { access_control_methods: DBSSchema["access_control_methods"][] })[]>([]);
  
  const getIsMounted = useIsMounted();
  useEffectAsync(async () => {
    const filter: AnyObject = {
      connection_id, 
      // ...(!access_control_id? {} : { 
      //   $existsJoined: {
      //     access_control_methods: { 
      //       access_control_id 
      //     }
      //   } 
      // })
    };
    const sub = await dbs.published_methods.subscribe(filter, { select: { "*": 1, access_control_methods: "*" } }, methods => {
      if(!getIsMounted()){ 
        return;
      }
      setMethods(methods as any); 
    }); 
    return sub.unsubscribe; 
  }, []); 

  return methods;
}
/** Hook type test */
(() => {
  const v: DBS = 1 as any;
  
  const useBlabla = () => {
    //@ts-ignore
    const ac = useSubscribe(v.access_control.subscribeHook({}, { select: { connection_id: 1 } }));

    ac?.[0]?.database_id;
  }
})
  

type Unsubscribe = {
  unsubscribe: () => void;
}

type OnStateChange<S> = (newState: S) => void;
type Subscribe<S> = ((sc: OnStateChange<S>) => Unsubscribe)

export type ReactiveState<S> = {
  initialState: S;
  set: (newState: S) => void;
  get: () => S;
  subscribe: Subscribe<S>
}
export const createReactiveState = <S>(initialState: S | void, onChange?: (state: S) => void) => {
 
  const handler: {
    listeners: OnStateChange<S>[];
    currentState: S;
  } = {
    listeners: [],
    currentState: initialState as S
  }
  
  const rootReference: ReactiveState<S> = {
    subscribe: (listener) => {
      handler.listeners.push(listener)

      return {
        unsubscribe: () => {
          handler.listeners = handler.listeners.filter(l => l !== listener)
        }
      }
    },
    set: (newState: S) => { 
      handler.currentState = newState;
      handler.listeners.forEach(l => l(handler.currentState));
      onChange?.(newState);
    },
    initialState:  initialState as S,
    get: () => handler.currentState,
  }

  return rootReference;
};

export const useReactiveState = <S>(store: ReactiveState<S>) => {
  const [state, setState] = useState(store.get());
  useEffect(() => {
    return store.subscribe(newState => {
      setState(newState)
    }).unsubscribe
  }, [store])

  return { state, setState }
}