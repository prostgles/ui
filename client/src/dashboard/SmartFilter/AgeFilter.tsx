
import React from 'react';
import { CORE_FILTER_TYPES, DetailedFilterBase, FilterType, NUMERIC_FILTER_TYPES, SimpleFilter } from '../../../../commonTypes/filterUtils';
import Btn from '../../components/Btn';
import { FormFieldDebounced } from "../../components/FormField/FormFieldDebounced";
import Select from '../../components/Select/Select';
import RTComp from '../RTComp';
import { BaseFilterProps } from "./SmartFilter";

type FilterProps = BaseFilterProps;
 
export const getDefaultAgeFilter = (fieldName: string, type: typeof AgeFilterTypes[number]) => ({
  fieldName,
  complexFilter: {
    argsLeftToRight: true,
    comparator: ">",
  },
  type,
  value: "1day"
} satisfies SimpleFilter)
export const AgeFilterTypes = ["$age", "$duration", "$ageNow"] satisfies FilterType[]
export class AgeFilter extends RTComp<FilterProps, never> {

  render(): React.ReactNode {
    const { filter, onChange, tables, column, tableName } = this.props;
    const { error } = this.state;

    const otherDateCols = tables.find(t => t.name === tableName)?.columns.filter(c => 
      c.name !== column.name && 
      ["date", "timestamp", "timestamptz"].includes(c.udt_name) 
    );
    if(!filter || !otherDateCols) return <>Something went wrong. Could not find column {column.name}</>

    const complex: DetailedFilterBase["complexFilter"] = {
      ...(filter.complexFilter ?? {}),
      argsLeftToRight: filter.complexFilter?.argsLeftToRight ?? true,
      comparator: filter.complexFilter?.comparator ?? ">",
    }

    const updateComplex = (newOpt: Partial<DetailedFilterBase["complexFilter"]>) => {
      onChange({
        ...filter,
        complexFilter: {
          ...complex,
          ...newOpt,
        }
      })
    }

    const colOptsions = [
      { key: null, label: "NOW" },
      ...otherDateCols.map(c => ({ key: c.name, label: c.label }))
    ]

    return <div className="flex-row gap-p25">
      {filter.type !== "$age" && <div className="flex-row p-p25 gap-p25 ai-center">
        <Btn size="small" 
          // variant="outline"
          color="action" 
          onClick={() => { 
            updateComplex({ argsLeftToRight: !complex.argsLeftToRight }) 
          }}
        >
          {complex.argsLeftToRight === false ? "Up to" : "Since"}  
        </Btn>
        <Select 
          value={complex.otherField ?? null} 
          fullOptions={colOptsions} 
          onChange={otherField => {
            updateComplex({ otherField });
          }} 
        />
      </div>}
      <div className="flex-row p-p25 gap-p5">
        <Select 
          className="text-blue-400"
          value={complex.comparator} 
          fullOptions={[...NUMERIC_FILTER_TYPES, ...CORE_FILTER_TYPES.filter(({key}) => key === "<>" || key === "=")]} 
          onChange={comparator => {
            updateComplex({ comparator });
          }} 
        />
        <FormFieldDebounced
          type="text"
          autoComplete="off"
          value={filter.value}
          // inputStyle={{ padding: window.isMobileDevice ? "2px 6px" : "8px" }}
          maxWidth="10em"
          inputStyle={{ minHeight: "38px" }}
          placeholder="1 month 2 days"
          error={error}
          onChange={value => {
            onChange({
              ...filter,
              disabled: false,
              value: `${value}`
            });
          }}
        />
      </div>
    </div>;
  }
}