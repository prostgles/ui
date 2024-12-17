import React, { useEffect, useState } from "react";

type P = React.HTMLProps<HTMLInputElement> & {
  onNumLockAlert?: (show: boolean) => void;
};

export const Input = React.forwardRef<HTMLInputElement, P>((props, ref) => {
  const { className = "", style = {}, onNumLockAlert, ...otherProps } = props;

  const [showNumLock, setShowNumLock] = useState(false);
  useEffect(() => {
    onNumLockAlert?.(showNumLock);
  }, [showNumLock, onNumLockAlert]);

  return (
    <input
      {...otherProps}
      style={style}
      className={"custom-input rounded " + className}
      ref={(e) => {
        if (e) {
          // @ts-ignore
          if (ref) ref(e);
          setTimeout(() => {
            if (props.autoFocus && document.activeElement !== e) {
              e.focus();
              e.select();
            }
          }, 40);

          // @ts-ignore
          e.forceDemoValue = (val: any) => {
            // @ts-ignore
            props.onChange?.({ currentTarget: { value: val } });
          };
        }
      }}
      onKeyDown={
        props.type === "number" ?
          (e) => {
            const numLockAlert =
              !e.getModifierState("NumLock") &&
              e.nativeEvent.code.startsWith("Numpad") &&
              e.key !== e.nativeEvent.code.slice(0, "Numpad".length); //(NUMLOCK_KEYS.includes(e.key) || !e.currentTarget.value && ["ArrowRight", "ArrowLeft"].includes(e.key) )
            if (numLockAlert !== showNumLock) {
              setShowNumLock(numLockAlert);
            }
            props.onKeyDown?.(e);
            const node = e.target as HTMLInputElement;
            if (!/^-?\d+$/.test(props.value as any)) {
              node.placeholder = "Numbers only";
              setTimeout(() => {
                if (!node.isConnected) return;
                node.placeholder = otherProps.placeholder ?? "";
              }, 1000);
            }
          }
        : otherProps.onKeyDown
      }
    />
  );
});
