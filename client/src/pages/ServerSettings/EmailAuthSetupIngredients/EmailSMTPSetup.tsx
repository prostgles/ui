import React from "react";
import { type DivProps, FlexCol } from "../../../components/Flex";
import FormField from "../../../components/FormField/FormField";
import Select from "../../../components/Select/Select";
import type { EmailSMTPCofig } from "./EmailSMTPAndTemplateSetup";
import { SwitchToggle } from "../../../components/SwitchToggle";

type P = Pick<DivProps, "style" | "className"> & {
  value: EmailSMTPCofig | undefined;
  onChange: (newValue: NonNullable<P["value"]>) => void;
};

const providerOptions = [
  {
    key: "smtp",
    label: "SMTP Server",
    subLabel: "Standard SMTP configuration",
  },
  { key: "aws-ses", label: "AWS SES", subLabel: "Amazon Simple Email Service" },
] as const;

export const EmailSMTPSetup = ({ value, onChange }: P) => {
  const handleProviderChange = (
    type: (typeof providerOptions)[number]["key"],
  ) => {
    if (type === "smtp") {
      onChange({
        type: "smtp",
        host: "",
        port: 587,
        user: "",
        pass: "",
      });
    } else {
      onChange({
        type: "aws-ses",
        region: "",
        accessKeyId: "",
        secretAccessKey: "",
        sendingRate: 1,
      });
    }
  };

  return (
    <FlexCol>
      <Select
        label="Email provider"
        fullOptions={providerOptions}
        value={value?.type ?? "None"}
        onChange={handleProviderChange}
      />
      {!value ?
        null
      : value.type === "smtp" ?
        <>
          <FormField
            id="smtp-Host"
            label="Host"
            value={value.host}
            onChange={(host) => onChange({ ...value, host })}
          />
          <FormField
            id="smtp-Port"
            label="Port"
            type="number"
            value={value.port}
            onChange={(port) => onChange({ ...value, port: Number(port) })}
          />
          <FormField
            id="smtp-Username"
            label="Username"
            value={value.user}
            onChange={(user) => onChange({ ...value, user })}
          />
          <FormField
            id="smtp-Password"
            label="Password"
            value={value.pass}
            onChange={(pass) => onChange({ ...value, pass })}
          />
          <SwitchToggle
            label={"Secure"}
            checked={!!value.secure}
            onChange={(secure) => onChange({ ...value, secure })}
          />
          <SwitchToggle
            label={"Reject unauthorized"}
            checked={!!value.rejectUnauthorized}
            onChange={(rejectUnauthorized) =>
              onChange({ ...value, rejectUnauthorized })
            }
          />
        </>
      : <>
          <FormField
            label="Region"
            type="text"
            value={value.region}
            onChange={(region) => onChange({ ...value, region })}
          />
          <FormField
            label="Access Key ID"
            type="text"
            value={value.accessKeyId}
            onChange={(accessKeyId) => onChange({ ...value, accessKeyId })}
          />
          <FormField
            label="Secret Access Key"
            type="password"
            value={value.secretAccessKey}
            onChange={(secretAccessKey) =>
              onChange({ ...value, secretAccessKey })
            }
          />
          <FormField
            label="Sending Rate (per second)"
            type="number"
            value={value.sendingRate || 14}
            onChange={(sendingRate) =>
              onChange({ ...value, sendingRate: Number(sendingRate) })
            }
          />
        </>
      }
    </FlexCol>
  );
};
