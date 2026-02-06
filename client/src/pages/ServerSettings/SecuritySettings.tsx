import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import Btn from "@components/Btn";
import Chip from "@components/Chip";
import { FlexCol } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { InfoRow } from "@components/InfoRow";
import { mdiLaptop } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useState } from "react";
import { SmartForm } from "../../dashboard/SmartForm/SmartForm";
import { t } from "../../i18n/i18nUtils";
import { usePromise } from "prostgles-client";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import Loading from "@components/Loader/Loading";
import { getCIDRRangesQuery } from "@common/publishUtils";

export const SecuritySettings = ({
  connectionId,
  className,
}: {
  connectionId: string | undefined;
  className?: string;
}) => {
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const { dbsMethods, dbsSql, dbs, dbsTables, dbsMethodSchema } = usePrglCore();
  const [testCIDR, setCIDR] = useState<string>();

  const myIP = usePromise(() => dbsMethods.getMyIP!());

  const ipRanges = usePromise(async () => {
    try {
      if (!testCIDR) return;
      const cidr = testCIDR;
      const ranges =
        ((await dbsSql!(
          getCIDRRangesQuery({ cidr, returns: ["from", "to"] }),
          { cidr },
          { returnType: "row" },
        )) as { from?: string; to?: string } | undefined) ?? {};

      return {
        ...ranges,
        error: undefined,
      };
    } catch (error: unknown) {
      return { error, to: undefined, from: undefined };
    }
  }, [testCIDR, dbsSql]);

  if (!myIP) return <Loading />;

  return (
    <FlexCol
      style={{ opacity: settingsLoaded ? 1 : 0, minWidth: 0 }}
      className={className}
    >
      <InfoRow className="mb-1" variant="naked" color="info" iconPath="">
        Configure domain access, IP restrictions, session duration, and login
        rate limits to enhance security.
      </InfoRow>
      <SmartForm
        className="bg-color-0 "
        label=""
        sql={dbsSql}
        db={dbs as DBHandlerClient}
        methods={dbsMethodSchema}
        tableName="database_configs"
        contentClassname="px-p25  "
        columns={
          {
            allowed_ips: 1,
            allowed_ips_enabled: 1,
            trust_proxy: 1,
            session_max_age_days: 1,
            login_rate_limit: 1,
            login_rate_limit_enabled: 1,
            csp: 1,
            csp_add_defaults_enabled: 1,
            cors: 1,
            cors_csp_devmode_enabled: 1,
            cookie_options: 1,
          } satisfies Partial<
            Record<keyof DBGeneratedSchema["database_configs"]["columns"], 1>
          >
        }
        tables={dbsTables}
        rowFilter={[
          {
            type: "$existsJoined",
            path: ["connections"],
            filter: {
              fieldName: "id",
              value: connectionId,
            },
          },
        ]}
        confirmUpdates={true}
        hideNonUpdateableColumns={true}
        showJoinedTables={false}
        disabledActions={["clone", "delete"]}
        onLoaded={() => setSettingsLoaded(true)}
      />
      <FlexCol className="p-1 bg-color-0 shadow ">
        <FormField
          type="text"
          label={t.ServerSettings["Validate a CIDR"]}
          value={testCIDR ?? ""}
          onChange={(cidr) => {
            setCIDR(cidr);
          }}
          placeholder="127.1.1.1/32"
          hint={t.ServerSettings["Enter a value to see the allowed IP ranges"]}
          error={ipRanges?.error}
          rightIcons={
            <Btn
              title={t.ServerSettings["Add your current IP"]}
              iconPath={mdiLaptop}
              onClick={() => setCIDR(myIP.ip + "/128")}
            ></Btn>
          }
        />
        {/* {myIP && <InfoRow className="" color="info" variant="naked">
                    <div className="flex-col ai-center w-fit">
                      <div> Your current IP Address:</div> 
                      <strong>{myIP?.ip}</strong>
                    </div>
                  </InfoRow>} */}
        {!!ipRanges?.from && (
          <FlexCol>
            {ipRanges.from === ipRanges.to ?
              <Chip
                variant="naked"
                label={t.ServerSettings["Allowed IP"]}
                value={ipRanges.from}
              />
            : <>
                <Chip
                  variant="naked"
                  label={t.ServerSettings["From IP"]}
                  value={ipRanges.from}
                />
                <Chip
                  variant="naked"
                  label={t.ServerSettings["To IP"]}
                  value={ipRanges.to}
                />
              </>
            }
          </FlexCol>
        )}
      </FlexCol>
    </FlexCol>
  );
};
