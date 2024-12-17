import { mdiAlertCircleOutline, mdiPencil, mdiPlus } from "@mdi/js";
import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import { isDefined } from "prostgles-types";
import React, { useState } from "react";
import type { TestSelectors } from "../Testing";
import Btn from "../components/Btn";
import Chip from "../components/Chip";
import { FlexCol, FlexRowWrap } from "../components/Flex";
import { Icon } from "../components/Icon/Icon";
import type { LabelProps } from "../components/Label";
import { Label } from "../components/Label";
import Loading from "../components/Loading";
import PopupMenu from "../components/PopupMenu";
import SearchList, {
  type SearchListItemContent,
  type SearchListItem,
} from "../components/SearchList/SearchList";
import { useIsMounted } from "./Backup/CredentialSelector";
import { InfoRow } from "../components/InfoRow";

type SmartSelectProps<
  THandler extends TableHandlerClient = TableHandlerClient,
> = {
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
  getLabel?: (
    value: string,
  ) => Pick<Partial<SearchListItem>, "subLabel" | "disabledInfo"> &
    Partial<SearchListItemContent>;
  disabledInfo?: string;
  allowCreate?: boolean;
  placeholder?: string;
} & TestSelectors;

export const SmartSelect = <
  THandler extends TableHandlerClient = TableHandlerClient,
>(
  props: SmartSelectProps<THandler>,
) => {
  const {
    values,
    tableHandler: tableHandlerRaw,
    placeholder,
    onChange,
    fieldName,
    getLabel,
    popupTitle: title,
    label,
    displayField,
    filter = {},
    disabledInfo,
    allowCreate = true,
    id,
  } = props;
  const limit = 21;
  const tableHandler = tableHandlerRaw as Partial<typeof tableHandlerRaw>;
  const { data: rows } = tableHandler.useSubscribe!(filter, {
    limit,
    select: [fieldName, displayField].filter(isDefined),
    groupBy: true,
  });
  const items = rows?.map((r) => ({
    key: r[fieldName],
    label: displayField ? r[displayField] : r[fieldName],
  }));
  const displayValues = values
    .map((value) => items?.find((d) => value === d.key)?.label)
    .filter(isDefined);
  const [noExactSearchMatch, setNoExactSearchMatch] = useState<
    string | undefined
  >();
  const getIsMounted = useIsMounted();

  if (!items?.length) return null;

  return (
    <PopupMenu
      title={title}
      positioning="beneath-left"
      button={
        <FlexCol
          id={id}
          className={`gap-p5 ${disabledInfo ? "disabled" : ""}`}
          title={disabledInfo}
          onClick={disabledInfo ? (e) => e.stopPropagation() : undefined}
        >
          {label && <Label {...label} onClick={(e) => e.stopPropagation()} />}

          <FlexRowWrap className="SmartSelect relative  ai-center">
            {!items.length && <Loading variant="cover" />}
            <Values values={displayValues} />

            {values.length === 1 && values[0] === "admin" ?
              <InfoRow variant="naked" color="warning">
                <Icon path={mdiAlertCircleOutline} size={1} />
                <div>
                  There are no unnassigned user types left. Update current
                  access rules to free up user types or create new user types
                </div>
              </InfoRow>
            : <div className="flex-row gap-1">
                <Btn
                  key={values.length.toString()}
                  data-command={props["data-command"]}
                  iconPath={!values.length ? mdiPlus : mdiPencil}
                  variant={!values.length ? "filled" : "icon"}
                  size={!values.length ? "small" : undefined}
                  // data-command="SmartSelect.Edit"
                  color="action"
                />
              </div>
            }
          </FlexRowWrap>
        </FlexCol>
      }
      footerButtons={[
        !noExactSearchMatch || !tableHandler.insert || !allowCreate ?
          undefined
        : {
            label: "Create",
            variant: "outline",
            iconPath: mdiPlus,
            color: "action",
            onClickMessage: async (_, setM) => {
              setM({ loading: 1 });
              await tableHandler.insert!({
                ...filter,
                [displayField ?? fieldName]: noExactSearchMatch!,
              }).catch((err) => setM({ err }));
              setM({ ok: "Created!" }, () => {
                if (!getIsMounted()) return;
                setNoExactSearchMatch(undefined);
              });
            },
          },
        {
          label: "Done",
          variant: "filled",
          color: "action",
          onClickClose: true,
          "data-command": "SmartSelect.Done",
          className: "ml-auto",
        },
      ]}
      onClickClose={false}
      contentStyle={{
        padding: 0,
      }}
    >
      <SearchList
        onMultiToggle={(items) => {
          onChange(items.filter((d) => d.checked).map((d) => d.key as string));
        }}
        style={{
          maxHeight: "500px",
          background: "var(--bg-popup)",
        }}
        placeholder={placeholder}
        onType={(sTerm) => {
          const newNoExactSearchMatch =
            sTerm && items.some(({ label }) => label === sTerm) ?
              undefined
            : sTerm;
          if (noExactSearchMatch !== newNoExactSearchMatch) {
            setNoExactSearchMatch(newNoExactSearchMatch);
          }
        }}
        autoFocus={true}
        noSearchLimit={0}
        items={items
          .map(({ key, label }) => {
            return {
              key,
              label,
              checked: values.includes(key),
              disabledInfo: undefined,
              ...getLabel?.(key),
              onPress: () => {
                onChange(
                  values.includes(key) ?
                    values.filter((v) => v !== key)
                  : values.concat([key]),
                );
              },
            };
          })
          .sort((a, b) => +!!a.disabledInfo - +!!b.disabledInfo)}
        onNoResultsContent={(searchTerm) => {
          return (
            <div className="flex-row ai-center">
              <div className="p-p5">Not found</div>
            </div>
          );
        }}
      />
    </PopupMenu>
  );
};

const Values = ({ values }: Pick<SmartSelectProps, "values">) => {
  if (!values.length) return null;

  return (
    <div className="flex-row-wrap gap-p5">
      {values.map((value) => (
        <Chip
          key={value}
          value={value}
          variant="outline"
          style={{
            padding: "8px",
            // background: `var(--blue-100)`
          }}
        />
      ))}
    </div>
  );
};
