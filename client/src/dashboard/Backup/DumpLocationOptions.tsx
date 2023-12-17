import React from "react"
import { DESTINATIONS, PGDumpParams } from "../../../../commonTypes/utils";
import Select from "../../components/Select/Select";
import { CredentialSelector } from "./CredentialSelector";
import { DumpOptionsProps } from "./DumpOptions";
import { Theme } from "../../App";

type P = Pick<DumpOptionsProps, "dbs" | "dbsTables" | "dbsMethods"> & {
  currOpts: PGDumpParams;
  theme: Theme;
  onChangeCurrOpts: (newLocation: Pick<PGDumpParams, "credentialID" | "destination" >) => void;
}

export const DumpLocationOptions = ({ dbs, dbsTables, dbsMethods, currOpts, theme, onChangeCurrOpts }: P) => {

  const { destination, credentialID } = currOpts;
  return <>
    {/* FEATURE FLAG */}
    <Select className="mr-1"
      label="Destination"
      fullOptions={DESTINATIONS}
      value={destination}
      onChange={destination => {
        onChangeCurrOpts({ destination, credentialID });
      }}
    />
    {destination === "Cloud" && <CredentialSelector
      theme={theme} 
      dbs={dbs} 
      dbsTables={dbsTables} 
      dbsMethods={dbsMethods}
      selectedId={credentialID} 
      onChange={id => {
        onChangeCurrOpts({ destination, credentialID: id });
      }}
      pickFirstIfNoOthers={true}
    />}
  </>
}