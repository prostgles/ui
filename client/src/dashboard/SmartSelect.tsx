import { mdiAlertCircleOutline, mdiPencil, mdiPlus } from "@mdi/js";
import Icon from "@mdi/react";
import { TableHandlerClient } from "prostgles-client/dist/prostgles";
import { isDefined } from "prostgles-types";
import React, { useState } from "react";
import { TestSelectors } from "../Testing";
import Btn from "../components/Btn";
import Chip from "../components/Chip";
import { FlexCol, FlexRowWrap } from "../components/Flex";
import { Label, LabelProps } from "../components/Label";
import Loading from "../components/Loading";
import PopupMenu from "../components/PopupMenu";
import SearchList from "../components/SearchList";
import { useIsMounted } from "./Backup/CredentialSelector";
import { useSubscribe } from "./ProstglesMethod/hooks";

type SmartSelectProps<THandler extends TableHandlerClient = TableHandlerClient> = {
  popupTitle?: string;
  label?: LabelProps;
  values: string[];
  tableHandler: THandler;
  filter?: Parameters<THandler["count"]>[0];
  onChange: (newValues: string[]) => void;
  /** 
   * Must be unique */
  fieldName: string;
  displayField?: string;
  getLabel?: (value: string) => {
    subLabel?: string; 
    disabledInfo?: string;
  };
  disabledInfo?: string;
  allowCreate?: boolean;
  placeholder?: string;
} & TestSelectors;

export const SmartSelect = <THandler extends TableHandlerClient = TableHandlerClient,>(props: SmartSelectProps<THandler>) => {
  const { values, tableHandler: tableHandlerRaw, placeholder,
      onChange, fieldName, getLabel, 
      popupTitle: title, label, displayField, 
      filter = {}, disabledInfo, allowCreate = true,
      id,
    } = props;
  const limit = 21;
  const tableHandler = tableHandlerRaw as Partial<typeof tableHandlerRaw>;
  const rows = useSubscribe(tableHandler.subscribeHook!(filter, { limit, select: [fieldName, displayField].filter(isDefined), groupBy: true }));
  const items = rows?.map(r => ({ key: r[fieldName], label: displayField? r[displayField] : r[fieldName] }));
  const displayValues = values.map(value => items?.find(d => value === d.key)?.label).filter(isDefined)
  const [noExactSearchMatch, setNoExactSearchMatch] = useState<string | undefined>();
  const getIsMounted = useIsMounted();

  if(!items?.length) return null;
  
  return <PopupMenu 
    title={title}
    button={
      (
        <FlexCol 
          id={id}
          className={`gap-p5 ${disabledInfo? "disabled" : ""}`} 
          title={disabledInfo} 
          onClick={disabledInfo? (e => e.stopPropagation()) : undefined}
        >
          {label && <Label { ...label } onClick={e => e.stopPropagation()} />}

          <FlexRowWrap 
            data-command={props["data-command"]}
            className="SmartSelect relative  ai-center" 
          >
            {!items.length && <Loading variant="cover" />}
            <Values values={displayValues} />
            
            {(values.length === 1 && values[0] === "admin")? 
              <div className="flex-row gap-1 text-yellow-600 ai-center ">
                <Icon path={mdiAlertCircleOutline} size={1}/>
                <div>There are no unnassigned user types left. Update existing rules to free up user types or create new user types</div>
              </div> : 
              <div className="flex-row gap-1">
                <Btn 
                  iconPath={!values.length? mdiPlus :  mdiPencil}
                  variant={!values.length? "filled" : "icon"}
                  size={!values.length? "small" : undefined}
                  className=" round " 
                  color="action"
                />
              </div>
            }
          </FlexRowWrap>
        </FlexCol>
      )
    }
    footerButtons={[
      (!noExactSearchMatch || !tableHandler.insert || !allowCreate)? undefined : { 
        label: "Create", 
        variant: "outline", 
        iconPath: mdiPlus,
        color: "action", 
        onClickMessage: async (_, setM) => {
          setM({ loading: 1 }); 
          await tableHandler.insert!({ ...filter, [displayField ?? fieldName]: noExactSearchMatch! }).catch(err => setM({ err }));
          setM({ ok: "Created!" }, () => {
            if(!getIsMounted()) return;
            setNoExactSearchMatch(undefined);
          });
        }
      },
      { 
        label: "Done", 
        variant: "filled", 
        color: "action", 
        onClickClose: true, 
        className: "ml-auto",
      },
    ]}
    onClickClose={false}
    contentStyle={{
      padding: 0
    }}
  >
    <SearchList
      onMultiToggle={items => {
        onChange(items.filter(d => d.checked).map(d => d.key as string))
      }}
      style={{
        maxHeight: "500px"
      }}
      placeholder={placeholder}
      onType={sTerm => {
        const newNoExactSearchMatch = sTerm && items.some(({ label }) => label === sTerm)? undefined : sTerm;
        if(noExactSearchMatch !== newNoExactSearchMatch){
          setNoExactSearchMatch(newNoExactSearchMatch);
        }
      }}
      autoFocus={true}
      noSearchLimit={0}
      // id={generateUniqueID}
      items={items.map(({ key, label }) => {
        return {
          key,
          label,
          checked: values.includes(key),
          ...getLabel?.(key),
          onPress: () => {
            onChange(
              values.includes(key)? values.filter(v => v !== key) : values.concat([key])
            );
          }
        }
      }).sort((a, b) => +!!a.disabledInfo - +!!b.disabledInfo)}
      onNoResultsContent={searchTerm => {
        return <div className="flex-row bg-0 ai-center">
          <div className="p-p5">
            Not found
          </div>
        </div>
      }}
    />
  </PopupMenu>;
  
  
}


const Values = ({ values }: Pick<SmartSelectProps, "values">) => {
  if(!values.length) return null;

  return <div className="flex-row-wrap gap-p5">
    {values.map(value => (
      <Chip key={value}  value={value} style={{ padding: "8px", background: `var(--blue-100)` }} />
    ))}
  </div>
}