import { mdiFileCogOutline, mdiLink } from "@mdi/js";
import { FileColumnConfig, isDefined } from "prostgles-types";
import React, { useState } from "react";
import Btn from "../../components/Btn";
import { FlexCol } from "../../components/Flex";
import { Icon } from "../../components/Icon/Icon";
import Popup from "../../components/Popup/Popup";
import SearchList from "../../components/SearchList";
import { CommonWindowProps } from "../Dashboard/Dashboard";
import { FileColumnConfigEditor } from "./FileColumnConfigEditor";


export type FileTableConfigReferences = Record<string, { referenceColumns: Record<string, FileColumnConfig> }>

type FileColumnConfigControlsProps = {
  tables: CommonWindowProps["tables"];
  refsConfig?: FileTableConfigReferences | undefined;
  onChange: (newConfig: FileTableConfigReferences) => void
}
export const  FileColumnConfigControls = (props: FileColumnConfigControlsProps) => {
  const { refsConfig = {}, tables, onChange } = props;

  const linkedTables = tables.flatMap(t => {
    const fileColumns = t.columns.filter(c => c.file);
    // Exclude mapping/lookup tables
    const isNotLookupTable = t.columns.length > 2 || t.columns.some(c => !c.references?.length);

    if(fileColumns.length && isNotLookupTable){
      return fileColumns.map(fileColumn => {
        return {
          ...t,
          key: `${t.name}.${fileColumn.name}`,
          fileColumn
        }
      })
    }
  }).filter(isDefined);
  const [editColumn, setEditColumn] = useState<typeof linkedTables[number]>();

  if(!linkedTables.length) return null;

  return <FlexCol className="FileColumnConfigControls w-fit min-h-0 mt-1">
    {editColumn && 
      <Popup 
        title={`Configure ${editColumn.name}.${editColumn.fileColumn.name}`}
        onClose={() => setEditColumn(undefined)}
        positioning="center"
        persistInitialSize={true}
        contentClassName="pl-2 p-1 pb-2"
        contentStyle={{ paddingBottom: "100px" }}
        footerButtons={[
          {
            label: "Done",
            color: "action",
            variant: "filled",
            onClickClose: true
          }
        ]}
      >
        <FileColumnConfigEditor
          refsConfig={refsConfig} 
          tableName={editColumn.name} 
          columnName={editColumn.fileColumn.name} 
          onChange={onChange} 
        />
      </Popup>
    }
    <SearchList 
      className="b b-gray-400"
      items={linkedTables.map((linkedTable, i) => {
        
        return {
          key: linkedTable.key,
          rowStyle: !i? undefined : { borderTop: `1px solid var(--gray-400)` },
          subLabel: getFileColumnConfigDescription(linkedTable.fileColumn.file!).full,
          contentLeft: <Icon path={mdiLink} className="mr-p5" />,
          contentRight: <Btn 
              title="Configure allowed file types and limits"
              color="action" 
              iconPath={mdiFileCogOutline}
              onClick={() => {
                setEditColumn(linkedTable);
              }}
            >Configure</Btn>
        }
      })}
    />
  </FlexCol>
}

const getFileColumnConfigDescription = (fc: FileColumnConfig) => {


  const getStrValue = (spec: string[] | Record<string, any>) => Array.isArray(spec)? spec.join(", ") : Object.entries(spec).filter(([t, v]) => v).map(e => e[0]).join(", ")

  let contentType = 'any file type';
  if("acceptedContent" in fc  && fc.acceptedContent && fc.acceptedContent !== "*"){
    contentType = getStrValue(fc.acceptedContent)
  } else if("acceptedFileTypes" in fc && fc.acceptedFileTypes && fc.acceptedFileTypes !== "*"){
    contentType = getStrValue(fc.acceptedFileTypes);
  } else if("acceptedContentType" in fc && fc.acceptedContentType && fc.acceptedContentType !== "*"){
    contentType = getStrValue(fc.acceptedContentType);
  }

  const sizeLimit = `up to ${fc.maxFileSizeMB ?? 100}MB`;
  return {
    sizeLimit, contentType, full: `${contentType}, ${sizeLimit}`
  }
}