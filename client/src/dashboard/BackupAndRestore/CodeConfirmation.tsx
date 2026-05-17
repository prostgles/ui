import React, { useEffect, useMemo, useState } from "react";
import Btn, { type BtnProps } from "@components/Btn";
import FormField from "@components/FormField/FormField";
import Loading from "@components/Loader/Loading";
import type { PopupProps } from "@components/Popup/Popup";
import PopupMenu from "@components/PopupMenu";
import type { TestSelectors } from "../../Testing";
import { useIsMounted } from "prostgles-client";

export type CodeConfirmationProps = TestSelectors & {
  button: React.ReactNode;
  message: React.ReactNode | (() => Promise<React.ReactNode>);
  confirmButtons: Pick<
    BtnProps,
    | "title"
    | "className"
    | "children"
    | "iconPath"
    | "variant"
    | "onClickPromise"
    | "color"
    | "data-command"
  >[];
  topContent?: (popupClose: VoidFunction) => React.ReactNode;
  title?: React.ReactNode;
  bypassConfirmation?: boolean;
  className?: string;
  style?: React.CSSProperties;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  hideConfirm?: boolean;
  positioning?: PopupProps["positioning"];
  fixedCode?: string;
};
const getCode = () => Math.random().toFixed(3).slice(2, 5);
export const CodeConfirmation = ({
  button,
  confirmButtons,
  message: rawMessage,
  bypassConfirmation,
  topContent,
  className,
  style,
  contentClassName = "",
  contentStyle,
  hideConfirm = false,
  title,
  positioning = "beneath-left",
  fixedCode,
  ...testSelectors
}: CodeConfirmationProps) => {
  const [message, setMessage] = useState<React.ReactNode>();

  const getIsMounted = useIsMounted();
  useEffect(() => {
    if (typeof rawMessage === "function") {
      void (async () => {
        const message = await rawMessage();
        if (!getIsMounted()) return;
        setMessage(message);
      })();
    } else {
      setMessage(rawMessage);
    }
  }, [rawMessage, getIsMounted]);

  const [key, setKey] = useState(getCode());
  const [hasConfirmed, setHasConfirmed] = useState(false);

  const confirmButtonsFullProps = useMemo(
    () =>
      confirmButtons.map(
        (confirmButton) =>
          ({
            ...confirmButton,
            onClickPromise: async (e) => {
              await confirmButton.onClickPromise?.(e);
            },
          }) satisfies BtnProps,
      ),
    [confirmButtons],
  );

  if (bypassConfirmation) {
    return (
      <>
        {confirmButtonsFullProps.map((btnProps, i) => (
          <Btn key={i} {...btnProps} />
        ))}
      </>
    );
  }

  return (
    <PopupMenu
      key={key}
      title={title}
      className={className}
      style={style}
      button={button}
      {...testSelectors}
      initialState={{ ok: false, code: key, confirmCode: "" }}
      positioning={positioning}
      onClose={() => {
        setKey(getCode());
      }}
      clickCatchStyle={{ opacity: 1 }}
      contentClassName="p-1"
      render={(_popupClose) => {
        const popupClose = () => {
          if (!getIsMounted()) return;
          setKey(getCode());
          setHasConfirmed(false);
        };
        return (
          <div
            className={
              "flex-col gap-1 ai-start o-auto p-p25 " + contentClassName
            }
            style={contentStyle}
          >
            {topContent?.(popupClose)}

            {!hideConfirm && (
              <>
                {message ?? <Loading />}
                <CodeChecker
                  key={key}
                  fixedCode={fixedCode}
                  onChange={setHasConfirmed}
                />
                <div className="flex-row gap-1 ai-center mt-1  w-full">
                  <Btn onClick={popupClose} variant="outline" size="default">
                    Close
                  </Btn>
                  <>
                    {confirmButtonsFullProps.map((btnProps, i) => (
                      <Btn
                        key={i}
                        size="default"
                        {...btnProps}
                        onClickPromise={async (...args) => {
                          await btnProps.onClickPromise(...args);
                          popupClose();
                        }}
                        disabledInfo={
                          !hasConfirmed ?
                            "Must confirm the code above"
                          : undefined
                        }
                      />
                    ))}
                  </>
                </div>
              </>
            )}
          </div>
        );
      }}
    />
  );
};

type CodeCheckerProps = Pick<
  CodeConfirmationProps,
  "style" | "className" | "fixedCode"
> & {
  onChange: (hasConfirmed: boolean) => void;
};
export function CodeChecker({
  className,
  style,
  onChange,
  fixedCode,
}: CodeCheckerProps): JSX.Element {
  const [code] = useState(fixedCode ?? getTextCode());
  const [confirmCode, setConfirmCode] = useState("");

  return (
    <div className={"flex-col " + (className ?? "")} style={style}>
      <p>
        <span className="noselect">Confirm by typing this: </span>
        <strong title="confirmation-code">{code}</strong>
      </p>
      <FormField
        name="confirmation"
        value={confirmCode}
        onChange={(val) => {
          setConfirmCode(val);
          onChange(val === code);
        }}
      />
    </div>
  );
}

const getTextCode = () => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  return [Math.random(), Math.random(), Math.random()]
    .map((rand) => {
      const randomCharacter = alphabet[Math.floor(rand * alphabet.length)];
      return randomCharacter;
    })
    .join("");
};
