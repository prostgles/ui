import React from 'react';
import FormField from '../components/FormField/FormField';
import Checkbox from '../components/Checkbox';
import { NavLink } from 'react-router-dom';
import { get } from '../utils';
import Loading from '../components/Loading';

export default class Register extends React.Component<{ passport: any } & any, any> {
  state = {
    first_name: "",
    city: "",
    city_err: "",
    cities: ["", "London", "Frankfurt"],
    first_name_err: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    post_code: "",
    skills: [
      {name: "Cleaning", info: "", checked: false},
      {name: "Babysitting", info: "", checked: false},
      {name: "Removals", info: "", checked: false}
    ],
    passport: "",
    passport_err: "",
    crb: "",
    crb_err: "",
    photo: "",
    photo_err: "",
    acceptedTOS: false,
    acceptedTOSErr: "",
    error: "",
    registered: "",
    registering: false
  }

  submit = async () => {
    const { 
      acceptedTOS, passport, city, first_name, last_name, email, phone, 
      address, post_code, skills, crb, photo
    } = this.state;

    const { db, methods } = this.props;
    let valid = true;

    [
      "city",
      "first_name", 
      "last_name",
      "email",
      "phone",
      "address",
      "post_code",
      "passport",
      "crb",
      "photo"
    ].map(key => {
      if(!this.state[key as "first_name"]){
        this.setState({
          [(key + "_err") as "first_name_err"]: "Cannot be empty"
        });
        valid = false;
      } else {
        this.setState({
          [(key + "_err") as "first_name_err"]: ""
        });
      }
    });

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
        let res = await methods.registerWorker({
          acceptedTOS, city, first_name, last_name, email, phone, 
          address, post_code, skills,
          crb: { name: get(crb, "name"), type: get(crb, "type"), data: crb }, 
          passport: { name: get(passport, "name"), type: get(passport, "type"), data: passport }, 
          photo: { name: get(photo, "name"), type: get(photo, "type"), data: photo }, 
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
      first_name, skills, acceptedTOS, acceptedTOSErr, 
      passport, passport_err, crb, crb_err, 
      city, cities, city_err, photo, photo_err,
      error, registered, registering
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

    const FFields = [
      { key: "first_name", label: "First Name", type: "text" },
      { key: "last_name", label: "Last Name", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "phone" },
      { key: "address", label: "Address", type: "address" },
      { key: "post_code", label: "Post Code", type: "post_code" },
    ]
    .map((d, i)=> ({ ...d, err_key: d.key + "_err" }))
    .map((d, i)=> (
      <FormField key={i} label={d.label} id={d.key}
        className="mt-1"
        type={d.type}
        value={this.state[(d.key as "first_name")]}
        error={this.state[(d.err_key as "first_name_err")]}
        onChange={(val: string) => {

          let extra = val? { [d.key + "_err"]: "" } : {};
          this.setState({ [d.key]: val, ...extra }) 
        }}
      />
    ))
    return (
      <form 
      // action="register-worker" method="POST" 
      className={rootClass + (registering? " no-interaction " : " ")}
      onSubmit={e => {
        e.preventDefault();
        this.submit();
      }}
      >
        <h1 style={{ marginTop: "12px" }}>Registration</h1>

        <FormField label={"City"} id={"city"}
          className="mt-1"
          type={"city"}
          value={city}
          options={cities}
          error={city_err}
          onChange={(city: string) => {
            let extra = city? { city_err: "" } : {};
            this.setState({ city, ...extra }) 
          }}
        />

        {FFields}


        <h4 className="mt-2 mb-0">Skills</h4>
        {skills.map((s, i) => (
          <div key={i} className={"flex-col rounded b b-gray-300 p-1 mt-1 " + (s.checked? " aactive-border "  : "")} onClick={e => {
            // s.checked = !s.checked;
            //   this.setState({ skills })
          }}>
            <Checkbox id={s.name} checked={s.checked} label={s.name} onChange={(_,val) => {
              s.checked = val;
              this.setState({ skills });
            }}/>
            <textarea onChange={e => {
              s.info = e.target.value;
              this.setState({ skills })
             }} 
             defaultValue={s.info} 
             style={{ width: "100%", marginTop: "1em", display: s.checked? "block" : "none", padding: "1em", borderColor: "#cacaca" }} 
             placeholder="Describe your experience" name="Text1" cols={40} rows={5}></textarea>

          </div>
        ))}

        <h4 className="mt-2 mb-0">Documents</h4>
        <FormField label={"Passport"} id={"passport"}
          className="mt-1"
          type={"file"}
          accept="image/*,.pdf,.zip"
          error={passport_err}
          onChange={(val: any) => { 
            let extra = val[0]? { passport_err: "" } : {};
            this.setState({ passport: val[0], ...extra });
            // methods.upload(val[0], val[0].name)
            // .then((res: any) => { 
            //   console.log(res) 
            // }).catch(console.error);
          }}
        />
        <FormField label={"Criminal record"} id={"criminal_record"}
          className="mt-1"
          type={"file"}
          accept="image/*,.pdf,.zip"
          error={crb_err}
          onChange={(val: string) => { 
            let extra = val[0]? { crb_err: "" } : {};
            this.setState({ crb: val[0], ...extra })
          }}
        />
        <FormField label={"Profile photo"} id={"photo"}
          className="mt-1"
          type={"file"}
          accept="image/x-png,image/gif,image/jpeg"
          error={photo_err}
          onChange={(val: any) => { 
            let extra = val[0]? { photo_err: "" } : {};
            this.setState({ photo: val[0], ...extra }) 
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

        {/* <img src="/media/Screenshot%20from%202020-11-20%2018-59-12.png" /> */}

        <div className="flex-row-wrap" style={{ justifyContent: "flex-end", marginTop: "2em"}}>
          <button type="button" className="secondary mt-1 mr-1">Cancel</button>
          <button type="submit" className="mt-1" >{registering? (<Loading style={{ margin: "-4px 10px"}} />) : "Submit"}</button>
        </div>
      </form>
    )
  }
}