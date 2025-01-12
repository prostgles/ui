import { getObjectEntries } from "prostgles-types";
import React from "react";
import type { PrglState } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow, FlexRowWrap } from "../../components/Flex";
import {
  FacebookIcon,
  GithubIcon,
  GoogleIcon,
  MicrosoftIcon,
} from "./SocialIcons";

export const LoginWithProviders = ({ auth }: Pick<PrglState, "auth">) => {
  const { user } = auth;
  if (user && user.type !== "public") return null;
  const providerConfigs = getObjectEntries(auth.loginWithProvider ?? {});
  if (!providerConfigs.length) return null;
  return (
    <FlexCol className="gap-0">
      <FlexRow className="text-2">
        <DividerLine />
        <div className="ws-nowrap">or</div>
        <DividerLine />
      </FlexRow>
      <FlexRowWrap className="LoginWithProviders py-1">
        {providerConfigs.map(([providerName, func]) => {
          const providerIcon =
            providerName === "google" ? <GoogleIcon />
            : providerName === "microsoft" ? <MicrosoftIcon />
            : providerName === "github" ? <GithubIcon />
            : providerName === "facebook" ? <FacebookIcon />
            : null;
          return (
            <Btn
              key={providerName}
              onClick={func}
              title={`Login with ${providerName}`}
              className="shadow"
              style={{ width: "100%", gap: "2em" }}
              color="action"
              children={
                <>
                  {providerIcon} Continue with {providerName}
                </>
              }
            />
          );
        })}
      </FlexRowWrap>
    </FlexCol>
  );
};

const DividerLine = () => (
  <div
    className="DividerLine bg-color-1"
    style={{
      height: "1px",
      width: "100%",
    }}
  ></div>
);
