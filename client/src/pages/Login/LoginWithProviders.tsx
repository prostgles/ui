import { mdiFacebook } from "@mdi/js";
import { getObjectEntries } from "prostgles-types";
import React from "react";
import type { PrglState } from "../../App";
import Btn from "../../components/Btn";
import { FlexRowWrap } from "../../components/Flex";
import { FacebookIcon, GithubIcon, GoogleIcon, MicrosoftIcon } from "./SocialIcons";

export const LoginWithProviders = ({ auth }: Pick<PrglState, "auth">) => {
  const { user } = auth
  if (user && user.type !== "public") return null
  return <FlexRowWrap>
    {getObjectEntries(auth.login?.withProvider ?? {}).map(([providerName, func]) => {
      return <Btn
        key={providerName}
        onClick={func}
        title={`Login with ${providerName}`}
        children={
          providerName === "google"? <GoogleIcon /> : 
          providerName === "microsoft"? <MicrosoftIcon /> : 
          providerName === "github"? <GithubIcon /> : 
          providerName === "facebook"? <FacebookIcon /> : 
          null
        }
      />
    })}
  </FlexRowWrap>
}
