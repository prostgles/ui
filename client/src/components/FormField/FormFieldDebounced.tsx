import React from "react";
import RTComp from "../../dashboard/RTComp";
import type { FormFieldProps } from "./FormField";
import FormField from "./FormField";

type S = {
  value: any;
  debouncing?: boolean;
};

export class FormFieldDebounced extends RTComp<FormFieldProps, S> {
  constructor(props) {
    super(props);

    this.state = {
      value: this.props.value,
    };
  }

  inDebounce?: {
    timer: NodeJS.Timeout;
    value: any;
  };
  onChangeDebounced = (value: any) => {
    this.setState({ value, debouncing: true });
    if (this.inDebounce) {
      clearTimeout(this.inDebounce.timer);
    }
    this.inDebounce = {
      value,
      timer: setTimeout(async () => {
        if (!this.mounted) return;
        await this.props.onChange?.(value);
        setTimeout(() => {
          this.setState({ value: undefined, debouncing: false });
        }, 100);
        this.inDebounce = undefined;
      }, 500),
    };
  };

  render(): React.ReactNode {
    const { debouncing, value } = this.state;
    return (
      <FormField
        {...this.props}
        style={{
          ...this.props.style,
          ...(debouncing && { opacity: ".5" }),
        }}
        value={debouncing ? (value ?? this.props.value) : this.props.value}
        onChange={this.onChangeDebounced}
      />
    );
  }
}
