import React from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { ActionButton } from "../W_Table/ColumnMenu/ColumnDisplayFormat/ActionButton";

export const InviteUser = () => {
  const { dbsMethodSchema } = usePrglCore();
  const method = dbsMethodSchema.inviteUser;
  return method ? <ActionButton method={method} /> : null;
};
