import type { PGDumpParams } from "@common/utils";
import { DESTINATIONS } from "@common/utils";
import { Select } from "@components/Select/Select";
import React from "react";
import { CloudStorageCredentialSelector } from "./CloudStorageCredentialSelector";
import type { DumpOptionsProps } from "./PGDumpOptions";

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
        data-command="PGDumpOptions.destination"
        value={destination}
        variant="button-group"
        onChange={(destination) => {
          onChangeCurrOpts({ destination, credentialID });
        }}
      />
      {destination === "Cloud" && (
        <CloudStorageCredentialSelector
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
