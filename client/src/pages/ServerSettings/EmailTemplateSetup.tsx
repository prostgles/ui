import React from "react";
import { FlexCol } from "../../components/Flex";
import { Label } from "../../components/Label";
import FormField from "../../components/FormField/FormField";
import CodeEditor from "../../dashboard/CodeEditor/CodeEditor";

export type EmailTemplateConfig = {
  from: string;
  subject: string;
  body: string;
};

type P = {
  value: EmailTemplateConfig | undefined;
  onChange: (newValue: P["value"]) => void;
  style?: React.CSSProperties;
  className?: string;
  label: string;
};
export const EmailTemplateSetup = ({
  value,
  onChange,
  style,
  className,
  label,
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

  return (
    <FlexCol
      style={{
        minHeight: "300px",
        minWidth: "500px",
      }}
      className={className}
    >
      <Label label={label} />
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
      <CodeEditor
        language={"html"}
        value={value?.body ?? ""}
        onChange={(body) => onFieldChange({ body })}
        options={{
          lineNumbers: "off",
          minimap: { enabled: false },
        }}
      />
    </FlexCol>
  );
};
