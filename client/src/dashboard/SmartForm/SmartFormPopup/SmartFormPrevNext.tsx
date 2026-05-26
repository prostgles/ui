import Btn from "@components/Btn";
import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import React from "react";
import type { useSmartFormPrevNext } from "./useSmartFormPrevNext";

export const SmartFormPrevNext = (
  state: ReturnType<typeof useSmartFormPrevNext>,
) => {
  if (!state) return null;
  const { onPrevOrNext, prevNext } = state;
  return (
    <>
      <Btn
        iconPath={mdiChevronLeft}
        disabledInfo={prevNext?.prev === false ? "Reached end" : undefined}
        data-command="SmartForm.header.previousRow"
        onClick={({ currentTarget }) => {
          currentTarget.focus();
          onPrevOrNext(-1);
        }}
      />
      <Btn
        iconPath={mdiChevronRight}
        data-command="SmartForm.header.nextRow"
        disabledInfo={prevNext?.next === false ? "Reached end" : undefined}
        onClick={({ currentTarget }) => {
          currentTarget.focus();
          onPrevOrNext(1);
        }}
      />
    </>
  );
};
