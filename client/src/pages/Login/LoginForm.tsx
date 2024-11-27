import React from "react"
import { FlexCol } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";

type LoginFormProps = Pick<Prgl, "auth">;

type FormStates = 
| "login" 
| "loginTotp" 
| "loginTotpRecovery" 
| "registerWithPassword" 
| "registerWithMagicLink"
;

const loginStates: FormStates[] = ["login", "loginTotp", "loginTotpRecovery"];

export const LoginForm = ({ auth }: LoginFormProps) => {

  const [state, setState] = React.useState<FormStates>("login");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const showPassword = state === "login" || state === "registerWithPassword";
  const showRepeatPassword = state === "registerWithPassword";

  const getError = () => {
    if(!username) return "Email cannot be empty";
    if(showPassword && !password) return "Password cannot be empty";
    if(showRepeatPassword && password !== confirmPassword) return "Passwords do not match";
    return "";
  }

  const isOnLogin = loginStates.includes(state);
  const registerTypeAllowed: FormStates = auth.register?.withMagicLink? "registerWithMagicLink" : "registerWithPassword";

  return <form 
    className="LoginForm flex-col gap-1"
    onSubmit={e => {
      e.preventDefault();
    }}
  >
    <div>
      <h2 className="mt-0">{!isOnLogin? "Sign up" : "Sign in"}</h2>
    </div>
    <FormField 
      id="username" 
      label="Email"
      value={username} 
      type="username" 
      onChange={(v) => {
        setUsername(v);
        setError("");
      }} 
    />
    {showPassword &&  
      <FormField 
        id="password" 
        label="Password"
        value={password} 
        type="password" 
        onChange={(v) => {
          setPassword(v);
          setError("");
        }} 
      />
    }
    {showRepeatPassword && 
      <FormField 
        id="rnew-password" 
        label="Confirm password"
        value={confirmPassword} 
        type="password"
        autoComplete="new-password" 
        onChange={(v) => {
          setConfirmPassword(v);
          setError("");
        }} 
      />
    }
    <Btn 
      onClick={async () => {
        const error = getError();
        if(error){
          setError(error);
          return;
        }
        if(isOnLogin){
          await auth.login?.withPassword!({ username, password });
        } else if(state === "registerWithMagicLink"){
          if(!auth.register?.withMagicLink) {
            setError("Registration with magic link is not allowed");
            return;
          }
          
          await auth.register.withMagicLink({ username });
        } else if(state === "registerWithPassword"){
          if(!auth.register?.withPassword) {
            setError("Registration with password is not allowed");
            return;
          }
          const res = await auth.register.withPassword!({ username, password });
          if(!res.success){
            setError(res.error);
          }
        }
      }}
      variant="filled"
      className="mt-1"
      color="action"
      children={isOnLogin? "Sign in" : "Sign up"}
      size="large"
      style={{ width: "100%" }}
    />
    {auth.register &&  
      <Btn
        style={{ fontSize: "14px" }} 
        variant="text"
        onClick={() => {
          setState(isOnLogin? registerTypeAllowed : "login");
        }}
      >
        {isOnLogin? "Don't have an account? Sign up with email" : "Already have an account? Sign in"}
      </Btn>
    }
    {error && <ErrorComponent error={error}/>}
  </form>
}