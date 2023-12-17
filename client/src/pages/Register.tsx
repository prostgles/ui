import React from 'react';
import FormField from '../components/FormField/FormField';
import Checkbox from '../components/Checkbox';
import { NavLink } from 'react-router-dom';
import { get } from '../utils';
import Loading from '../components/Loading';

export default class Register extends React.Component<{ passport: any } & any, any> {
  state = {
    name: "",
    email: "",
    password: "",
    passwordConfirmation: "",


    registered: false,
    registering: false,
    acceptedTOS: false,
    acceptedTOSErr: "",
    error: "",

    name_err: "",
    email_err: "",
    password_err: "",
    passwordConfirmation_err: "",
  }

  submit = async () => {
    const { 
      name,
      email,
      password,
      passwordConfirmation,

      registered = false,
      registering = false,
      acceptedTOS = false,
      acceptedTOSErr = "",
      error = "",
  
      name_err,
      email_err,
      password_err,
      passwordConfirmation_err,
    } = this.state;

    const { db, methods } = this.props;
    let valid = true;


    if(!acceptedTOS){
      valid = false;
      this.setState({ acceptedTOSErr: "You must agree to our terms"});
    } else {
      this.setState({ acceptedTOSErr: ""});
    }
    // const res = await methods.upload(passport, get(passport, "name"));//.then(console.log).catch(console.error)
    // const { name, local_url } = res;
    // methods.getFileURL(name).then(console.log);
    // console.log(local_url)
    if(valid){
      this.setState({ registering: true });
      try {
        let res = await methods.register({
          name,
          email,
          password,
          acceptedTOS,
        });
        this.setState({ registering: false, registered: "Registration has been received. You will soon be contacted to attend an interview. Thank you!"})
      } catch(err) {
        this.setState({ error: get(err, "err") || err, registering: false })
      }
    }
  }

  render(){
    const rootClass = "card my-1 flex-col max-w m-auto bg-0";
    const { 
      name,
      email,
      password,
      passwordConfirmation,

      registered = false,
      registering = false,
      acceptedTOS = false,
      acceptedTOSErr = "",
      error = "",
  
      name_err,
      email_err,
      password_err,
      passwordConfirmation_err,
    } = this.state;

    const { db, methods } = this.props;

    if(registered){
      return (
        <div className={rootClass}>
          <p className="text-lg font-bold text-gray-600">Thank you, registration has been received!</p>
          <p className="text-lg font-bold text-gray-600">You will soon be contacted to schedule an interview</p>
          <NavLink to="/">Home</NavLink>
        </div>
      );
    }

    return (
      <form 
      // action="register-worker" method="POST" 
      className={rootClass + (registering? " no-interaction " : " ")}
      onSubmit={e => {
        e.preventDefault();
        this.submit();
      }}
      >
        <h1 style={{ marginTop: "12px" }}>Register</h1>


        <FormField label={"Name"} id={"name"}
          className="mt-1"
          type={"name"}
          error={name_err}
          onChange={(name: string) => {
            this.setState({ name })
          }}
        />
        <FormField label={"Email"} id={"email"}
          className="mt-1"
          type={"email"}
          error={email_err}
          onChange={(email: any) => {
            this.setState({ email }) 
          }}
        />
        <FormField label={"Password"} id={"password"}
          className="mt-1"
          type={"password"}
          error={password_err}
          onChange={(email: any) => {
            this.setState({ email }) 
          }}
        />
        <FormField label={"Repeat password"} id={"repeat_password"}
          className="mt-1"
          type={"password"}
          error={passwordConfirmation_err}
          onChange={(passwordConfirmation: any) => {
            this.setState({ passwordConfirmation }) 
          }}
        />


        <h4 className="mt-2 mb-0">Terms</h4>
        <div className="mt-1">
            <div className="flex  pointer pt-2">
                <input checked={acceptedTOS} onChange={e => {
                    const extra = e.target.checked? {} : {  acceptedTOSErr: "" };
                    this.setState({ acceptedTOS: e.target.checked, ...extra  })
                }} id="tos" type="checkbox" className="pointer"/>
                <label htmlFor="tos" className="ml-p5 pointer noselect">
                    I've read and accepted your <NavLink to="/tos" className="link-anchor">terms and conditions</NavLink> and <NavLink to="/privacy" className="link-anchor">privacy policy</NavLink>
                </label>
            </div>
            <p className={"mt-2 text-sm text-red-600 " + (acceptedTOSErr? " block " : " hidden ")} id="tos-error">{acceptedTOSErr}</p>
        </div>

        <p className={"mt-2 text-sm text-red-600 " + (error? " block " : " hidden ")}>{error}</p>

        <div className="flex-row-wrap" style={{ justifyContent: "flex-end", marginTop: "2em"}}>
          <button type="button" className="secondary mt-1 mr-1">Cancel</button>
          <button type="submit" className="mt-1" >{registering? (<Loading style={{ margin: "-4px 10px"}} />) : "Submit"}</button>
        </div>
      </form>
    )
  }
}