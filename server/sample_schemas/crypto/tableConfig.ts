export type TableConfig = Record<
  string,
  {
    /**
     * Column names and sql definitions
     * */
    columns: Record<string, string>;
  }
>;

export const tableConfig: TableConfig = {
  market_caps_import: {
    columns: {
      v: "JSONB",
    },
  },
  market_caps: {
    columns: {
      image: "TEXT",
      name: "TEXT NOT NULL",
      id: "TEXT PRIMARY KEY",
      market_cap: "NUMERIC",
      symbol: "TEXT NOT NULL",
      ath: "NUMERIC",
      atl: "NUMERIC",
      roi: "TEXT",
      low_24h: "NUMERIC",
      ath_date: "TIMESTAMPTZ",
      atl_date: "TIMESTAMPTZ",
      high_24h: "NUMERIC",
      max_supply: "NUMERIC",
      last_updated: "TIMESTAMPTZ",
      total_supply: "NUMERIC",
      total_volume: "NUMERIC",
      current_price: "NUMERIC",
      market_cap_rank: "NUMERIC",
      price_change_24h: "NUMERIC",
      circulating_supply: "NUMERIC",
      ath_change_percentage: "NUMERIC",
      atl_change_percentage: "NUMERIC",
      market_cap_change_24h: "NUMERIC",
      fully_diluted_valuation: "NUMERIC",
      price_change_percentage_24h: "NUMERIC",
      market_cap_change_percentage_24h: "NUMERIC",
    },
  },
  symbols: {
    columns: {
      pair: "TEXT PRIMARY KEY",
    },
  },
  futures: {
    columns: {
      id: "SERIAL PRIMARY KEY",
      symbol: "TEXT NOT NULL REFERENCES symbols",
      price: "NUMERIC NOT NULL",
      timestamp: "TIMESTAMPTZ NOT NULL",
    },
  },
  markets: {
    columns: {
      id: "TEXT PRIMARY KEY",
      current_price: "NUMERIC",
      rpcNode: "TEXT",
      logoLink: "TEXT",
      fail_info: "JSON",
      data: "JSONB NOT NULL",
    },
  },
  gas_prices: {
    columns: {
      id: "SERIAL PRIMARY KEY",
      market: "TEXT NOT NULL REFERENCES markets",
      price_gwei: "NUMERIC NOT NULL",
      timestamp: "TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    },
  },
};
