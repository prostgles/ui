

declare global {
  type ProstglesOnMount = (args: OnReadyParamsBasic) => void | Promise<void>;
}

export {}