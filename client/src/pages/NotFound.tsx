import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useIsMounted } from "../dashboard/Backup/CredentialSelector";

function NotFound() {

  const [show, setShow] = useState(false);
  const getIsMounted = useIsMounted();

  useEffect(() => {
    setTimeout(() => {
      if(!getIsMounted()) return;
      
      setShow(true)
    }, 1000)
  }, [setShow, getIsMounted]);

  if(!show) return null

  return (
    <div className="bg-color-0 ta-center p-2 f-1 flex-col">
      <div className="p-1">404 page not found</div>
      <NavLink to="/">Home</NavLink>
    </div>
  );
}

export default NotFound;