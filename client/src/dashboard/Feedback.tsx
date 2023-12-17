
import { mdiMessageBookmarkOutline } from "@mdi/js";
import React, { useState } from "react";
import { Success } from "../components/Animations";
import Btn from "../components/Btn";
import ErrorComponent from "../components/ErrorComponent";
import FormField from "../components/FormField/FormField";
import Popup from "../components/Popup/Popup";
import { POST } from "../pages/Login";
import { useIsMounted } from "./Backup/CredentialSelector";

export function Feedback(){
  const getIsMounted = useIsMounted()
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedBack] = useState<{
      email?: string;
      details: string;
      success?: boolean;
      error?: any;
      sending?: boolean;
    }>({
      email: "",
      details: "",
    })

  return <>
    <Btn className=" text-white bg-gray-700"
      title="Leave feedback"
      iconPath={mdiMessageBookmarkOutline}
      style={{
        color: "var(--gray-100)",
        background: "var(--gray-700)"
      }}
      onClick={() => {
        setShowFeedback(true)
      }}
    >
      {window.isMediumWidthScreen? null : `Feedback`}
    </Btn>

    {showFeedback && 
      <Popup 
        title="Send feedback"
        positioning="top-center"
        onClose={() => {
          setShowFeedback( false)
        }}
        footerButtons={[
          {
            label: "Cancel",
            variant: "outline",
            onClick: () => { 
              setFeedBack({ email: "", details: "" })
              setShowFeedback( false)
            }
          },
          {
            label: "Send",
            variant: "filled",
            color: "action",
            disabledInfo: (feedback.sending && !feedback.error)? "Already sent" : !feedback.details? "Must provide some details" : undefined,
            onClickPromise: async () => {
              try {
                setFeedBack({ ...feedback, sending: true });
                const res = await POST("https://prostgles.com/feedback", feedback);
                const resp = await res.json();
                if(resp.error) throw resp.error;
                setFeedBack({ ...feedback, success: true });
                setTimeout(() => {
                  if(getIsMounted()){
                    setFeedBack({ email: "", details: "" })
                    setShowFeedback( false)
                  }
                }, 3000);
              } catch(error){
                setFeedBack({ ...feedback, error })
              }
            }
          }
        ]}
      >
        {feedback.success && <div className="flex-col">
          <Success />
          <p>Feedback was sent! Thanks a lot!</p>
        </div>}
        {feedback.error && <ErrorComponent error={feedback.error} />}
        <FormField id="email" type="email" label="Email (optional)" asColumn={true}
          value={feedback.email} 
          onChange={email => {
            setFeedBack({ ...feedback, email })
          }} 
        />
        <FormField id="text" type="text" label="Details" asColumn={true}
          className="mt-1"
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
    </Popup>}
  </>
}