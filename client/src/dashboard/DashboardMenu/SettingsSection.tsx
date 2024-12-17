import React from "react";
import { FlexCol } from "../../components/Flex";
import { SectionHeader } from "../AccessControl/AccessControlRuleEditor";

export const SettingsSection = ({
  title,
  iconPath,
  children,
}: {
  title: string;
  iconPath: string;
  children: React.ReactNode;
}) => {
  return (
    <FlexCol>
      <SectionHeader size="small" icon={iconPath}>
        {title}
      </SectionHeader>
      <FlexCol className="pl-2">{children}</FlexCol>
    </FlexCol>
  );
};
