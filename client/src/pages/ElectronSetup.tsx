import { mdiArrowLeft, mdiArrowRight } from "@mdi/js";
import React, { useEffect, useState } from 'react'; 
import { AppState } from "../App";
import Btn from "../components/Btn";
import ErrorComponent from "../components/ErrorComponent"; 
import Loading from "../components/Loading";
import { pickKeys } from "../utils";
import { POST } from "./Login";
import { NewConnectionForm } from "./NewConnection/NewConnectionForm";
import { Connection, DEFAULT_CONNECTION } from "./NewConnection/NewConnnection";
import { FlexCol } from "../components/Flex";
import { OS, PostgresInstallationInstructions } from "./PostgresInstallationInstructions";

type ElectronSetup = {
  serverState: AppState["serverState"]
}

export const getOS = () => {
  const { platform } = window.navigator;
  const os: OS = platform.startsWith("Mac")? "macosx" : 
    (platform.startsWith("Linux") || platform.includes("BSD"))? "linux" : 
    "windows";
  return os;
}

export const ElectronSetup = ({ serverState }: ElectronSetup) => {

  const [c, setC] = useState<Connection>(DEFAULT_CONNECTION);
  const [validationWarning, setvalidationWarning] = useState<any>();

  const [loading, setLoading] = useState(false);

  const updateConnection = async (con: Partial<Connection>) => {
    setLoading(false);
    const newData = { 
      ...c,
      ...con,
    }
    
    const res = await postConnection(newData, true)

    const { connection, warning } = res;


    setvalidationWarning(warning);
    if(connection){
      setC(connection);
    }
  }

  const os = getOS();

  useEffect(() => {
    setC(c => ({
      ...c,
      ...(os === "windows" && { db_ssl: "disable" }),
    }))
  }, [])

  const [step, setStep] = useState(0);

  const error = serverState?.connectionError || serverState?.initError;

  return (
    <FlexCol className=" m-auto">
      {/* <div className="flex-row gap-1 ai-center mx-1">
        <DashboardMenuBtn style={{ border: "unset", background: "unset" }} />
        <h3 className="m-0 text-gray-800">Prostgles Desktop</h3>
      </div> */}
      <div className="ta-center p-2  flex-col gap-2 max-w-700 o-auto  p-1" style={{ width: "500px" }}>

      {!step? <div>
          <h3>PRIVACY</h3>
          <section className="ta-left  font-18">
            The only data we collect is the information you send us through the "Send feedback" button.
          </section>
        </div> :
        step === 1?
        <div>
          <h3>REQUIREMENTS</h3>
          <section className="ta-left font-18">
            <strong>Prostgles Desktop</strong> requires full access to a postgres database. 
            <p>This database will be used to manage and store all connection and state data (database connection details, sql queries, workspaces, etc).</p> 
            <p className="m-0 mt-p5">For best experience we recommend using a locally installed database</p>
            <div className="flex-row-wrap gap-2 f-1 mt-1">
              <PostgresInstallationInstructions os={os} placement="state-db" />
            </div>
          </section>
          </div> : 
            <div className="flex-col gap-1">
              
              {(loading && !validationWarning)? 
                <Loading 
                  id="main" 
                  className="m-auto" 
                  message="Connecting to electron state database" 
                /> : 
                <FlexCol className="px-p25 min-s-0 o-auto">
                  <h2>State database</h2>
                  <NewConnectionForm 
                    mode="insert"
                    warning={validationWarning}
                    c={c} 
                    nameErr={""} 
                    isForStateDB={true}
                    updateConnection={updateConnection} 
                    test={{
                      status: "",
                      statusOK: false,
                    }}
                    dbProps={undefined} 
                  />
                </FlexCol>}

                {error && <ErrorComponent 
                  className="rounded bg-red-100 b b-red-400 f-0" 
                  withIcon={true} 
                  error={pickKeys(serverState, ["connectionError", "initError"], true)} 
                />}
                {!loading && <Btn color="action" 
                  variant="filled" 
                  className="ml-auto"
                  onClickMessage={async (e, setMsg) => {
                    setLoading(true);
                    try {

                      const resp = await postConnection(c, false);
                      if(resp.warning){
                        setvalidationWarning(resp.warning)
                      } else {
                        await tout(3000);
                        window.location.reload();
                        setLoading(false);
                      }
                    } catch(err){
                      setvalidationWarning(err);
                      setLoading(false);
                    }
                    
                  }}
                >
                  Done
                </Btn>}
            </div>
          }
            

          {step < 2 && <div className="flex-row f-1 mt-2" style={{ justifyContent: "space-between" }}>
            <Btn onClick={() => { setStep(s => Math.max(0, s-1)) }} iconPath={mdiArrowLeft} variant="outline" style={{ opacity: step? 1 : 0 }} >Back</Btn>
            <Btn onClick={() => { setStep(s => Math.min(2, s+1)) }} iconPosition="right" iconPath={mdiArrowRight} color="action" variant="filled"style={{ opacity: step < 2? 1 : 0 }} >Next</Btn>
          </div>}

      </div>
    </FlexCol>
  );
}


const postConnection = async (c: Connection, validate = false): Promise<{ connection?: Connection; warning?: any; }> => {
  const res = await POST("/dbs", { ...c, ...(validate? {validate: true} : {}) });

  return await res.json();

}

export const tout = (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, timeout)
  })
}