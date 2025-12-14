import { useOnErrorAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import { FlexRow, FlexRowWrap } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { mdiCheck, mdiClose, mdiFolderPlusOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useMemo, useState } from "react";

type P = {
  path: string;
  existingFolderNames: string[];
  onChange: (filePath: string) => void;
};

export const FileBrowserCurrentDirectory = ({
  path,
  onChange,
  existingFolderNames,
}: P) => {
  const {
    dbsMethods: { mkdir },
  } = usePrgl();

  const { onErrorAlert } = useOnErrorAlert();
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderError = useMemo(() => {
    if (!newFolderName) return;
    if (newFolderName.includes("/")) {
      return "Folder name cannot contain '/'";
    }
    if (existingFolderNames.includes(newFolderName)) {
      return "A folder with this name already exists";
    }
    return;
  }, [existingFolderNames, newFolderName]);

  return (
    <FlexRowWrap className="gap-0">
      {path.split("/").map((pathPart, index, pathParts) => {
        return (
          <React.Fragment key={pathPart + index}>
            {index > 1 && <div>/</div>}
            <Btn
              variant="text"
              size="small"
              className="underline-on-hover"
              style={{
                paddingRight: 0,
                fontSize: "18px",
                minWidth: 0,
              }}
              onClick={() => {
                const selectedPath =
                  pathParts.slice(0, index + 1).join("/") || "/";
                onChange(selectedPath);
              }}
            >
              {!index ? "/" : pathPart}
            </Btn>
          </React.Fragment>
        );
      })}
      {!newFolderName ?
        <Btn
          iconPath={mdiFolderPlusOutline}
          size="small"
          title="New Folder"
          color="action"
          className="ml-1"
          onClick={() => {
            if (!newFolderName) {
              const defaultFolderName = "New Folder";
              setNewFolderName(defaultFolderName);
            }
          }}
        />
      : <FlexRow>
          <FormField
            type="text"
            value={newFolderName}
            className="ml-1"
            inputStyle={{
              padding: "2px",
              minHeight: "unset",
            }}
            inputProps={{
              autoFocus: true,
            }}
            onChange={(newValue) => setNewFolderName(newValue)}
            error={newFolderError}
            rightContent={
              <>
                <Btn
                  size="small"
                  title="Cancel"
                  onClick={() => setNewFolderName("")}
                  iconPath={mdiClose}
                />
                <Btn
                  size="small"
                  title="Create"
                  onClick={() => {}}
                  iconPath={mdiCheck}
                  disabledInfo={newFolderError}
                  onClickPromise={async () => {
                    await onErrorAlert(async () => {
                      if (!mkdir) {
                        throw new Error("Not allowed to create folders");
                      }
                      const newFolderPath = await mkdir(path, newFolderName);
                      onChange(newFolderPath);
                      setNewFolderName("");
                    });
                  }}
                />
              </>
            }
          />
        </FlexRow>
      }
    </FlexRowWrap>
  );
};
