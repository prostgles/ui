import { getAge } from "@common/utils";
import Btn from "@components/Btn";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { Label } from "@components/Label";
import { SearchList } from "@components/SearchList/SearchList";
import { mdiFileOutline, mdiFolderOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React, { useState } from "react";

type P = {
  onChange: (filePath: string) => void;
};

export const FileBrowser = ({ onChange }: P) => {
  const {
    dbsMethods: { glob },
  } = usePrgl();

  const [currentPath, setCurrentPath] = useState<string>();
  const pathFiles = usePromise(async () => {
    const result = glob ? await glob(currentPath) : undefined;
    setCurrentPath((v) => v || result?.path);
    return result;
  }, [currentPath, glob]);

  return (
    <FlexCol className="min-h-0">
      <FlexRowWrap className="gap-0">
        {currentPath?.split("/").map((pathPart, index, pathParts) => {
          if (pathPart === "") {
            return null;
          }
          return (
            <React.Fragment key={pathPart + index}>
              <div>/</div>
              <Btn
                variant="text"
                size="small"
                className="underline-on-hover"
                onClick={() => {
                  setCurrentPath(pathParts.slice(0, index + 1).join("/"));
                }}
              >
                {pathPart}
              </Btn>
            </React.Fragment>
          );
        })}
      </FlexRowWrap>
      <Label>FileBrowser</Label>
      <SearchList
        key={currentPath}
        className="f-1 min-h-0"
        style={{ maxHeight: "600px" }}
        items={
          pathFiles?.result.map(
            ({ path, type, created, lastModified, name, size }) => ({
              key: path,
              label: name,
              contentLeft: (
                <Icon
                  path={
                    type === "directory" ? mdiFolderOutline : mdiFileOutline
                  }
                />
              ),
              onPress: () => {
                setCurrentPath(path);
              },
              subLabel: `${
                lastModified ?
                  Object.entries(getAge(lastModified, Date.now()))
                    .map(([partition, value]) => `${value} ${partition}`)
                    .join(" ")
                : ""
              }`, // ${bytesToSize(size ?? 0)}
            }),
          ) ?? []
        }
      />
      {currentPath && (
        <Btn
          onClick={() => {
            onChange(currentPath);
          }}
        >
          Done
        </Btn>
      )}
    </FlexCol>
  );
};
