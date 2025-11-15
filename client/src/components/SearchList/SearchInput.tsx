import { mdiFormatLetterCase } from "@mdi/js";
import React from "react";
import type { TestSelectors } from "../../Testing";
import Btn from "../Btn";
import { classOverride, FlexRow } from "../Flex";
import { Input } from "../Input";
import Loading from "../Loader/Loading";

export const SearchInputZIndex = 2;

export type SearchInputProps = Pick<
  React.HTMLProps<HTMLInputElement>,
  "type" | "title"
> &
  TestSelectors & {
    placeholder?: string;
    className?: string;
    wrapperStyle?: React.CSSProperties;
    onClickWrapper?: (e: React.MouseEvent<HTMLDivElement>) => void;
    style?: React.CSSProperties;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    withShadow: boolean | undefined;
    isLoading?: boolean;
    matchCase?: {
      value: boolean;
      onChange: (value: boolean) => void;
    };
    inputWrapperRef?: React.LegacyRef<HTMLDivElement>;
    inputRef?: React.LegacyRef<HTMLInputElement>;
    mode: undefined | { "!listNode": boolean; "!noList": boolean };
    leftContent?: React.ReactNode;
  };

export const SearchInput = (props: SearchInputProps) => {
  const {
    type = "text",
    className,
    onClickWrapper,
    wrapperStyle,
    inputWrapperRef,
    inputRef,
    matchCase,
    isLoading,
    withShadow,
    style,
    mode,
    leftContent,
    ...inputProps
  } = props;

  const size = window.isLowWidthScreen ? "small" : undefined;

  return (
    <FlexRow
      ref={inputWrapperRef}
      className={
        "SearchList_InputWrapper bg-color-0 gap-0 h-fit f-1 relative o-hidden relative rounded focus-border b b-color " +
        (withShadow ? " shadow " : " ")
      }
      style={{
        ...wrapperStyle,
        ...(mode ?
          { zIndex: mode["!listNode"] ? "unset" : SearchInputZIndex }
        : {
            marginBottom: "8px",
          }),
      }}
      onClick={onClickWrapper}
    >
      {leftContent}
      <Input
        className={classOverride("Input f-1 w-full", className)}
        autoCorrect="off"
        autoCapitalize="off"
        type={type}
        ref={inputRef}
        style={{
          minWidth: "5em",
          ...(mode?.["!noList"] && {
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            zIndex: 3,
          }),
          ...(matchCase && {
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          }),
          ...style,
          ...(size !== "small" && {
            padding: "8px 1em",
            paddingRight: 0,
          }),
        }}
        autoComplete="off"
        title={"Search"}
        {...inputProps}
      />
      <FlexRow
        className="relative rounded f-0 ai-center jc-center gap-0 bg-color-0 "
        style={{
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          overflow: "visible",
          margin: "0px",
        }}
      >
        {isLoading && (
          <Loading
            className="noselect mr-p5 bg-color-0"
            sizePx={24}
            variant="cover"
          />
        )}

        {matchCase && (
          <Btn
            data-command="SearchList.MatchCase"
            title={"Match case"}
            iconPath={mdiFormatLetterCase}
            style={{
              margin: "1px",
            }}
            color={matchCase.value ? "action" : undefined}
            onClick={() => {
              matchCase.onChange(!matchCase);
            }}
          />
        )}
      </FlexRow>
    </FlexRow>
  );
};
