import React from "react";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import Chip from "../../components/Chip";

type P = {
  message: Pick<DBSSchema["llm_messages"], "meta" | "user_id" | "cost">;
  className?: string;
};

export const AskLLMTokenUsage = ({
  className,
  message: { meta: rawMeta, cost: costStr },
}: P) => {
  const cost = parseFloat(costStr);
  return (
    <Chip
      className={className}
      title={JSON.stringify({ cost, ...rawMeta }, null, 2)}
    >
      {cost ? `$${cost.toFixed(2)}` : ""}
    </Chip>
  );
};
