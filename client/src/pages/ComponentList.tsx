import React from "react";
import { FlexCol, FlexRow } from "../components/Flex";
import { mdiClock } from "@mdi/js";
import Btn from "../components/Btn";

export const ComponentList = () => {
  return (
    <FlexCol className="ComponentList f-1 min-w-0 p-2 o-auto">
      Buttons
      {[0, 1, 2, 3, 4].map((n) => (
        <FlexRow key={n} className={`bg-color-${n}`}>
          <FlexCol className="p-2">
            <Btn iconPath={mdiClock}>default</Btn>
            <Btn iconPath={mdiClock} color="action">
              default action
            </Btn>
            <Btn iconPath={mdiClock} color="danger">
              default danger
            </Btn>
          </FlexCol>
          <FlexCol className="p-2">
            <Btn iconPath={mdiClock} variant="faded">
              faded
            </Btn>
            <Btn iconPath={mdiClock} variant="faded" color="action">
              faded action
            </Btn>
            <Btn iconPath={mdiClock} variant="faded" color="danger">
              faded danger
            </Btn>
          </FlexCol>
          <FlexCol className="p-2">
            <Btn iconPath={mdiClock} variant="outline">
              outlined
            </Btn>
            <Btn iconPath={mdiClock} variant="outline" color="action">
              outlined action
            </Btn>
            <Btn iconPath={mdiClock} variant="outline" color="danger">
              outlined danger
            </Btn>
          </FlexCol>
          <FlexCol className="p-2">
            <Btn iconPath={mdiClock} variant="filled">
              filled
            </Btn>
            <Btn iconPath={mdiClock} variant="filled" color="action">
              filled action
            </Btn>
            <Btn iconPath={mdiClock} variant="filled" color="danger">
              filled danger
            </Btn>
          </FlexCol>
        </FlexRow>
      ))}
    </FlexCol>
  );
};
