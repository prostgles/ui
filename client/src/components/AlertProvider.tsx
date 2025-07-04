import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import Popup, { type PopupProps } from "./Popup/Popup";

type AlertDialogProps = Pick<
  PopupProps,
  "children" | "footerButtons" | "title" | "subTitle"
>;

export type AlertContext = {
  addAlert: (props: AlertDialogProps | string) => void;
};

const AlertContext = createContext<AlertContext | undefined>(undefined);

export const AlertProvider = ({ children }: { children: React.ReactNode }) => {
  const [alerts, setAlerts] = useState<AlertDialogProps[]>([]);
  const removeFirstAlert = useCallback(() => {
    setAlerts((prevAlerts) => prevAlerts.slice(1));
  }, []);

  const addAlert: AlertContext["addAlert"] = useCallback((newAlert) => {
    setAlerts((prevAlerts) => [
      ...prevAlerts,
      typeof newAlert === "string" ? { children: newAlert } : newAlert,
    ]);
  }, []);

  const contextValue = useMemo(
    () => ({
      addAlert,
    }),
    [addAlert],
  );

  const alertProps = useMemo(() => alerts.at(0), [alerts]);
  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      {alertProps && (
        <Popup
          {...alertProps}
          onClose={removeFirstAlert}
          footerButtons={
            alertProps.footerButtons ?? [
              {
                label: "Close",
                color: "action",
                variant: "filled",
                onClick: removeFirstAlert,
              },
            ]
          }
        />
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};
