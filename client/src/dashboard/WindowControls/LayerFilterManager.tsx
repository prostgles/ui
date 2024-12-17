import { mdiFilter } from "@mdi/js";
import React from "react";
import Btn from "../../components/Btn";
import PopupMenu from "../../components/PopupMenu";
import { RenderFilter } from "../RenderFilter";
import type { MapLayerManagerProps } from "./ChartLayerManager";
import type { DBSSchema } from "@common/publishUtils";

export const LayerFilterManager = (
  props: MapLayerManagerProps & { linkId: string },
) => {
  const {
    prgl: { dbs },
    myLinks,
    linkId,
  } = props;
  const l = myLinks.find((l) => l.id === linkId);
  const linkOpts = l?.options;
  if (!linkOpts || linkOpts.type === "table" || !linkOpts.localTableName) {
    return null;
  }
  const tableName = linkOpts.localTableName;
  const andOrFilter = linkOpts.smartGroupFilter;

  type ChartOpts = Exclude<DBSSchema["links"]["options"], { type: "table" }>;

  /** TODO: fix prostgles-server jsonb record ts generation. Must be partial<record */
  const setFilter = (newFilter: ChartOpts["smartGroupFilter"]) => {
    return dbs.links.update(
      { id: linkId },
      {
        options: {
          ...linkOpts,
          smartGroupFilter: newFilter,
        },
        last_updated: Date.now(),
      },
    );
  };

  return (
    <RenderFilter
      {...props.prgl}
      title="Manage filters"
      mode="micro"
      selectedColumns={undefined}
      itemName="filter"
      tableName={tableName}
      contextData={undefined}
      filter={andOrFilter}
      onChange={(andOrFilter) => {
        setFilter(andOrFilter);
      }}
    />
  );
};
