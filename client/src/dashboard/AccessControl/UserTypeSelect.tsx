import { mdiAccountOutline, mdiAccountQuestion, mdiAccountStar } from "@mdi/js";
import React from "react";
import type { TestSelectors } from "../../Testing";
import { Icon } from "@components/Icon/Icon";
import type { DBS } from "../Dashboard/DBS";
import { SmartSelect } from "../SmartSelect";
import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import type { DBSSchema } from "@common/publishUtils";
import type { UserType } from "./useEditedAccessRule";

type P = {
  dbs: DBS;
  userTypes: DBSSchema["user_types"]["id"][];
  connectionId: string;
  database_id: number;
  onChange: (userTypes: DBSSchema["user_types"]["id"][]) => void;

  /**
   * Excluded from disabledInfo
   */
  fromEditedRule?: string[];
} & TestSelectors;

export const UserTypeSelect = (props: P) => {
  const {
    dbs,
    userTypes = [],
    fromEditedRule,
    onChange,
    database_id,
    ...selectors
  } = props;
  const subParams = { select: { user_type: 1 }, returnType: "values" } as const;
  const { data: existingACUserTypes } =
    dbs.access_control_user_types.useSubscribe(
      { $existsJoined: { access_control: { database_id } } },
      subParams,
    );

  return (
    <SmartSelect
      {...selectors}
      popupTitle="User types"
      placeholder="New or existing user type"
      fieldName="id"
      onChange={onChange}
      tableHandler={dbs.user_types as TableHandlerClient}
      values={userTypes}
      getLabel={(_id) => {
        const id = _id as UserType;
        let subLabel = "",
          disabledInfo = "";
        if (id === "admin") {
          disabledInfo = "Cannot change admin";
          subLabel = "Can always access everything";
        } else {
          const existingRules =
            !fromEditedRule?.includes(id) && existingACUserTypes?.includes(id);
          if (existingRules) {
            disabledInfo = "Need to remove from existing access rule first";
            subLabel = `Already assigned permissions`;
          } else if (
            (userTypes.includes("public") && !userTypes.includes(id)) ||
            (userTypes.length &&
              !userTypes.includes("public") &&
              id === "public")
          ) {
            disabledInfo = "Cannot mix 'public' with other user types";
          }
        }

        return {
          subLabel,
          disabledInfo,
          contentLeft: (
            <Icon
              style={{ opacity: 0.75 }}
              path={
                id === "admin" ? mdiAccountStar
                : id === "public" ?
                  mdiAccountQuestion
                : mdiAccountOutline
              }
            />
          ),
        };
      }}
    />
  );
};
