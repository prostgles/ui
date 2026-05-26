import React, { useState } from "react";

type ExpanderProps = {
  getButton: (isOpen: boolean) => React.ReactChild;
  children: React.ReactNode;
};
export const Expander = ({ children, getButton }: ExpanderProps) => {
  const [isOpen, setOpen] = useState(false);

  return (
    <>
      <span onClick={() => setOpen(!isOpen)}>{getButton(isOpen)}</span>
      {isOpen && children}
    </>
  );
};
