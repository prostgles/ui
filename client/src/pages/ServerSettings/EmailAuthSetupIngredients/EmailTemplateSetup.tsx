import { mdiDeleteRestore, mdiEyeCheckOutline } from "@mdi/js";
import React from "react";
import sanitize from "sanitize-html";
import Btn from "../../../components/Btn";
import { FlexCol } from "../../../components/Flex";
import FormField from "../../../components/FormField/FormField";
import Popup from "../../../components/Popup/Popup";
import { CodeEditorWithSaveButton } from "../../../dashboard/CodeEditor/CodeEditorWithSaveButton";

export type EmailTemplateConfig = {
  from: string;
  subject: string;
  body: string;
};

type P = {
  value: EmailTemplateConfig | undefined;
  onChange: (newValue: EmailTemplateConfig) => void;
  style?: React.CSSProperties;
  className?: string;
  defaultBody: string;
  parseBody: () => string;
};
export const EmailTemplateSetup = ({
  value,
  onChange,
  style,
  className,
  defaultBody,
  parseBody,
}: P) => {
  const onFieldChange = (newValue: Partial<EmailTemplateConfig>) => {
    const newTemplate = {
      ...value,
      ...newValue,
    };
    onChange({
      body: newTemplate.body ?? "",
      from: newTemplate.from ?? "",
      subject: newTemplate.subject ?? "",
    });
  };
  const htmlValue = value?.body ?? "";
  const [showPreview, setShowPreview] = React.useState(false);
  return (
    <FlexCol
      style={{
        ...style,
        minHeight: "300px",
        minWidth: "500px",
      }}
      className={className}
    >
      <FormField
        label={"From"}
        type="email"
        value={value?.from}
        onChange={(from) => onFieldChange({ from })}
      />
      <FormField
        label={"Subject"}
        type="text"
        value={value?.subject}
        onChange={(subject) => onFieldChange({ subject })}
      />
      <CodeEditorWithSaveButton
        language={"html"}
        value={htmlValue}
        label={"Body"}
        headerButtons={
          <>
            <Btn
              title="Reset to default"
              iconPath={mdiDeleteRestore}
              onClick={() => onFieldChange({ body: defaultBody })}
            />
            <Btn
              title="Preview"
              iconPath={mdiEyeCheckOutline}
              onClick={() => {
                setShowPreview(!showPreview);
              }}
            />
          </>
        }
        autoSave={true}
        onSave={(body) => onFieldChange({ body })}
        options={{
          lineNumbers: "off",
          padding: {
            top: 24,
          },
          minimap: { enabled: false },
        }}
      />
      {showPreview && (
        <Popup
          title="Preview"
          positioning="center"
          clickCatchStyle={{ opacity: 1 }}
          onClose={() => setShowPreview(false)}
        >
          <div
            style={{ maxWidth: "600px" }}
            dangerouslySetInnerHTML={{ __html: sanitize(parseBody()) }}
          ></div>
        </Popup>
      )}
    </FlexCol>
  );
};
