import React from 'react';
import { DBS } from "../Dashboard/DBS";
import { SmartSelect } from "../SmartSelect";
import { useSubscribe } from "../ProstglesMethod/hooks"; 
import { TestSelectors } from '../../Testing'; 

type P = {
  dbs: DBS;
  userTypes: string[];
  connectionId: string;
  database_id: number;
  onChange: (userTypes: string[]) => void;

  /**
   * Excluded from disabledInfo
   */
  fromEditedRule?: string[]; 
} & TestSelectors;

export const UserTypeSelect = (props: P) => {
  
  const { dbs, userTypes = [], fromEditedRule, onChange,  database_id, ...selectors } = props;
  const subParams = { select: { user_type: 1 }, returnType: "values" } as const;
  const existingACUserTypes = useSubscribe(
      dbs.access_control_user_types.subscribeHook(
        { $existsJoined: { access_control: { database_id} } }, 
        subParams
      ) as any
    ) as string[] | undefined; 

  return <SmartSelect 
    { ...selectors }
    popupTitle="User types"
    placeholder="New or existing user type"
    fieldName="id"
    onChange={onChange}
    tableHandler={dbs.user_types as any}
    values={userTypes}
    getLabel={id => {

      let subLabel = "", disabledInfo = "";
      if(id === "admin"){
        disabledInfo = "Cannot change admin";
        subLabel = "Can always access everything";
      } else {
        const existingRules = !fromEditedRule?.includes(id) && existingACUserTypes?.includes(id);
        if(existingRules){
          disabledInfo = "Need to remove from existing access rule first";
          subLabel = `Already assigned permissions`;
        }
      }

      return { subLabel, disabledInfo };
    }}
  />
    
}
