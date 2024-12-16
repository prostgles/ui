import React, { useState } from "react";

type ExpanderProps = {
  style?: React.CSSProperties;
  className?: string;
  getButton: (isOpen: boolean) => React.ReactChild;
  children: React.ReactNode;
};
function Expander({ children, getButton }: ExpanderProps) {
  const [isOpen, setOpen] = useState(false);

  return (
    <>
      <span onClick={() => setOpen(!isOpen)}>{getButton(isOpen)}</span>
      {isOpen && children}
    </>
  );
}

export default Expander;
