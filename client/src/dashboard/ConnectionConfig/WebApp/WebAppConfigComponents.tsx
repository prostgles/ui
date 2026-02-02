import type { DBSSchema } from "@common/publishUtils";
import { FlexRow } from "@components/Flex";
import { SearchList } from "@components/SearchList/SearchList";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { usePromise } from "prostgles-client";
import React, { useState } from "react";

export const WebAppConfigComponents = ({
  webAppUrl,
}: {
  webAppUrl: string;
}) => {
  const {
    connectionId,
    dbsMethods: { getWebAppComponents },
  } = usePrgl();
  const componentData = usePromise(
    () => getWebAppComponents!({ connectionId }),
    [connectionId, getWebAppComponents],
  );

  const [selectedComponent, setSelectedComponent] = useState<string>();

  return (
    <FlexRow className="h-full ai-start">
      <SearchList
        items={
          componentData?.components.map((c) => {
            return {
              key: c.name,
              selected: c.name === selectedComponent,
              onPress: () => {
                setSelectedComponent(c.name);
              },
            };
          }) ?? []
        }
      />
      {selectedComponent && (
        <iframe
          className="f-1 w-full h-full"
          title="Web App Preview"
          src={[webAppUrl, "component-preview", selectedComponent].join("/")}
        />
      )}
    </FlexRow>
  );
};
