import { getConnectionPaths } from "@common/utils";
import { WebAppFileBrowser } from "@components/CodeFileBrowser/WebAppFileBrowser";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { IFrame } from "@components/IFrame/IFrame";
import Loading from "@components/Loader/Loading";
import Tabs from "@components/Tabs";
import React from "react";
import { useWebAppConfigActiveSection } from "./hooks/useWebAppConfigActiveSection";
import { useWebAppConfigState } from "./hooks/useWebAppConfigState";
import { WebAppConfigComponents } from "./WebAppConfigComponents";
import { WebAppConfigFooterActions } from "./WebAppConfigFooterActions";
import { WebAppConfigSetup } from "./WebAppConfigSetup";

export const WebAppConfig = () => {
  const state = useWebAppConfigState();
  const { connection, error, webAppUrl, connectionId, web_app_templated } =
    state;

  const { section, setParams, lastChanged } = useWebAppConfigActiveSection();

  if (!connection) {
    return <Loading />;
  }

  return (
    <FlexCol className="f-1">
      <WebAppConfigSetup {...state} />

      {web_app_templated && webAppUrl && (
        <Tabs
          className="f-1 w-full"
          contentClass="f-1 py-1 min-h-0"
          // defaultActiveKey="Preview"
          activeKey={section}
          onChange={(newSection) =>
            setParams({ web_config_section: newSection })
          }
          items={{
            Preview: {
              content: (
                <IFrame
                  className="f-1 w-full h-full"
                  title="Web App Preview"
                  src={webAppUrl}
                />
              ),
            },
            Components: {
              hide: !web_app_templated,
              content: <WebAppConfigComponents webAppUrl={webAppUrl} />,
            },
            Files: {
              content: <WebAppFileBrowser connection={connection} />,
            },
            Tests: {
              hide: !web_app_templated,
              content: (
                <IFrame
                  key={lastChanged}
                  className="f-1 w-full h-full"
                  title="Last test run"
                  src={getConnectionPaths({ id: connectionId }).webAppTests}
                />
              ),
            },
          }}
        />
      )}

      <WebAppConfigFooterActions
        connection={connection}
        setParams={setParams}
      />
      <ErrorComponent error={error} />
    </FlexCol>
  );
};
