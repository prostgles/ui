import type { PopupProps } from "@components/Popup/Popup";
import type { SmartFormProps } from "../SmartForm";

type P = Pick<SmartFormProps, "onPrevOrNext" | "prevNext">;
export const useSmartFormPrevNext = ({ onPrevOrNext, prevNext }: P) => {
  if (!onPrevOrNext) {
    return;
  }
  const onKeyDown: PopupProps["onKeyDown"] = (e, section) => {
    if (section === "content") return;

    if (e.key === "ArrowLeft") {
      onPrevOrNext(-1);
    }
    if (e.key === "ArrowRight") {
      onPrevOrNext(1);
    }
  };
  return { onKeyDown, onPrevOrNext, prevNext };
};
