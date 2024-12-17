import { mdiArrowLeft } from "@mdi/js";
import React from "react";
import Btn from "../components/Btn";
import { FlexCol } from "../components/Flex";

export const NotFound = () => {
  return (
    <FlexCol className="bg-color-0 ai-center p-2 f-1" data-command="NotFound">
      <div className="p-1">404 page not found</div>
      <Btn
        asNavLink={true}
        href="/"
        iconPath={mdiArrowLeft}
        color="action"
        variant="filled"
        data-command="NotFound.goHome"
      >
        Home
      </Btn>
    </FlexCol>
  );
};
