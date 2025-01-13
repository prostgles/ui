import { mdiInformationOutline, mdiPlus } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React, { useCallback, useEffect, useRef } from "react";
import type { Theme } from "../../App";
import Btn from "../../components/Btn";
import { Icon } from "../../components/Icon/Icon";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import type { DBS, DBSMethods } from "../Dashboard/DBS";
import type { DBSchemaTablesWJoins } from "../Dashboard/dashboardUtils";
import { getMonaco } from "../SQLEditor/SQLEditor";
import SmartForm from "../SmartForm/SmartForm";

type P = {
  pickFirst?: boolean;
  pickFirstIfNoOthers?: boolean;
  dbsTables: DBSchemaTablesWJoins;
  dbs: DBS;
  dbsMethods: DBSMethods;
  selectedId?: number | null;
  onChange: (credentialId: number) => void;
  theme: Theme;
};

export function CredentialSelector({
  selectedId,
  onChange,
  dbs,
  dbsTables,
  pickFirst,
  dbsMethods,
  pickFirstIfNoOthers,
  theme,
}: P) {
  const { data: credentials } = dbs.credentials.useSubscribe({ type: "s3" });

  useEffect(() => {
    const [firstCredential] = credentials ?? [];
    if (selectedId) return;
    if (
      (pickFirst && firstCredential) ||
      (pickFirstIfNoOthers && firstCredential && credentials?.length === 1)
    ) {
      onChange(firstCredential.id);
    }
  }, [credentials, pickFirst, onChange, selectedId, pickFirstIfNoOthers]);

  const MarkerSeverity = usePromise(
    async () => (await getMonaco()).MarkerSeverity,
  );

  if (!MarkerSeverity) return null;

  return (
    <div className="flex-row-wrap ai-end gap-1">
      <Select
        className=" "
        label="S3 credentials"
        fullOptions={(credentials ?? []).map((c) => ({
          key: c.id,
          label: `${c.name || c.id}`,
          subLabel: `${c.key_id}`,
        }))}
        value={selectedId}
        onChange={(o) => {
          onChange(o);
        }}
      />
      <PopupMenu
        button={
          <Btn
            title="Add credential"
            className="mt-1"
            color="action"
            variant="filled"
            iconPath={mdiPlus}
          />
        }
        positioning="center"
        contentStyle={{ padding: 0 }}
        render={(popupClose) => (
          <SmartForm
            theme={theme}
            methods={dbsMethods}
            db={dbs as any}
            label="Add Cloud credentials"
            tableName="credentials"
            // columns={dbsTables.find(t => t.name === "credentials")?.columns.filter(c => !["id", "connection_id"].includes(c.name))}
            tables={dbsTables}
            showJoinedTables={false}
            hideChangesOptions={true}
            defaultData={{ type: "s3" }}
            onClose={popupClose}
            onValidate={(row, cols) => {
              if (row.type !== "s3") {
                return { type: "The only allowed value is: s3" };
              }
            }}
          />
        )}
      />
      <PopupMenu
        className=""
        button={
          <Btn iconPath={mdiInformationOutline} variant="outline">
            Example bucket policy
          </Btn>
        }
        positioning="top-center"
        title={
          <div className="flex-row ai-center p-p5  w-full gap-1">
            <Icon path={mdiInformationOutline} size={1} />
            <h4 className="m-0 ta-center ">Suggested bucket policy</h4>
          </div>
        }
        contentStyle={{
          width: "650px",
          minWidth: 0,
          maxWidth: "100vw",
          height: "450px",
          minHeight: 0,
          maxHeight: "100vh",
          flex: "none",
        }}
        render={(pClose) => (
          <div className="flex-col gap-p1 f-1 b b-color rounded o-hidden">
            <CodeEditor
              value={SAMPLE_BUCKET_POLICY}
              language="json"
              style={{ minHeight: "200px" }}
              className="p-p5 o-hidden"
              options={{
                tabSize: 2,
                minimap: {
                  enabled: false,
                },
                lineNumbers: "off",
              }}
              // onChange={() => {}}
              markers={[
                {
                  startColumn: 12,
                  endColumn: 66,
                  startLineNumber: 8,
                  endLineNumber: 8,
                  severity: MarkerSeverity["Error"],
                  message: "Replace with your AWS IAM user",
                },
                {
                  startColumn: 30,
                  endColumn: 46,
                  startLineNumber: 17,
                  endLineNumber: 17,
                  severity: MarkerSeverity["Error"],
                  message: "Replace with your AWS Bucket name",
                },

                {
                  startColumn: 6,
                  endColumn: 23,
                  startLineNumber: 14,
                  endLineNumber: 14,
                  severity: MarkerSeverity["Error"],
                  message:
                    "May only keep this for testing. Not recommended for production",
                },
                {
                  startColumn: 6,
                  endColumn: 29,
                  startLineNumber: 15,
                  endLineNumber: 15,
                  severity: MarkerSeverity["Error"],
                  message:
                    "May only keep this for testing. Not recommended for production",
                },
              ]}
            />
          </div>
        )}
      />
    </div>
  );
}

const SAMPLE_BUCKET_POLICY = `
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Effect": "Allow",
			"Principal": {
				"AWS": "arn:aws:iam::123456789012:user/your_iam_user"
			},
			"Action": [
				"s3:PutObject",
				"s3:GetObject",
				"s3:GetObjectVersion",
				"s3:DeleteObject",
				"s3:DeleteObjectVersion"
			],
			"Resource": "arn:aws:s3:::your_bucket_name/*"
		}
	]
}`;

export function useIsMounted() {
  const isMountedRef = useRef(true);
  const isMounted = useCallback(() => isMountedRef.current, []);

  useEffect(() => {
    return () => void (isMountedRef.current = false);
  }, []);

  return isMounted;
}
