import { WebSocket } from 'ws';

export const tableConfig: TableConfig = {
  symbols: {
    columns: {
      pair:          "TEXT PRIMARY KEY",    
    },
  },
  futures: {
    columns: {
      id:          "SERIAL PRIMARY KEY",
      symbol:      "TEXT NOT NULL REFERENCES symbols",
      price:       "NUMERIC NOT NULL",
      timestamp:   "TIMESTAMPTZ NOT NULL",
      data:        "JSONB NOT NULL"
    },
    onMount: async ({ dbo }) => {

      const socket = new WebSocket("wss://fstream.binance.com/ws/!markPrice@arr@1s");
      
      socket.onmessage = async (rawData) => {
        const dataItems = JSON.parse(rawData.data as string);
        const data = dataItems.map(data => ({ data, symbol: data.s, price: data.p, timestamp: new Date(data.E) }))
        await dbo.symbols.insert(data.map(({ symbol }) => ({ pair: symbol })), { onConflictDoNothing: true });
        await dbo.futures.insert(data);
      }

      return { onUnmount: () => socket.close() };
    }
  }
}