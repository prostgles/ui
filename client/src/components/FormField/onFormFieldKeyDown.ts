import { getStringFormat } from "../../utils";
import type FormField from "./FormField";

export function onFormFieldKeyDown(
  this: FormField,
  e: React.KeyboardEvent<HTMLDivElement>,
  selectSuggestion: (key: any) => void,
) {
  const { suggestions, activeSuggestionIdx = 0 } = this.state;
  const { value, onSuggest, type = "text" } = this.props;

  const setSuggestions = async () => {
    const { value, onSuggest } = this.props;
    if (onSuggest) {
      const suggestions = await onSuggest(value);
      this.setState({ suggestions });
    }
  };

  if (
    ["text", "search"].includes(type) &&
    document.activeElement?.nodeName === "INPUT" &&
    this.refWrapper?.contains(document.activeElement)
  ) {
    if (e.key === "Enter") {
      if (suggestions?.length && activeSuggestionIdx > -1) {
        selectSuggestion(suggestions[activeSuggestionIdx]);
      } else if (suggestions) {
        this.setState({ suggestions: undefined });
      }
    } else if (["ArrowUp", "ArrowDown"].includes(e.key)) {
      if (!suggestions?.length) {
        if (["ArrowDown"].includes(e.key) && !value && onSuggest) {
          setSuggestions();
        } else {
          const inpt = document.activeElement as HTMLInputElement;
          if (typeof inpt.selectionStart !== "number") return;
          this.cursorPosition = inpt.selectionStart;
          const value = inpt.value;
          const f = getStringFormat(value);
          const selStart = inpt.selectionStart;
          const selF = f.find(
            (f) =>
              f.type === "n" && f.idx <= selStart && f.idx + f.len >= selStart,
          );

          if (selF) {
            this.inputSelStart = selStart;
            let removeMinusAtIndex = -1;
            const up = e.key === "ArrowUp";
            let newValue = f
              .map((f) => {
                if (f.idx === selF.idx) {
                  const step =
                    e.altKey ? 0.1
                    : e.ctrlKey ? 10
                    : 1;
                  const incrDecimals = e.altKey ? 1 : 0;
                  const isNegative = value[selF.idx - 1] === "-";
                  const increment =
                    (up ?
                      isNegative ? -1
                      : 1
                    : isNegative ? 1
                    : -1) * step;
                  const val = +(selF.val as string)
                    .split(".")
                    .map((v, i, arr) => {
                      const newVal = i < arr.length - 1 ? v : +v + increment;
                      return newVal;
                    })
                    .join(".");

                  let res = val
                    .toFixed(selF.decimalPlaces || incrDecimals)
                    .padStart(selF.len, "0");
                  if (res.startsWith("-") && isNegative) {
                    res = res.slice(1);
                  }
                  if (isNegative && val === 0) {
                    removeMinusAtIndex = selF.idx - 1;
                  }
                  if (
                    selF.decimalPlaces &&
                    res.endsWith(
                      "." + new Array(selF.decimalPlaces).fill("0").join(""),
                    )
                  ) {
                    res = res.slice(0, -selF.decimalPlaces - 1);
                  }
                  return res;
                }
                return f.val;
              })
              .join("");
            if (removeMinusAtIndex > -1) {
              newValue =
                newValue.substring(0, removeMinusAtIndex) +
                newValue.substring(removeMinusAtIndex + 1);
            }
            inpt.value = newValue;
            this.onChange(inpt);
          } else {
            this.inputSelStart = undefined;
          }
        }
      } else {
        let increment = -1;
        if (["ArrowDown"].includes(e.key)) {
          increment = 1;
        }

        let newSugIdx =
          Number.isFinite(activeSuggestionIdx) ?
            Math.max(0, activeSuggestionIdx + increment)
          : 0;
        if (newSugIdx > suggestions.length - 1) newSugIdx = 0;
        this.setState({ activeSuggestionIdx: newSugIdx });
      }
      e.preventDefault();
      e.stopPropagation();
    }
  }
}
