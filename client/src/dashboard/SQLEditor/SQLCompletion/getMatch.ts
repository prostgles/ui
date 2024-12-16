import { MatchAlter } from "./MatchAlter/MatchAlter";
import { MatchCopy } from "./MatchCopy";
import { MatchCreate } from "./MacthCreate/MatchCreate";
import { MatchLast } from "./MatchLast";
import { MatchFirst } from "./MatchFirst";
import { MatchSelect } from "./MatchSelect";
import { MatchDrop } from "./MatchDrop";
import { MatchUpdate } from "./MatchUpdate";
import { MatchInsert } from "./MatchInsert";
import { MatchComment } from "./MatchComment";
import { MatchDelete } from "./MathDelete";
import { MatchReassign } from "./MatchReassign";
import { MatchWith } from "./MatchWith";
import { MatchGrant } from "./MatchGrant";
import type { SQLMatchContext } from "./registerSuggestions";
import { MatchVacuum } from "./MatchVacuum";
import { MatchReindex } from "./MatchReindex";
import { MatchPublication } from "./MatchPublication";
import { MatchSubscription } from "./MatchSubscription";
import { MatchSet } from "./MatchSet";

export const SQLMatchers = {
  MatchSet,
  MatchSubscription,
  MatchPublication,
  MatchGrant,
  MatchAlter,
  MatchCreate,
  MatchUpdate,
  MatchSelect,
  MatchWith,
  MatchCopy,
  MatchInsert,
  MatchDrop,
  MatchDelete,
  MatchComment,
  MatchReassign,
  MatchLast,
  MatchVacuum,
  MatchReindex,
} as const;
type MatchFilter = (keyof typeof SQLMatchers)[];

export const getMatch = async ({
  cb,
  setS,
  sql,
  ss,
  filter,
}: SQLMatchContext & { filter?: MatchFilter }) => {
  const firstTry = await MatchFirst({ cb, ss, setS, sql });
  if (firstTry) {
    return { firstTry, match: undefined };
  }

  const match = Object.entries(SQLMatchers)
    .filter(([name]) => !filter?.length || filter.includes(name as any))
    .map((m) => m[1])
    .find((m) => m.match(cb));

  return { match, firstTry: undefined };
};
