import React from "react";
import { FlexCol, FlexRow, FlexRowWrap } from "../../../components/Flex";
import type { W_TableMenuMetaProps } from "./W_TableMenu";
import { ACCESS_RULE_METHODS } from "../../AccessControl/AccessRuleSummary";
import { Link } from "react-router-dom";
import { getAccessControlHref } from "../../AccessControl/useAccessControlSearchParams";
import { LabeledRow } from "../../../components/LabeledRow";
import { mdiAccount, mdiPlus } from "@mdi/js";
import Btn from "../../../components/Btn";
import { InfoRow } from "../../../components/InfoRow";
import { isObject } from "../../../../../commonTypes/publishUtils";
import { RenderFilter } from "../../RenderFilter";
import { Label } from "../../../components/Label";

export const W_TableMenu_AccessRules = ({
  tableMeta,
  w,
  prgl,
}: W_TableMenuMetaProps) => {
  if (!tableMeta) return null;
  const { accessRules } = tableMeta;
  return (
    <FlexCol>
      <ul className="flex-col gap-1">
        {accessRules.map((r) => {
          const dbRule = r.dbPermissions;
          const tableRule =
            dbRule.type === "Custom" ?
              dbRule.customTables.find((t) => t.tableName === w.table_name)
            : undefined;
          const href = getAccessControlHref({
            connectionId: prgl.connectionId,
            selectedRuleId: r.id.toString(),
          });
          return (
            <Link key={r.id} to={href} className="no-decor ">
              <div className=" active-shadow-hover pointer rounded bg-color-0 shadow b b-color p-p5 ">
                <LabeledRow
                  icon={mdiAccount}
                  title="User types"
                  className="ai-center"
                >
                  <span className="text-0 font-20 bold">
                    {r.userTypes.join(", ")}
                  </span>
                </LabeledRow>
                <FlexCol className="p-1 text-0">
                  {dbRule.type === "Run SQL" ?
                    "Run SQL"
                  : dbRule.type === "All views/tables" ?
                    dbRule.allowAllTables.join(", ")
                  : ACCESS_RULE_METHODS.map((ruleName) => {
                      const rule = tableRule?.[ruleName];
                      if (!rule) return null;
                      const ruleFields =
                        rule === true ? "*"
                        : isObject(rule) && "fields" in rule && rule.fields ?
                          rule.fields
                        : undefined;
                      const fieldsInfo =
                        ruleFields === "*" ? "All columns"
                        : Array.isArray(ruleFields) ?
                          `Columns: ${ruleFields.join(", ")}`
                        : isObject(ruleFields) ?
                          `${Object.values(ruleFields).some((v) => !v) ? "Except columns:" : "Columns:"} ${Object.keys(ruleFields)}`
                        : undefined;
                      return (
                        <FlexCol key={ruleName} className="ta-left">
                          <FlexCol>
                            <div className="font-22 text-0">{ruleName}</div>
                            <FlexCol className="pl-1">
                              {fieldsInfo}
                              {isObject(rule) &&
                                "forcedFilterDetailed" in rule && (
                                  <FlexCol key={"using"} className="gap-p25">
                                    <Label variant="normal">USING</Label>
                                    <RenderFilter
                                      contextData={undefined}
                                      db={prgl.db}
                                      itemName="condition"
                                      selectedColumns={undefined}
                                      tableName={w.table_name}
                                      tables={prgl.tables}
                                      mode="minimised"
                                      filter={rule.forcedFilterDetailed}
                                      onChange={() => {}}
                                    />
                                  </FlexCol>
                                )}
                              {isObject(rule) &&
                                "checkFilterDetailed" in rule && (
                                  <FlexCol key={"check"} className="gap-p25">
                                    <div>CHECK</div>
                                    <RenderFilter
                                      contextData={undefined}
                                      db={prgl.db}
                                      itemName="condition"
                                      selectedColumns={undefined}
                                      tableName={w.table_name}
                                      tables={prgl.tables}
                                      mode="minimised"
                                      filter={rule.checkFilterDetailed}
                                      onChange={() => {}}
                                    />
                                  </FlexCol>
                                )}
                            </FlexCol>
                          </FlexCol>
                        </FlexCol>
                      );
                    })
                  }
                </FlexCol>
              </div>
            </Link>
          );
        })}
        {!accessRules.length && <InfoRow>No access rules</InfoRow>}
      </ul>
      <Btn
        asNavLink={true}
        href={getAccessControlHref({ connectionId: prgl.connectionId })}
        iconPath={mdiPlus}
        color="action"
        variant="filled"
      >
        Create
      </Btn>
    </FlexCol>
  );
};
