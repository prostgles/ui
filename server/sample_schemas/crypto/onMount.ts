const SECOND = 1e3;
import { WebSocket } from "ws";

export const onMount: ProstglesOnMount = async ({ dbo }) => {
  const getMarketCaps = async () => {
    const marketCaps = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250",
    ).then((d) => d.json());
    const batchUpdate = marketCaps.map(({ id, ...otherData }) => [
      { id },
      otherData,
    ]);
    await dbo.market_caps.updateBatch(batchUpdate);
    await dbo.market_caps.insert(marketCaps, { onConflict: "DoUpdate" });
  };
  setInterval(getMarketCaps, 30 * SECOND);
  getMarketCaps();

  const socket = new WebSocket(
    "wss://fstream.binance.com/ws/!markPrice@arr@1s",
  );

  socket.onmessage = async (rawData) => {
    const dataItems = JSON.parse(rawData.data as string);
    const data = dataItems.map((data) => ({
      symbol: data.s,
      price: data.p,
      timestamp: new Date(data.E),
    }));
    await dbo.symbols.insert(
      data.map(({ symbol }) => ({ pair: symbol })),
      { onConflict: "DoNothing" },
    );
    await dbo.futures.insert(data);
  };

  const frequency = 20 * SECOND;

  const markets = Object.entries(MARKETS)
    .map(([id, data]) => ({
      id,
      rpcNode: (data as any).rpcNode,
      logoLink: (data as any).logoLink,
      data,
    }))
    .filter((d) => d.rpcNode);

  const marketsCount = await dbo.markets.count();
  if (!marketsCount) {
    // const marketAthCharts = Array.from({ length: 250 }, (_, i) => i + 1).map(i => ({
    await dbo.markets.insert(markets);
  }

  setInterval(async () => {
    const markets = await dbo.markets.find();
    markets.forEach(async (market) => {
      const { id, rpcNode } = market;
      const setPrice = async (price_gwei: any) => {
        if (Number.isFinite(price_gwei)) {
          await dbo.gas_prices.insert({ market: id, price_gwei });
          await dbo.markets.update({ id }, { current_price: price_gwei });
        }
      };
      if (id === "btc") {
        const resp = await fetch(
          "https://mempool.space/api/v1/fees/recommended",
        );
        let price_gwei = NaN;
        try {
          price_gwei = await resp.json().then((d) => Number(d.hourFee));
        } catch (e) {
          console.log(resp);
          throw e;
        }
        setPrice(price_gwei);
        return;
      }
      let resp;
      try {
        resp = await fetch(rpcNode, {
          method: "POST",
          headers: {
            "Content-type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_gasPrice",
            params: [],
          }),
        });
        let price_gwei = NaN;
        try {
          price_gwei = await resp.json().then((d) => Number(d.result) / 1e9);
        } catch (e) {
          console.log(resp);
          throw e;
        }
        setPrice(price_gwei);
      } catch (error) {
        console.log(id, error, resp);
        await dbo.markets.update(
          { id },
          { fail_info: { error: error.message } },
        );
      }
    });
  }, frequency);

  setInterval(
    async () => {
      await dbo.sql(
        `
      DELETE FROM gas_prices
      WHERE id IN (
        SELECT id
        FROM (
          SELECT *, row_number() over( PARTITION BY market, price_gwei ORDER BY "timestamp" ) as dupeno
          FROM gas_prices
        ) t
        WHERE dupeno > 3
      )
      `,
      );

      const { futures_id, gas_id } = await dbo.sql(
        "SELECT (SELECT MAX(id) FROM futures) as futures_id, (SELECT MAX(id) FROM gas_prices) as gas_id",
        {},
        { returnType: "row" },
      );
      let truncateQuery = "";
      if (futures_id > 1e5) {
        truncateQuery += `TRUNCATE futures RESTART IDENTITY;\n`;
      }
      if (gas_id > 1e5) {
        truncateQuery += `TRUNCATE gas_prices RESTART IDENTITY;\n`;
      }
      if (truncateQuery) {
        await dbo.sql(truncateQuery);
      }
    },
    60 * 60 * SECOND,
  );
};

const MARKETS = {
  btc: {
    symbol: "BTC",
    chainName: "BTC",
    networkName: "Bitcoin",
    icon: "coin-btc2",
    blockBrowser: "https://explorer.btc.com/",
    rpcNode: "https://graphql.bitquery.io/",
  },
  doge: {
    symbol: "DOGE",
    chainName: "DOGE",
    networkName: "DogeCoin",
    icon: "coin-doge",
    blockBrowser: "https://dogechain.info",
    rpcNode: "https://rpc.dogechain.dog/",
  },
  kovan: {
    symbol: "ETH",
    chainName: "ETH",
    networkName: "ERC20",
    icon: "coin-eth2",
    blockBrowser: "https://kovan.etherscan.io",
    rpcNode: "https://kovan.infura.io/v3/ba1f4e263e8a497ab6982db5917462f9",
  },
  eth: {
    symbol: "ETH",
    chainName: "ETH",
    networkName: "ERC20",
    icon: "coin-eth2",
    blockBrowser: "https://etherscan.io",
    rpcNode: "https://rpc.ankr.com/eth",
  },
  ethw: {
    symbol: "ETHW",
    chainName: "EthereumPoW",
    networkName: "ERC20",
    icon: "ethw",
    blockBrowser: "https://www.oklink.com/en/ethw/",
    rpcNode: "https://mainnet.ethereumpow.org",
  },
  ethf: {
    symbol: "ETHF",
    chainName: "EthereumFair",
    networkName: "ERC20",
    icon: "ethf",
    blockBrowser: "https://explorer.etherfair.org",
    rpcNode: "https://rpc.etherfair.org/",
  },
  eos: {
    symbol: "EOS",
    chainName: "",
    networkName: "",
    icon: "coin-eos",
  },
  xmr: {
    symbol: "XMR",
    chainName: "XMR",
    networkName: "",
    icon: "coin-xmr",
  },
  bnb: {
    symbol: "BNB",
    chainName: "BSC",
    networkName: "BEP20",
    icon: "coin-bnb",
    blockBrowser: "https://bscscan.com",
    rpcNode: "https://rpc.ankr.com/bsc",
  },
  bsc: {
    symbol: "BNB",
    chainName: "BSC",
    networkName: "BEP20",
    icon: "coin-bnb",
    blockBrowser: "https://bscscan.com",
    rpcNode: "https://rpc.ankr.com/bsc",
  },
  opbnb: {
    symbol: "opBNB",
    chainName: "opBNB",
    networkName: "BEP20",
    icon: "opbnb",
    blockBrowser: "https://opbnbscan.com",
    rpcNode: "https://opbnb-mainnet-rpc.bnbchain.org",
  },
  ht: {
    symbol: "HT",
    chainName: "HECO",
    networkName: "HRC20",
    icon: "coin-heco",
    blockBrowser: "https://hecoinfo.com",
    rpcNode: "https://http-mainnet.hecochain.com",
  },
  heco: {
    symbol: "HT",
    chainName: "HECO",
    networkName: "HRC20",
    icon: "coin-heco",
    blockBrowser: "https://hecoinfo.com",
    rpcNode: "https://http-mainnet.hecochain.com",
  },
  okt: {
    symbol: "OKT",
    chainName: "OKX Chain",
    networkName: "OEC20",
    icon: "coin-okex",
    blockBrowser: "https://www.oklink.com/okexchain",
    rpcNode: "https://exchainrpc.okex.org",
  },
  sui: {
    symbol: "SUI",
    chainName: "SUI",
    networkName: "SUI",
    icon: "sui",
    blockBrowser: "https://explorer.sui.io",
    rpcNode: "https://explorer-rpc.mainnet.sui.io",
  },
  sei: {
    symbol: "SEI",
    chainName: "SEI",
    networkName: "SEI",
    icon: "sei",
    blockBrowser: "https://www.seiscan.app",
    rpcNode: "https://rpc.sei-apis.com",
  },
  ftm: {
    symbol: "FTM",
    chainName: "Fantom",
    networkName: "FRC20",
    icon: "coin-ftm",
    blockBrowser: "https://ftmscan.com",
    rpcNode: "https://rpc.ankr.com/fantom",
  },
  kcc: {
    symbol: "KCS",
    chainName: "KCC",
    networkName: "KRC20",
    icon: "coin-kcc",
    blockBrowser: "https://explorer.kcc.io",
    rpcNode: "https://rpc-mainnet.kcc.network",
  },
  xdai: {
    symbol: "xDAI",
    chainName: "xDAI",
    networkName: "XRC20",
    icon: "coin-xdai",
    blockBrowser: "https://gnosis.blockscout.com",
    rpcNode: "https://gnosis-mainnet.public.blastapi.io",
  },
  matic: {
    symbol: "MATIC",
    chainName: "Polygon",
    networkName: "MRC20",
    icon: "coin-matic",
    blockBrowser: "https://polygonscan.com",
    rpcNode: "https://rpc.ankr.com/polygon",
  },
  dot: {
    symbol: "DOT",
    chainName: "DOT",
    networkName: "Polkadot",
    icon: "coin-dot",
  },
  sol: {
    symbol: "SOL",
    chainName: "Solana",
    networkName: "",
    icon: "coin-sol",
    blockBrowser: "https://solscan.io",
    rpcNode:
      "https://solana-mainnet.phantom.app/YBPpkkN4g91xDiAnTE9r0RcMkjg0sKUIWvAfoFVJ",
  },
  aptos: {
    symbol: "APT",
    chainName: "Aptos",
    networkName: "Aptos",
    icon: "apt",
    blockBrowser: "https://explorer.aptoslabs.com/",
    rpcNode: "https://fullnode.mainnet.aptoslabs.com/v1",
  },
  avax: {
    symbol: "AVAX",
    chainName: "Avalanche C",
    networkName: "ARC20",
    icon: "avax",
    blockBrowser: "https://snowtrace.io",
    rpcNode: "https://rpc.ankr.com/avalanche",
  },
  arb: {
    symbol: "ETH",
    chainName: "Arbitrum",
    networkName: "ERC20",
    icon: "arb",
    blockBrowser: "https://arbiscan.io",
    rpcNode: "https://rpc.ankr.com/arbitrum",
  },
  arbnova: {
    symbol: "ETH",
    chainName: "Arbitrum Nova",
    networkName: "ERC20",
    icon: "arbnova",
    blockBrowser: "https://nova.arbiscan.io",
    rpcNode: "https://nova.arbitrum.io/rpc",
  },
  op: {
    symbol: "OETH",
    chainName: "Optimism",
    networkName: "OP20",
    icon: "coin-op",
    blockBrowser: "https://optimistic.etherscan.io",
    rpcNode: "https://rpc.ankr.com/optimism",
  },
  celo: {
    symbol: "CELO",
    chainName: "Celo",
    networkName: "CRC20",
    icon: "celo",
    blockBrowser: "https://explorer.celo.org",
    rpcNode: "https://forno.celo.org",
  },
  atom: {
    symbol: "ATOM",
    chainName: "ATOM",
    networkName: "ATOM",
    icon: "atom",
    blockBrowser: "https://explorer.celo.org",
    rpcNode: "https://forno.celo.org",
  },
  movr: {
    symbol: "MOVR",
    chainName: "Moonriver",
    networkName: "MRC20",
    icon: "movr",
    blockBrowser: "https://moonriver.moonscan.io",
    rpcNode: "https://rpc.moonriver.moonbeam.network",
  },
  cro: {
    symbol: "CRO",
    chainName: "Cronos",
    networkName: "CRC20",
    icon: "cro",
    blockBrowser: "https://cronoscan.com",
    rpcNode: "https://gateway.nebkas.ro",
  },
  vlx: {
    symbol: "VLX",
    chainName: "Velas",
    networkName: "VRC20",
    icon: "vlx",
    blockBrowser: "https://evmexplorer.velas.com",
    rpcNode: "https://evmexplorer.velas.com/rpc",
  },
  iotx: {
    symbol: "IOTX",
    chainName: "IoTeX",
    networkName: "XRC20",
    icon: "iotex",
    blockBrowser: "https://iotexscan.io",
    rpcNode: "https://babel-api.mainnet.iotex.io",
  },
  sbch: {
    symbol: "BCH",
    chainName: "SmartBCH",
    networkName: "SEP20",
    icon: "bch",
    blockBrowser: "https://www.smartscan.cash/",
    rpcNode: "https://smartbch.greyh.at",
  },
  glmr: {
    symbol: "GLMR",
    chainName: "Moonbeam",
    networkName: "GRC20",
    icon: "glmr",
    blockBrowser: "https://www.moonscan.io",
    rpcNode: "https://rpc.api.moonbeam.network",
  },
  xdc: {
    symbol: "XDC",
    chainName: "XinFin",
    networkName: "XRC20",
    icon: "xdc",
    blockBrowser: "https://explorer.xinfin.network",
    rpcNode: "https://rpc.xinfin.network",
  },
  sdn: {
    symbol: "SDN",
    chainName: "Shiden",
    networkName: "SRC20",
    icon: "sdn",
    blockBrowser: "https://blockscout.com/shiden",
    rpcNode: "https://shiden.api.onfinality.io/public",
  },
  fuse: {
    symbol: "FUSE",
    chainName: "Fuse",
    networkName: "FRC20",
    icon: "fuse",
    blockBrowser: "https://explorer.fuse.io",
    rpcNode: "https://rpc.fuse.io/",
  },
  aac: {
    symbol: "AAC",
    chainName: "Double-A Chain",
    networkName: "ARC20",
    icon: "aac",
    blockBrowser: "https://scan.acuteangle.com",
    rpcNode: "https://rpc.acuteangle.com",
  },
  klay: {
    symbol: "KLAY",
    chainName: "Klaytn",
    networkName: "KRC20",
    icon: "klay",
    blockBrowser: "https://scope.klaytn.com",
    rpcNode: "https://rpc.ankr.com/klaytn",
  },
  one: {
    symbol: "ONE",
    chainName: "Harmony",
    networkName: "HRC20",
    icon: "one",
    blockBrowser: "https://explorer.harmony.one",
    rpcNode: "https://api.harmony.one",
  },
  evmos: {
    symbol: "EVMOS",
    chainName: "Evmos",
    networkName: "ERC20",
    icon: "evmos",
    blockBrowser: "https://escan.live",
    rpcNode: "https://evmos.lava.build",
  },
  brise: {
    symbol: "BRISE",
    chainName: "Bitgert",
    networkName: "BRC20",
    icon: "brise",
    blockBrowser: "https://brisescan.com",
    rpcNode: "https://mainnet-rpc.brisescan.com",
  },
  dogechain: {
    symbol: "wDOGE",
    chainName: "DogeChain",
    networkName: "DRC20",
    icon: "dogechain",
    blockBrowser: "https://explorer.dogechain.dog",
    rpcNode: "https://rpc01-sg.dogechain.dog",
  },
  etc: {
    symbol: "ETC",
    chainName: "Ethereum Classic",
    networkName: "ERC20",
    icon: "etc",
    blockBrowser: "https://etc.blockscout.com",
    rpcNode: "https://etc.rivet.link",
  },
  syscoin: {
    symbol: "SYS",
    chainName: "SysCoin",
    networkName: "SRC20",
    icon: "syscoin",
    blockBrowser: "https://explorer.syscoin.org",
    rpcNode: "https://rpc.ankr.com/syscoin",
  },
  canto: {
    symbol: "Canto",
    chainName: "Canto",
    networkName: "CRC20",
    icon: "canto",
    blockBrowser: "https://tuber.build",
    rpcNode: "https://canto.gravitychain.io",
  },
  onus: {
    symbol: "Onus",
    chainName: "ONUS Chain",
    networkName: "ORC20",
    icon: "onus",
    blockBrowser: "https://explorer.onuschain.io",
    rpcNode: "https://rpc.onuschain.io",
  },
  core: {
    symbol: "CORE",
    chainName: "CORE Chain",
    networkName: "CRC20",
    icon: "core",
    blockBrowser: "https://scan.coredao.org/",
    rpcNode: "https://rpc.coredao.org",
  },
  cfx: {
    symbol: "CFX",
    chainName: "CFX",
    networkName: "CFX20",
    icon: "cfx",
    blockBrowser: "https://evm.confluxscan.net",
    rpcNode: "https://evm.confluxrpc.com",
  },
  fil: {
    symbol: "FIL",
    chainName: "FIL",
    networkName: "FRC20",
    icon: "fil",
    blockBrowser: "https://filfox.info/en",
    rpcNode: "https://node.filutils.com/rpc/v1",
  },
  "zksync-era": {
    symbol: "ETH",
    chainName: "zkSync Era",
    networkName: "ERC20",
    icon: "zksync",
    blockBrowser: "https://explorer.zksync.io",
    rpcNode: "https://mainnet.era.zksync.io",
  },
  "zksync-lite": {
    symbol: "ETH",
    chainName: "zkSync Lite",
    networkName: "ERC20",
    icon: "zksync",
    blockBrowser: "https://zkscan.io/",
    rpcNode: "https://api.zksync.io/jsrpc",
  },
  "polygon-zkevm": {
    symbol: "ETH",
    chainName: "Polygon zkEVM",
    networkName: "ERC20",
    icon: "coin-matic",
    blockBrowser: "https://zkevm.polygonscan.com",
    rpcNode: "https://zkevm-rpc.com",
  },
  pls: {
    symbol: "PLS",
    chainName: "PulseChain",
    networkName: "ERC20",
    icon: "pls",
    blockBrowser: "https://scan.pulsechain.com",
    rpcNode: "https://rpc.pulsechain.com",
  },
  base: {
    symbol: "ETH",
    chainName: "Base",
    networkName: "ERC20",
    icon: "base",
    blockBrowser: "https://basescan.org",
    rpcNode: "https://mainnet.base.org",
  },
  linea: {
    symbol: "ETH",
    chainName: "Linea",
    networkName: "ERC20",
    icon: "linea",
    blockBrowser: "https://lineascan.build",
    rpcNode: "https://rpc.linea.build",
  },
  shibarium: {
    symbol: "BONE",
    chainName: "Shibarium",
    networkName: "ERC20",
    icon: "shib",
    blockBrowser: "https://shibariumscan.io",
    rpcNode: "https://www.shibrpc.com",
  },
  scroll: {
    symbol: "ETH",
    chainName: "Scroll",
    networkName: "SRC20",
    icon: "scroll",
    blockBrowser: "https://scrollscan.com",
    rpcNode: "https://scroll.blockpi.network/v1/rpc/public",
  },
  noa: {
    symbol: "NOA",
    chainName: "Nostr",
    networkName: "",
    icon: "noa",
    blockBrowser: "mainnet.nostrassets.com",
    rpcNode: "",
  },
  telos: {
    symbol: "TLOS",
    chainName: "Telos",
    networkName: "TRC20",
    icon: "telos",
    blockBrowser: "https://www.teloscan.io",
    rpcNode: "https://mainnet.telos.net/evm",
  },
  humanode: {
    symbol: "eHMND",
    chainName: "Humanode",
    networkName: "HRC20",
    icon: "humanode",
    blockBrowser: "https://humanode.subscan.io/",
    rpcNode: "https://explorer-rpc-http.mainnet.stages.humanode.io/",
  },
  ton: {
    symbol: "TON",
    chainName: "TON",
    networkName: "TON20",
    icon: "ton",
    blockBrowser: " https://tonscan.org",
    rpcNode: "https://toncenter.com/api/v2/jsonRPC",
  },
  ace: {
    symbol: "ACE",
    chainName: "Endurance(ACE)",
    networkName: "ACE20",
    icon: "ace",
    blockBrowser: "https://explorer.endurance.fusionist.io",
    rpcNode: "https://rpc-endurance.fusionist.io",
  },
};
