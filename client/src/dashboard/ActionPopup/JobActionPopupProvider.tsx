import React, { createContext, useContext, useState } from "react";
import { JobActionPopup, type JobActionPopupProps } from "./JobActionPopup";

const JobActionPopupContext = createContext<
  ((props: Omit<JobActionPopupProps, "onClose">) => void) | undefined
>(undefined);

export const JobActionPopupProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [popup, setPopup] = useState<Omit<JobActionPopupProps, "onClose">>();
  return (
    <JobActionPopupContext.Provider value={setPopup}>
      {children}
      {popup && (
        <JobActionPopup {...popup} onClose={() => setPopup(undefined)} />
      )}
    </JobActionPopupContext.Provider>
  );
};

export const useOpenJobActionPopup = () => {
  const openPopup = useContext(JobActionPopupContext);
  if (!openPopup) {
    throw new Error("useOpenJobActionPopup requires a JobActionPopupProvider");
  }
  return openPopup;
};
