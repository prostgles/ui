import React from "react";
import type { PGDumpParams } from "@common/utils";
import { DESTINATIONS } from "@common/utils";
import { Select } from "@components/Select/Select";
import { CredentialSelector } from "./CredentialSelector";
import type { DumpOptionsProps } from "./DumpOptions";

type P = Pick<DumpOptionsProps, "dbs" | "dbsTables" | "dbsMethods"> & {
  currOpts: PGDumpParams;
  onChangeCurrOpts: (
    newLocation: Pick<PGDumpParams, "credentialID" | "destination">,
  ) => void;
};

export const DumpLocationOptions = ({
  dbs,
  dbsTables,
  dbsMethods,
  currOpts,
  onChangeCurrOpts,
}: P) => {
  const { destination, credentialID } = currOpts;
  return (
    <>
      <Select
        className="mr-1"
        label="Destination"
        fullOptions={DESTINATIONS}
        value={destination}
        onChange={(destination) => {
          onChangeCurrOpts({ destination, credentialID });
        }}
      />
      {destination === "Cloud" && (
        <CredentialSelector
          dbs={dbs}
          dbsTables={dbsTables}
          dbsMethods={dbsMethods}
          selectedId={credentialID}
          onChange={(id) => {
            onChangeCurrOpts({ destination, credentialID: id });
          }}
          pickFirstIfNoOthers={true}
        />
      )}
    </>
  );
};
