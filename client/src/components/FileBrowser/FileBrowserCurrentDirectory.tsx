import { useOnErrorAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import { classOverride, FlexRow, FlexRowWrap } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { mdiCheck, mdiClose, mdiFolderPlusOutline } from "@mdi/js";
import React, { useMemo, useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

type P = {
  className?: string;
  path: string;
  existingFolderNames: string[];
  onChange: (filePath: string) => void;
};

export const FileBrowserCurrentDirectory = ({
  path,
  onChange,
  existingFolderNames,
  className,
}: P) => {
  const {
    dbsMethods: { makeDirectory },
  } = usePrglCore();

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
    <FlexRowWrap className={classOverride("gap-0", className)}>
      <span>
        {path.split("/").map((pathPart, index, pathParts) => {
          return (
            <Btn
              key={pathPart + index}
              variant="text"
              size="small"
              className="underline-on-hover"
              style={{
                paddingRight: 0,
                fontSize: "18px",
                minWidth: 0,
                userSelect: "auto",
                whiteSpace: "nowrap",
                display: "inline",
              }}
              onClick={() => {
                const selectedPath =
                  pathParts.slice(0, index + 1).join("/") || "/";
                onChange(selectedPath);
              }}
            >
              {!index ?
                "/"
              : index > 1 ?
                `/${pathPart}`
              : pathPart}
            </Btn>
          );
        })}
      </span>
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
                      if (!makeDirectory) {
                        throw new Error("Not allowed to create folders");
                      }
                      const newFolderPath = await makeDirectory({
                        path,
                        folderName: newFolderName,
                      });
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
