import React from "react";
import { type DivProps, FlexCol } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import Select from "../../components/Select/Select";
import { isDefined } from "../../utils";
import type { AuthProvidersConfig } from "./AuthProvidersSetup";
import PopupMenu from "../../components/PopupMenu";
import Btn from "../../components/Btn";

type P = Pick<DivProps, "style" | "className"> & {
  value: Extract<NonNullable<AuthProvidersConfig["email"]>, { signupType: "withMagicLink" }>["emailMagicLink"] | undefined;
  label: string;
  optional: boolean;
  onChange: (newValue: P["value"]) => void;
}

const providerOptions = [
  { key: "smtp", label: "SMTP Server", subLabel: "Standard SMTP configuration" },
  { key: "aws-ses", label: "AWS SES", subLabel: "Amazon Simple Email Service" },
] as const;

export const EmailSMTPSetup = ({ value, optional, onChange, style, className, label }: P) => {

  const options = [
    optional? { key: "None", subLabel: "" } : undefined,
    ...providerOptions,
  ].filter(isDefined)

  const handleProviderChange = (type: (typeof options)[number]["key"]) => {
    if(type === "None") {
      return onChange(undefined);
    }
    if (type === "smtp") {
      onChange({
        type: "smtp",
        host: "",
        port: 587,
        secure: false,
        user: "",
        pass: "",
      });
    } else if (type === "aws-ses") {
      onChange({
        type: "aws-ses",
        region: "",
        accessKeyId: "",
        secretAccessKey: "",
        sendingRate: 1,
      });
    }
  };

  const content = <FlexCol>
    <Select 
      label="Email provider"
      fullOptions={options}
      value={value?.type ?? "None"}
      onChange={handleProviderChange}
    />
    {
      !value? null :
      value.type === "smtp"? (
        <>
          <FormField
            label="Host"
            value={value.host}
            onChange={(host) => onChange({ ...value, host })}
          />
          <FormField
            label="Port"
            type="number"
            value={value.port}
            onChange={(port) => onChange({ ...value, port: Number(port) })}
          />
          <FormField
            label="Username"
            value={value.user}
            onChange={(user) => onChange({ ...value, user })}
          />
          <FormField
            label="Password"
            type="password"
            value={value.pass}
            onChange={(pass) => onChange({ ...value, pass })}
          />
        </>
      ) : (
        <>
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
            onChange={(secretAccessKey) => onChange({ ...value, secretAccessKey })}
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
      )
    }
  </FlexCol>

  return <PopupMenu 
    positioning="center"
    title={label}
    button={
      <Btn
        variant="faded"
        color={value? "action" : undefined}
        label={{ label, variant: "normal", className: "mb-p5" }}
      >{value?.type ?? "None"}</Btn>
    }
    className={className}
    style={style}
    clickCatchStyle={{ opacity: 1 }}
    render={pClose => content}
    footerButtons={[
      { label: "Done", color: "action", variant: "faded", onClickClose: true },
    ]}
  />
}