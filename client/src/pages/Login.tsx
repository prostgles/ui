import React from "react";
import type { PopupProps } from "../components/Popup/Popup";
import Popup from "../components/Popup/Popup";
import FormField from "../components/FormField/FormField";
import Btn from "../components/Btn";
import ErrorComponent from "../components/ErrorComponent";
import RTComp from "../dashboard/RTComp";
import { FlexCol } from "../components/Flex";
import { tout } from "./ElectronSetup";

type LoginState = {
  showTOTP?: "token" | "recovery";
  password: string;
  username: string;
  passErr: string;
  remember_me: boolean;
  forgotPassword: boolean;
  resetusername: string;
  totp_token?: string;
  totp_recovery_code?: string;
  error?: any;
  didReset: boolean;
}
export default class Login extends RTComp<any, LoginState> {
  state: LoginState = {
    password: "",
    username: "",
    passErr: "",
    remember_me: false,
    forgotPassword: false,
    resetusername: "",

    didReset: false
  }

  async signIn(){
    const { username, password, remember_me, totp_token, totp_recovery_code, showTOTP } = this.state;
    if(showTOTP === "token" && !totp_token || showTOTP === "recovery" && !totp_recovery_code){
      this.setState({ error: "Must provide a token/recovery code" });
      return;
    }
    const badCredentials = { 
      error: "Provided credentials are not correct" 
    };

    if(!username || !password){
      this.setState({ error: "Username/password cannot be empty" });
    } else {
      try {
        const { pathname, search } = window.location;
        const content = await POST(pathname + search, { username, password, remember_me, totp_token, totp_recovery_code });
        
        if(content.status === 200){
          window.location.href = content.url;
        } else {
          const txtErr = await content.json();
          
          if(txtErr.err === "Token missing"){
            this.setState({ showTOTP: "token" });
          } else if(txtErr.err === "inactive") {
            this.setState({ error: "Your account is not active" });
          } else if(txtErr.err === "no match") {
            this.setState(badCredentials);
          } else {
            this.setState({ error: txtErr.err });
          }
        }
      } catch(err: any){
        console.error(err)
        if(err && err.content && err.content.reason === "pending"){
          this.setState({ error: "Your account has not been approved yet" });
        } else {
          this.setState(badCredentials);
        }
      }
    }
  }

  onDelta(deltaP?: Partial<any> | undefined, deltaS?: Partial<LoginState> | undefined, deltaD?: Partial<{ [x: string]: any; }> | undefined): void {
 
  }

  render(){
    const { username, password, error, forgotPassword, resetusername, didReset, 
      showTOTP, totp_token, totp_recovery_code, 
    } = this.state;

    const ErrorComp = !showTOTP && <ErrorComponent error={error} className="my-1" />;

    const getForgetPasswordPopup = () => {
      if(!forgotPassword) return null;

      const btns: PopupProps["footerButtons"] = [];
      if(didReset) {
        btns.push({
          label: "Reset Password", 
          onClick: async () => {
            if(!this.state.didReset){
              if(!resetusername || !resetusername.trim()){
                this.setState({ error: "Username is required" });
              } else {
                try {
                    // const content = await this.props.postAPI("/api/auth/forgotPassword", { username: resetusername });// rawResponse.json();
                    // console.log(content)
                    this.setState({ didReset: true });
                } catch(err) {
                    console.error(err);
                    this.setState({ error: "Something went wrong" });
                }
              }
            }
          }, 
          color: "action"
        })
      }

      btns.push({ label: "Cancel", onClickClose: true });

      return <Popup 
        title="Forgot your password?"
        footerButtons={btns}
        onClose={()=>{ this.setState({ forgotPassword: false, didReset: false, resetusername: "" })}}
      >
        <div className="mb-1">                    
          <FormField id="username-reset-pwd" type="username" label="Enter the username address associated with your account, and we'll send you a link to reset your password." asColumn={true}
            onChange={(v) => {
              this.setState({ resetusername: v, error: "" })
            }}
          />
          {ErrorComp}
          {didReset && <div className="mt-1 text-green">
            Thanks, we've sent you a password reset link to this username address (unless there is no account associated with it)
          </div>}
        </div>
      </Popup>
    }

    return (
      <FlexCol 
        className="Login rounded shadow p-2 m-auto w-fit bg-color-0" 
        style={{ 
          maxWidth: "400px",
          paddingBottom: "3em"
        }}
      > 
        <div>
          <h2 className="mt-0">Sign in</h2>
          {/* <p className="mt-2 text-sm leading-5 text-1 max-w">
            Or
            <NavLink to="/register">
              register
            </NavLink>
          </p> */}
        </div>
        <form 
          className="flex-col gap-1"
          onSubmit={e => {
            e.preventDefault();
          }}
        >
          {showTOTP === "token"? <>
            <p>Open your authentication app and enter the code for Prostgles UI</p>
            <FormField 
              id="totp_token" 
              value={totp_token}
              inputProps={{
                id: "totp_token",
              }}
              type="number" 
              label="6-digit code" 
              error={error}
              onChange={(v) => {
                this.setState({ totp_token: v, error: "" }, () => {
                  if((this.state.totp_token?.length ?? 0) > 5){ 
                    this.signIn();
                  }
                });
              }}
            />
            <div className="flex-row ai-center mt-p25">
              <div className="text-1p5">Or</div> 
              <Btn 
                type="button" 
                color="action" 
                size="small" 
                onClick={() => { this.setState({ showTOTP: "recovery" }) }}
              >
                Enter recovery code
              </Btn>
            </div>
          </> : showTOTP === "recovery"? <>
            <p>Open your authentication app and enter the code for Prostgles UI</p>
            <FormField 
              id="totp_recovery_code" 
              inputProps={{
                id: "totp_recovery_code",
              }}
              value={totp_recovery_code} 
              type="text" 
              label="2FA Recovery code" 
              error={error}
              onChange={(v) => {
                this.setState({ totp_recovery_code: v, error: "" });
              }} 
            />
            <Btn type="button" color="action" size="small" onClick={() => { this.setState({ showTOTP: "token" }) }}>Cancel</Btn>
          </> : <>
            <FormField id="username" value={username} type="username" label="Username"
              onChange={(v) => {
                this.setState({ username: v, error: "" });
              }} 
            />
            <FormField id="password" value={password} type="password" label="Password"
              onChange={(v) => {
                this.setState({ password: v, error: ""  });
              }} 
            />

          </>}
            {/* <div className="my-1 flex-row-wrap ai-center">
              <Checkbox className="" id="r" label="Remember me"/>

              <div className="ml-2 text-sm leading-5">
                <a href="#" onClick={() =>{ this.setState({ forgotPassword: true }) }} className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline transition ease-in-out duration-150">
                  Forgot your password?
                </a>
              </div>
            </div> */}

          {ErrorComp}

          <Btn type="submit" 
            className="mt-1 w-full text-sm font-medium"
            onClickMessage={async (e, setM) => {
              setM({ loading: 1 });
              this.signIn().finally(() => {
                setM({ loading: 0 });
              });
            }}
            size="large"
            variant="filled"
            color="action"
            style={{ width: "100%" }}
          >
            Sign in
          </Btn>
        </form>

        {getForgetPasswordPopup()}
      </FlexCol>
    );
  }
} 


export const POST = async (path: string, data: object) => {
  
  const rawResponse = await fetch(path, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  
  return rawResponse;   
}