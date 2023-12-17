import { omitKeys } from "prostgles-types";
import React from "react";
import { FTS_FILTER_TYPES, getFinalFilter, SimpleFilter, TEXT_FILTER_TYPES } from "../../../../commonTypes/filterUtils";
import ErrorComponent from "../../components/ErrorComponent";
import { FormFieldDebounced } from "../../components/FormField/FormFieldDebounced";
import { ContextDataSelector } from "../AccessControl/ContextDataSelector";
import { colIs } from "../W_Table/ColumnMenu/ColumnSelect";
import RTComp from "../RTComp";
import SmartFormField from "../SmartForm/SmartFormField/SmartFormField";
import { AgeFilter, AgeFilterTypes } from "./AgeFilter";
import { FilterWrapper } from "./FilterWrapper";
import { GeoFilter, GeoFilterTypes } from "./GeoFilter";
import { ListFilter } from "./ListFilter";
import NumberOrDateFilter from "./NumberOrDateFilter";
import { BaseFilterProps } from "./SmartFilter";
import SmartSearch from "./SmartSearch";
import { FlexCol, FlexRow } from "../../components/Flex";
import Btn from "../../components/Btn";
import { mdiCog, mdiFormatLetterMatches, mdiSettingsHelper } from "@mdi/js";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select";

type FilterProps = BaseFilterProps & {
  hideToggle?: boolean;
  minimised?: boolean;
}

export class Filter extends RTComp<FilterProps, { error?: any }> {

  onChange = async (_newFilter: SimpleFilter | undefined) => {
    const {  
      onChange: _onChange,
      db,
      tableName, 
    } = this.props;

    const tableHandler = db[tableName]; 

    let newFilter = _newFilter;
    let newError;
    if(newFilter){
      try {
        const finalFilter = getFinalFilter(newFilter);
        await tableHandler?.findOne?.(finalFilter, { select: "" });
      } catch(err: any){
        newFilter = {
          ...newFilter,
          disabled: true
        }
        newError = err;
      }
    }
    if(!!this.state.error !== !!newError){
      this.setState({ error: newError })
    }
    _onChange(newFilter);
  }

  inDebounce?: { 
    timer: NodeJS.Timeout;
    filter: any; 
  }
  onChangeDebounced = (_newFilter: SimpleFilter | undefined) => {
    if(this.inDebounce){
      clearTimeout(this.inDebounce.timer);
    }
    this.inDebounce = {
      filter: _newFilter,
      timer: setTimeout(() => {
        this.onChange(_newFilter)
        this.inDebounce = undefined;
      }, 500)
    }; 
  }

  render(){
    const { 
      column,
      tables,
      onChange: _onChange,
      db,
      tableName,
      contextData,
    } = this.props;
    const { error } = this.state;
 
    const onChange = this.onChange;

    const filter = {
      ...this.props.filter,
      fieldName: this.props.filter?.fieldName ?? column.name,
      type: this.props.filter?.type ?? "="// "$in"
    }

    /** There is a change the options */
    const propsFilter = this.props.filter;

    const withContextFilter = (filterNode: React.ReactNode) => {
      if(contextData){

        if(propsFilter?.contextValue){
        }
        const ctxCols = contextData.flatMap(t => t.columns.filter(c => c.tsDataType === column.tsDataType).map(c => ({
          id: t.name+"."+c.name,
          tableName: t.name,
          ...c
        })));
        if(ctxCols.length && ["=", "!=", "<>"].includes(filter.type)){

          return <FlexRow className={"gap-p5"}>
            {!propsFilter?.contextValue? filterNode : null}
            <ContextDataSelector
              className=""
              value={propsFilter?.contextValue}
              column={column}
              contextData={contextData}
              onChange={contextValue => {
                if(!contextValue){
                  onChange(omitKeys({
                    ...filter,
                    disabled: true,
                  }, ["contextValue"]));
                } else {
                  onChange({
                    ...filter,
                    disabled: false,
                    contextValue
                  });

                }
              }} 
            />
          </FlexRow> 
        }
      }

      return filterNode;
    }

    let content: React.ReactNode;
    if(GeoFilterTypes.includes(propsFilter?.type as any) && colIs(column, "_PG_postgis")){
      content = <GeoFilter { ...this.props } error={error} />;

    } else if(AgeFilterTypes.includes(propsFilter?.type as any)){
      content = <AgeFilter { ...this.props } error={error} />;
      
    } else if(propsFilter?.type === "not null" || propsFilter?.type === "null"){
      content = null;

    } else if(ListFilter.TYPES.includes(propsFilter?.type as any)){
      content = <ListFilter {...this.props} error={error} />
  
    } else {

      const textFilterType = ["$ilike", "$like", "$nilike", "$nlike"].includes(filter.type)? "text" : FTS_FILTER_TYPES.some(f => f.key === filter.type)? "fts" : undefined;
      /** Disable suggestions, allow text only */
      if(textFilterType){
        content = <FormFieldDebounced 
          asColumn={true}
          className="m-p5"
          type="text"
          autoComplete="off"
          value={filter.value}
          onChange={value => {
            onChange({  //  !_value.length? undefined : 
              ...filter,
              disabled: false,
              value: `${value}`
            })
          }}
          rightIcons={textFilterType === "text"? undefined : 
            <PopupMenu 
              button={<Btn iconPath={filter.ftsFilterOptions?.lang === "simple"? mdiFormatLetterMatches : mdiCog} color={filter.ftsFilterOptions?.lang? "action" : undefined} />}
              title={"FTS options"}
              positioning="beneath-left"
              clickCatchStyle={{ opacity: 0 }}
              render={pClose => <FlexCol>
                <Select 
                  label={{
                    label: "Dictionary",
                    info: "Choose 'simple' for exact word matching. Dictionaries are used to eliminate words that should not be considered in a search (stop words), and to normalize words so that different derived forms of the same word will match. A successfully normalized word is called a lexeme.",
                  }}
                  options={FTS_LANGUAGES}
                  value={filter.ftsFilterOptions?.lang ?? "english"}
                  onChange={lang => {
                    onChange({ ...filter, ftsFilterOptions: { ...filter.ftsFilterOptions, lang } });
                    pClose();
                  }}
                />
              </FlexCol>}
            /> 
          }
        />

      // } else if(!isCategorical(column, filter) || filter.type === "$between"){
      } else if(filter.type === "$between"){
        content = <NumberOrDateFilter {...this.props} 
          type={column.tsDataType.toLowerCase() as any} 
          inputType={SmartFormField.getInputType(column)}
        />

      /** Show suggestions */
      } else {
        const key = JSON.stringify(filter.value) + Math.random();
        
        content = <SmartSearch 
          className=" "
          key={key}
          db={db} 
          tableName={tableName}
          variant="search-no-shadow"
          tables={tables}
          defaultValue={filter.value}
          column={filter.fieldName}
          searchEmpty={true}
          noResultsComponent={
            <FlexRow>
              <div className="text-gray-700">No results</div>
              <div className="text-gray-400">Press enter to confirm</div>
            </FlexRow>
          }
          onPressEnter={term => {
            const f = { ...filter };
            f.value = term;// f.type === "$term_highlight"? term : columnValue
            f.disabled = false;
            
            onChange(f)

          }}
          onChange={(val) => {

            if(!val){
              onChange({
                ...filter,
                value: undefined,
                disabled: true
              });
              return;
            }
            const { columnValue, term } = val;
            const f = { ...filter };
            f.value = TEXT_FILTER_TYPES.map(ft => ft.key as string).concat(["$term_highlight"]).includes(f.type)? val.columnTermValue : (columnValue || term);// f.type === "$term_highlight"? term : columnValue
            // console.log(f)
            f.disabled = false;
            
            onChange(f)
          }}
        />
      }

    }

    return <FilterWrapper 
      {...this.props}
      filter={filter}
    >
      {error && <ErrorComponent error={error} />}
      {withContextFilter(content)}
      {/* {contextData?.some(t => t.columns.some(c => c.tsDataType === column.tsDataType))} */}
    </FilterWrapper>

  }
}

/**
  SELECT cfgname
  FROM pg_catalog.pg_ts_config
 */
const FTS_LANGUAGES = [
  "simple"
, "arabic"
, "armenian"
, "basque"
, "catalan"
, "danish"
, "dutch"
, "english"
, "finnish"
, "french"
, "german"
, "greek"
, "hindi"
, "hungarian"
, "indonesian"
, "irish"
, "italian"
, "lithuanian"
, "nepali"
, "norwegian"
, "portuguese"
, "romanian"
, "russian"
, "serbian"
, "spanish"
, "swedish"
, "tamil"
, "turkish"
, "yiddish"
] as const;