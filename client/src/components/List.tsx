import React from "react";
import Checkbox from "./Checkbox";
import { DraggableLI } from "./DraggableLI";
import Popup from "./Popup/Popup";
import type { OptionKey } from "./Select/Select";

type Items = {
  key?: OptionKey;
  label?: string;
  node?: React.ReactNode;
  content?: React.ReactNode;
  contentLeft?: React.ReactNode;
  contentRight?: React.ReactNode;
  onPress: (
    e:
      | React.MouseEvent<HTMLLIElement, globalThis.MouseEvent>
      | React.KeyboardEvent<HTMLLIElement>,
  ) => void;
  style?: React.CSSProperties;
}[];

export type ListProps = {
  id?: string;
  items: Items;
  onReorder?: (newItems: Items) => void;
  style?: React.CSSProperties;
  className?: string;

  onClose: VoidFunction;
  // } & (
  //   | {
  // onSelect: (value: string, index: number) => void;
  selectedValue?: string;
  // } |
  // {
  // onCheck: (checkedValues: string[]) => void;
  checkedValues?: OptionKey[];
  //   }
  // ) & (
  //   {
  anchorRef?: HTMLElement;
  // } |
  // {
  anchorContent?: React.ReactChild;
};
// );

export default class List extends React.Component<ListProps, any> {
  refList?: HTMLUListElement;
  popupAnchor?: HTMLElement;
  render() {
    const {
      className = "",
      style = {},
      items,
      onReorder,
      onClose,

      selectedValue,
      checkedValues,

      anchorRef,
      anchorContent,
    } = this.props;

    const list = (
      <ul
        className={
          "list-comp f-1 o-auto min-h-0 min-w-0 no-scroll-bar" + className
        }
        role="list"
        ref={(r) => {
          if (r) this.refList = r;
        }}
        style={{
          // padding: "0.5em",
          padding: 0,
          ...style,
        }}
      >
        {!items.length ?
          <div className="p-p5">No results</div>
        : items.map((d, i) => (
            <DraggableLI
              key={i}
              role="listitem"
              idx={i}
              onReorder={onReorder}
              items={items.slice(0)}
              className={
                "flex-row bg-li p-p5 pointer " +
                (d.key === selectedValue ? " selected " : "")
              }
              onClick={(e) => d.onPress(e)}
              onKeyUp={(e) => {
                if (e.key === "Enter") d.onPress(e);
              }}
            >
              {d.content || (
                <>
                  {d.contentLeft || null}
                  <label
                    className="mr-p5 f-1 flex-row pointer noselect"
                    style={d.style}
                  >
                    {d.node || (d.label ?? d.key)?.toString()}
                  </label>
                  {d.contentRight || null}
                  {!checkedValues ? null : (
                    <Checkbox
                      className="f-0"
                      checked={checkedValues.includes(d.key)}
                      style={{ marginRight: "12px" }}
                    />
                  )}
                </>
              )}
            </DraggableLI>
          ))
        }
      </ul>
    );

    let popupAnchor, popupContent;
    if (anchorRef) {
      popupAnchor = anchorRef;
      popupContent = list;
    }

    if (anchorContent) {
      popupAnchor = this.popupAnchor;
      popupContent = (
        <div
          className="list-comp w-fit flex-col bg-color-0"
          style={{
            padding: 0,
            margin: 0,
            textDecoration: "none",
            listStyle: "none",
          }}
        >
          <div
            ref={(e) => {
              if (e) this.popupAnchor = e;
            }}
            className="f-0 min-h-0 min-w-0 m-p5 flex-row jc-start "
          >
            {popupContent}
          </div>
          {list}
        </div>
      );
    }

    if (popupAnchor && popupContent) {
      return (
        <Popup
          rootStyle={{ padding: 0 }}
          anchorEl={popupAnchor}
          positioning="beneath-left"
          clickCatchStyle={{ opacity: 0 }}
          onClose={onClose}
          contentClassName="rounded"
          focusTrap={false}
        >
          {popupContent}
        </Popup>
      );
    }

    if (popupAnchor || popupContent) return null;

    return list;
  }
}

{
  /* <input id={id} type="checkbox" checked={value} onChange={!onChange? undefined : e => {
  onChange(e.target.checked, e);
}}/>
<label htmlFor={id} className="noselect f-1">{label}</label> */
}
