
import { mdiMessageBookmarkOutline } from "@mdi/js";
import React, { useState } from "react";
import { Success } from "../components/Animations";
import Btn from "../components/Btn";
import ErrorComponent from "../components/ErrorComponent";
import FormField from "../components/FormField/FormField";
import { useIsMounted } from "./Backup/CredentialSelector";
import PopupMenu from "../components/PopupMenu";
import { FlexCol } from "../components/Flex";
import type { Prgl } from "../App";

export const Feedback = ({ dbsMethods }: Pick<Prgl, "dbsMethods">) => {
  const getIsMounted = useIsMounted();
  const { sendFeedback } = dbsMethods;
  const [feedback, setFeedBack] = useState<{
      email?: string;
      details: string;
      success?: boolean;
      error?: any;
      sending?: boolean;
    }>({
      email: "",
      details: "",
    });

  if(!sendFeedback) return null;

  return <PopupMenu 
      title="Send feedback"
      positioning="beneath-left"
      clickCatchStyle={{ opacity: .5 }}
      onClickClose={false}
      onClose={() => {
        setFeedBack({
          email: feedback.email,
          details: "",
        })
      }}
      button={(
        <Btn 
          title="Leave feedback"
          variant="faded"
          iconPath={mdiMessageBookmarkOutline}
        >
          {window.isMediumWidthScreen? null : `Feedback`}
        </Btn>
      )}
      footerButtons={(feedback.sending || feedback.success)? undefined : (pClose => [
        {
          label: "Cancel",
          variant: "outline",
          onClick: (e) => { 
            setFeedBack({ email: "", details: "" })
            pClose?.(e)
          }
        },
        {
          label: "Send",
          variant: "filled",
          color: "action",
          disabledInfo: (feedback.sending && !feedback.error)? "Already sent" : !feedback.details? "Must provide some details" : undefined,
          onClickPromise: async (e) => {
            try {
              setFeedBack({ ...feedback, sending: true });
              await sendFeedback(feedback);
              setFeedBack({ ...feedback, success: true });
              setTimeout(() => {
                if(getIsMounted()){
                  setFeedBack({ email: "", details: "" })
                  pClose?.(e)
                }
              }, 3000);
            } catch(error){
              setFeedBack({ ...feedback, error })
            }
          }
        }
      ])}
    > 
      <FlexCol>
        {feedback.success?
          <>
            <Success />
            <p>Feedback was sent! Thanks a lot!</p>
          </> : 
        feedback.error? <ErrorComponent error={feedback.error} /> : <>
          <FormField 
            id="email" 
            type="email" 
            label="Email (optional)"
            value={feedback.email} 
            onChange={email => {
              setFeedBack({ ...feedback, email })
            }} 
          />
          <FormField id="text" 
            type="text" 
            label="Details"
            value={feedback.details}
            asTextArea={true} 
            onChange={details => {
              if(details.length < 500){
                setFeedBack({ ...feedback, details })
              }
            }}
            hint={`${500-`${feedback.details}`.length}/500`}
          />
          <p>Other options: <a target="_blank" href="https://github.com/prostgles/ui/issues/new/choose">open an issue</a> or <a href="mailto:prostgles@protonmail.com">email us</a></p>
        </>}
      </FlexCol>
  </PopupMenu>
}