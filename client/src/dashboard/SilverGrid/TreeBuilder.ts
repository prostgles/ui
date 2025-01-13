/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import { isDefined } from "../../utils";
import type { LayoutConfig, LayoutGroup, LayoutItem } from "./SilverGrid";

export type TreeLayout = LayoutConfig & { parent?: TreeLayout };
export class TreeBuilder {
  layout?: LayoutConfig;
  tree?: TreeLayout;
  constructor(l: LayoutConfig, onChange: (newLayout: LayoutConfig) => void) {
    this.build(l);
    this.onChange = onChange;
  }

  private build(l: LayoutConfig) {
    const _l = JSON.parse(JSON.stringify({ ...l }));
    this.layout = _l;
    this.tree = this.makeTree(_l);
  }

  private onChange = (newLayout: LayoutConfig) => {};

  private makeTree = (l: LayoutConfig, lp?: LayoutConfig): TreeLayout => {
    const res: TreeLayout = l;
    if (lp) {
      delete res.isRoot;
      res.parent = lp;
    } else {
      res.isRoot = true;
    }
    if ("items" in l && l.items) {
      l.items.forEach((sl) => {
        this.makeTree(sl, res);
      });
    }

    return res;
  };

  remove = (itemId: string, noChange = false) => {
    const items = this._filter((d) => d.id === itemId && d.parent);

    items.map((item) => {
      (item.parent as LayoutGroup).items = (
        item.parent as LayoutGroup
      ).items.filter((d) => d !== item);
    });

    if (!noChange) {
      this.onChange(this.getLayout());
    }
  };

  getLayout = () => {
    const removeP = (t: TreeLayout): LayoutConfig => {
      delete t.parent;
      if ((t as LayoutGroup).items) {
        (t as LayoutGroup).items = (t as LayoutGroup).items.map(removeP);
      }
      return t;
    };
    const res = removeP({ ...this.tree! });
    this.build(JSON.parse(JSON.stringify(res)) as LayoutConfig);
    return JSON.parse(JSON.stringify(res));
  };

  _filter = (func: (item: TreeLayout) => any): TreeLayout[] => {
    const filter = (t: TreeLayout) => {
      let result: TreeLayout[] = [];
      if (func(t)) {
        result.push(t);
      }
      if ((t as LayoutGroup).items) {
        (t as LayoutGroup).items.map((d) => {
          result = result.concat(filter(d));
        });
      }
      return result;
    };

    return filter(this.tree!);
  };

  refresh = (noChange = false) => {
    this.build(this.getLayout());

    /* Remove empty boxes */
    const getEmptyItems = () =>
      this._filter(
        (t) => t.type !== "item" && t.parent && t.items && t.items.length === 0,
      );
    while (getEmptyItems().length) {
      getEmptyItems().map((d) => {
        (d.parent as LayoutGroup).items = (
          d.parent as LayoutGroup
        ).items.filter((dp) => dp.id != d.id);
      });
      const cleansedLayout = this.getLayout();
      this.build(cleansedLayout);
    }

    const items = this._filter((t) => t.type === "item");

    /* Unnest single items */
    items.concat(items.map((d) => d.parent).filter(isDefined)).map((item) => {
      let topParent = { ...item };
      /** Climb to first parent that is root OR has more than one item */
      while (
        topParent.parent &&
        topParent.parent?.type !== "item" &&
        !topParent.parent.isRoot &&
        topParent.parent.items.length <= 1
      ) {
        topParent = topParent.parent;
      }
      if (topParent.parent && topParent.parent?.type !== "item") {
        topParent.parent.items = topParent.parent.items.map((d) => {
          if (d === topParent) {
            return {
              ...item,
              size: topParent.size ?? item.size,
            };
          }
          return d;
        });
      }
    });
    const cleansedLayout = this.getLayout();
    this.build(cleansedLayout);

    /* Unnest redundant layout groups */
    const getRedundant = () =>
      this._filter((t) => Boolean(t.parent && t.parent.type === t.type));
    while (getRedundant().length) {
      getRedundant().map((p) => {
        if (
          p.parent &&
          p.parent.type === p.type &&
          p.type !== "item" &&
          p.parent.type !== "item"
        ) {
          const idx = p.parent.items.findIndex((d) => d === p);
          p.parent.items.splice(idx, 1, ...p.items);
        }
        this.build(this.getLayout());
      });
    }

    if (!noChange) this.onChange(this.getLayout());
  };

  update = (newData: Partial<LayoutConfig>[]) => {
    newData.map((nd) => {
      const items = this._filter((d) => d.id == nd.id),
        [item] = items;
      if (item) {
        Object.keys(nd).map((key) => {
          item[key] = nd[key];
        });
      } else {
        console.log("Found duplicate items. will not update");
      }
    });
    this.onChange(this.getLayout());
  };

  find = (itemId: string): TreeLayout | undefined => {
    return this._filter((t) => t.id == itemId)[0];
  };
  getLeafs = (func: (t: TreeLayout) => any = () => true): TreeLayout[] => {
    return this._filter(
      (t) => !("items" in t) || (!t.items.length && t.parent),
    ).filter(func);
  };
  findFunc = (func: (t: TreeLayout) => any): TreeLayout | undefined => {
    return this._filter(func)[0];
  };

  moveTo = (
    sourceId: string,
    targetId: string,
    parentType: "row" | "col" | "tab",
    insertBefore: boolean,
  ) => {
    const source = this.find(sourceId) as LayoutItem;
    this.build(this.getLayout());
    this.remove(sourceId, true);

    let target = this.find(targetId);

    if (source && target) {
      if (!target.parent) {
        /* Target is a group with required layout */
        if (target.type === parentType && target.items) {
          source.size =
            target && target.items.length ? target.items[0]!.size : 50;
          if (insertBefore) target.items.unshift(source);
          else target.items.push(source);
        } else {
          source.size = 50;
          target.size = 50;
          target.isRoot = false;
          target = {
            id: Date.now().toString(),
            size: 100,
            isRoot: true,
            type: parentType as any,
            ...(parentType === "tab" && { activeTabKey: undefined }),
            items: insertBefore ? [source, target] : [target, source],
          };

          this.layout = target;
          const newTree = this.makeTree(target!);
          this.tree = newTree;
        }

        /* Target parent is a group with required layout */
      } else {
        const targetIdx = (target.parent as LayoutGroup).items.findIndex(
          (d) => d.id == targetId,
        );
        if (target.parent.type === parentType) {
          target.parent.items.splice(
            insertBefore ? targetIdx : targetIdx + 1,
            0,
            source,
          );
          target.parent.items = target.parent.items.map((d) => {
            d.size =
              100 / Math.max(1, (target!.parent as LayoutGroup).items.length);
            return d;
          });

          /* Target needs wrapping in the required layout */
        } else {
          source.size = 50;
          target.size = 50;
          //@ts-ignore
          (target.parent as LayoutGroup).items[targetIdx] = {
            id: Date.now().toString(),
            type: parentType,
            size:
              Math.min(
                ...(target.parent as LayoutGroup).items.map((d) => d.size),
              ) || 50,
            items:
              insertBefore ?
                [source, target as LayoutItem]
              : [target as LayoutItem, source],
          };
          target = {
            id: Date.now().toString(),
            size: target.size || 50,
            type: parentType as any,
            ...(parentType === "tab" && { activeTabKey: undefined }),
            items:
              insertBefore ?
                [source, target as LayoutItem]
              : [target as LayoutItem, source],
          };
        }
      }
    }

    this.refresh();
  };
}
