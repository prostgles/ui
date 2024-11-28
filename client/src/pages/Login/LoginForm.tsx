import React from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import FormField from "../../components/FormField/FormField";
import { useLoginState } from "./useLoginState";
import { LoginWithProviders } from "./LoginWithProviders";
import { LoginTotpFormFields } from "./LoginTotpForm";
import { FlexCol } from "../../components/Flex";

export type LoginFormProps = Pick<Prgl, "auth">;

export const LoginForm = ({ auth }: LoginFormProps) => {

  console.log({ auth });
  const authState = useLoginState({ auth });
  const { formHandlers, isOnLogin, registerTypeAllowed, setState, error, onAuthCall } = authState;

  return <form 
    className="LoginForm flex-col gap-1 rounded shadow m-auto w-fit bg-color-0"
    style={{ 
      maxWidth: "400px",
      minWidth: "380px"
    }}
    onSubmit={e => {
      e.preventDefault();
    }}
  >
    <FlexCol className="p-2 pb-1">
      <h2 className="mt-0">{!isOnLogin? "Sign up" : "Sign in"}</h2>
      {formHandlers?.setUsername && 
        <FormField 
          id="username" 
          label="Email"
          value={formHandlers.username} 
          type="username" 
          onChange={formHandlers.setUsername} 
        />
      }
      {formHandlers?.setPassword &&  
        <FormField 
          id="password" 
          label="Password"
          value={formHandlers.password} 
          type="password" 
          onChange={formHandlers.setPassword} 
        />
      }
      {formHandlers?.setConfirmPassword && 
        <FormField 
          id="new-password" 
          label="Confirm password"
          value={formHandlers.confirmPassword} 
          type="password"
          autoComplete="new-password" 
          onChange={formHandlers.setConfirmPassword} 
        />
      }

      <LoginTotpFormFields { ...authState } />

      {error && <ErrorComponent data-command="Login.error" error={error} />}

      <Btn 
        onClickMessage={async (_, setM) => {
          setM({ loading: 1 });
          onAuthCall().finally(() => {
            setM({ loading: 0 });
          });
        }}
        variant="filled"
        className="mt-1"
        color="action"
        children={isOnLogin? "Sign in" : "Sign up"}
        size="large"
        style={{ width: "100%" }}
      />
      <LoginWithProviders auth={auth} />
    </FlexCol>
    {!formHandlers && <ErrorComponent error="Invalid state" />}
    {auth.register &&  
      <Btn
        style={{ fontSize: "14px", width: "100%", borderTopLeftRadius: 0, borderTopRightRadius: 0 }} 
        variant="faded"
        color="action"
        onClick={() => {
          setState(isOnLogin? registerTypeAllowed : "login");
        }}
      >
        {isOnLogin? "No account? Sign up with email" : "Already have an account? Sign in"}
      </Btn>
    }
  </form>
}


// const login = async (formData: LoginFormData) => {
//   // const { username, password, remember_me, totp_token, totp_recovery_code, showTOTP } = this.state;
//   if(showTOTP === "token" && !totp_token || showTOTP === "recovery" && !totp_recovery_code){
//     this.setState({ error: "Must provide a token/recovery code" });
//     return;
//   }
//   const badCredentials = { 
//     error: "Provided credentials are not correct" 
//   };

//   if(!username || !password){
//     this.setState({ error: "Username/password cannot be empty" });
//   } else {
//     try {
//       const { pathname, search } = window.location;
//       const content = await POST(pathname + search, { username, password, remember_me, totp_token, totp_recovery_code });
      
//       if(content.status === 200){
//         window.location.href = content.url;
//       } else {
//         const txtErr = await content.json();
        
//         if(txtErr.err === "Token missing"){
//           this.setState({ showTOTP: "token" });
//         } else if(txtErr.err === "inactive") {
//           this.setState({ error: "Your account is not active" });
//         } else if(txtErr.err === "no match") {
//           this.setState(badCredentials);
//         } else {
//           this.setState({ error: txtErr.err });
//         }
//       }
//     } catch(err: any){
//       console.error(err)
//       if(err && err.content && err.content.reason === "pending"){
//         this.setState({ error: "Your account has not been approved yet" });
//       } else {
//         this.setState(badCredentials);
//       }
//     }
//   }
// }