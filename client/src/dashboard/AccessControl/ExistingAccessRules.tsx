import React from "react";
import type { AccessRule } from "./AccessControl";
import Chip from "../../components/Chip";
import { InfoRow } from "../../components/InfoRow";
import { mdiAccount, mdiFunction, mdiViewCarousel } from "@mdi/js";
import { LabeledRow } from "../../components/LabeledRow";
import { pluralise } from "../../pages/Connections/Connection";
import { AccessRuleSummary } from "./AccessRuleSummary";
import type { Workspace } from "../Dashboard/dashboardUtils";
import { SwitchToggle } from "../../components/SwitchToggle";
import type { Prgl } from "../../App";
import { FlexRow } from "../../components/Flex";

type ExistingAccessRulesProps = {
  onSelect: (rule: AccessRule) => void;
  rules: AccessRule[];
  workspaces: Workspace[];
  prgl: Prgl;
};

export const AccessControlRules = ({
  rules,
  onSelect,
  workspaces,
  prgl: { dbs, connectionId },
}: ExistingAccessRulesProps) => {
  const userTypesWithAccess = rules.flatMap((r) =>
    r.access_control_user_types.flatMap((u) => u.ids),
  );

  return (
    <div className="ExistingAccessRules ">
      <InfoRow
        variant="naked"
        color="info"
        style={{ alignItems: "center" }}
        iconPath=""
      >
        <p>
          {!userTypesWithAccess.length ? "Only users" : "Users"} of type{" "}
          <strong>"admin"</strong> have full access to this database.
        </p>

        {!!userTypesWithAccess.length && (
          <p>
            Users of {pluralise(userTypesWithAccess.length, "type")}{" "}
            <strong>
              {userTypesWithAccess.map((v) => JSON.stringify(v)).join(", ")}
            </strong>{" "}
            can access according to the rules below:
          </p>
        )}
      </InfoRow>

      {!!rules.length && (
        <>
          <h3 className="m-0 mt-1 mb-1">
            Access rules {rules.length > 5 ? `(${rules.length})` : ""}
          </h3>
          <div className="flex-col gap-1 w-fit max-w-full">
            {rules.map((r, ri) => {
              const publishedWorkspaceNames = workspaces
                .filter((w) =>
                  r.dbsPermissions?.viewPublishedWorkspaces?.workspaceIds.includes(
                    w.id,
                  ),
                )
                .map((w) => w.name);
              const userTypes = r.access_control_user_types[0]?.ids;
              return (
                <div
                  key={ri}
                  className={
                    "ExistingAccessRules_Item flex-col active-shadow-hover gap-p5 pointer rounded p-p5 bg-color-0 shadow b b-color o-auto"
                  }
                  data-key={userTypes}
                  onClick={({ target }) => {
                    if (
                      target instanceof HTMLElement &&
                      target.closest(".SwitchToggle")
                    )
                      return;
                    onSelect(r);
                  }}
                >
                  <FlexRow>
                    <LabeledRow
                      icon={mdiAccount}
                      title="User types"
                      className="ExistingAccessRules_Item_Header ai-center f-1"
                    >
                      <span className="text-0 font-20 bold">
                        {userTypes?.join(", ")}
                      </span>
                    </LabeledRow>
                    <SwitchToggle
                      checked={!!r.isApplied}
                      title={
                        r.isApplied ? "Click to disable" : "Click to enable"
                      }
                      onChange={(isApplied, e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (isApplied) {
                          dbs.access_control_connections.insert({
                            connection_id: connectionId,
                            access_control_id: r.id,
                          });
                        } else {
                          dbs.access_control_connections.delete({
                            connection_id: connectionId,
                            access_control_id: r.id,
                          });
                        }
                      }}
                    />
                  </FlexRow>

                  <AccessRuleSummary rule={r.dbPermissions} />

                  {!!publishedWorkspaceNames.length && (
                    <LabeledRow
                      icon={mdiViewCarousel}
                      label="Workspaces"
                      labelStyle={{ minWidth: "152px" }}
                      className="ai-center"
                      contentClassName="pl-1"
                      onClick={() => onSelect(r)}
                    >
                      {publishedWorkspaceNames.map((w, i) => (
                        <Chip title="Published workspace" color="blue" key={i}>
                          {w}
                        </Chip>
                      ))}
                    </LabeledRow>
                  )}

                  {!!r.published_methods.length && (
                    <LabeledRow
                      icon={mdiFunction}
                      label="Functions"
                      className="ai-center"
                      contentClassName="pl-1"
                      onClick={() => onSelect(r)}
                    >
                      <div className="flex-row-wrap gap-p5">
                        {r.published_methods.map((m, i) => (
                          <Chip
                            key={m.name}
                            className="pointer"
                            title="Click to edit"
                            value={m.name}
                          />
                        ))}
                      </div>
                    </LabeledRow>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export const WspIconPath = mdiViewCarousel;
