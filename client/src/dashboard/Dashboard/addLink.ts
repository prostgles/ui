import type { OmitDistributive } from "@common/utils";
import type { Link } from "./dashboardUtils";
import type { DBS } from "./DBS";
import { PALETTE } from "./PALETTE";

export const addLink = ({
  dbs,
  myLinks,
  newLink,
}: {
  dbs: DBS;
  newLink: {
    w1_id: string;
    w2_id: string;
    workspace_id: string;
    linkOpts: OmitDistributive<Link["options"], "color" | "colorKey">;
  };
  myLinks: Link[];
}) => {
  // const { links } = this.getOpenedLinksAndWindows();
  const { w1_id, w2_id, workspace_id } = newLink;

  // const myLinks = links.filter((l) =>
  //   [l.w1_id, l.w2_id].find((wid) => [w1_id, w2_id].includes(wid)),
  // );
  const cLinkColor = myLinks
    .map((l) => (l.options.type === "table" ? l.options.colorArr : undefined))
    .find((c) => c);
  const colorOpts =
    newLink.linkOpts.type === "table" ?
      {
        colorArr: cLinkColor ?? PALETTE.c4.getDeckRGBA(),
      }
    : ({} as const);

  const options: Link["options"] = {
    ...colorOpts,
    ...newLink.linkOpts,
  };

  return dbs.links.insert(
    {
      w1_id,
      w2_id,
      workspace_id,
      options,
      last_updated: undefined as unknown as string,
      user_id: undefined as unknown as string,
    },
    { returning: "*" },
  );
};
