import { mdiArrowLeft, mdiLogin } from "@mdi/js";
import React from "react";
import ErrorComponent from "../../components/ErrorComponent";
import type { PrglState } from "../../App";
import Btn from "../../components/Btn";

import { useParams } from "react-router-dom";
import { ROUTES } from "../../../../common/utils";
import type { Command } from "../../Testing";
import { FlexCol, FlexRow } from "../../components/Flex";
import { t } from "../../i18n/i18nUtils";
import { type PrglProjectState } from "./useProjectDb";

type P = {
  projectDb: Extract<PrglProjectState, { state: "error" }>;
  prglState: PrglState;
};
export const ProjectConnectionError = (props: P) => {
  const params = useParams();
  const { prglState, projectDb } = props;

  const canLogin =
    !prglState.auth.user || prglState.auth.user.type === "public";
  const error = projectDb.error;
  return (
    <FlexCol
      className="ProjectConnectionError flex-col w-full h-full ai-center jc-center p-2 gap-1"
      data-command={"ProjectConnection.error" satisfies Command}
    >
      {projectDb.errorType === "connNotFound" && (
        <div className="p-1">
          This project was not found or you are not allowed to access it
        </div>
      )}
      {!!error && (
        <>
          Database connection error:
          <ErrorComponent error={error} findMsg={true} />
        </>
      )}

      <FlexRow>
        <Btn
          style={{ fontSize: "18px", fontWeight: "bold" }}
          className="mt-1"
          variant="outline"
          asNavLink={true}
          href={`/`}
          iconPath={mdiArrowLeft}
          color="action"
        >
          {t.App.Connections}
        </Btn>
        {canLogin && (
          <Btn
            style={{ fontSize: "18px", fontWeight: "bold" }}
            className="mt-1"
            variant="filled"
            asNavLink={true}
            href={
              ROUTES.LOGIN +
              (!params.connectionId ? "" : (
                `?returnURL=${encodeURIComponent(window.location.pathname + window.location.search)}`
              ))
            }
            iconPath={mdiLogin}
            color="action"
          >
            {t.common.Login}
          </Btn>
        )}
      </FlexRow>
    </FlexCol>
  );
};
