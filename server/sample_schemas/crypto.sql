CREATE TABLE user_statuses (
  id TEXT PRIMARY KEY, 
  description TEXT
);

INSERT INTO user_statuses(id) VALUES ('active'), ('inactive'), ('pending');

CREATE TABLE users (
  id serial PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' REFERENCES user_statuses,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE registrations (
  id serial PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  address VARCHAR(255) NOT NULL,
  identification_type VARCHAR(255) NOT NULL,
  identification_number VARCHAR(255) NOT NULL,
  identification_document TEXT NOT NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_registrations_user_id ON registrations (user_id);

CREATE TABLE registration_statuses (
  id TEXT PRIMARY KEY,  
  description TEXT
);

INSERT INTO registration_statuses (id, description) 
VALUES
  ('pending',   'The registration is pending review by customer support'),
  ('approved',  'The registration has been approved'),
  ('rejected',  'The registration has been rejected'); 

CREATE TABLE cryptocurrencies (
  id serial PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(10) NOT NULL
);

CREATE TABLE wallets (
  id serial PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  cryptocurrency_id INTEGER REFERENCES cryptocurrencies(id),
  balance DECIMAL(30,10) NOT NULL
);
CREATE INDEX idx_wallets_user_id ON wallets (user_id);


CREATE TABLE trades (
  id serial PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  cryptocurrency_id INTEGER REFERENCES cryptocurrencies(id),
  price DECIMAL(30,10) NOT NULL,
  quantity DECIMAL(30,10) NOT NULL,
  timestamp TIMESTAMP NOT NULL
);
CREATE INDEX idx_trades_user_id ON trades (user_id);
CREATE INDEX idx_trades_cryptocurrency_id ON trades (cryptocurrency_id);

CREATE TABLE audit_logs (
  id serial PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL
);


CREATE TABLE support_tickets (
  id serial PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_support_tickets_user_id ON support_tickets (user_id);


CREATE TABLE support_replies (
  id serial PRIMARY KEY,
  support_ticket_id INTEGER REFERENCES support_tickets(id),
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_support_replies_support_ticket_id ON support_replies (support_ticket_id);


DROP TABLE IF EXISTS market_caps_import;
CREATE TABLE market_caps_import (
  v JSONB
);
COPY market_caps_import FROM PROGRAM 'curl "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc"'

DROP TABLE IF EXISTS market_caps;
CREATE TABLE market_caps (
  image TEXT,
  name  TEXT NOT NULL,
  market_cap NUMERIC ,
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  ath NUMERIC ,
  atl NUMERIC ,
  roi TEXT,
  low_24h NUMERIC,
  ath_date TIMESTAMPTZ,
  atl_date TIMESTAMPTZ,
  high_24h NUMERIC ,
  max_supply NUMERIC ,
  last_updated TIMESTAMPTZ ,
  total_supply NUMERIC ,
  total_volume NUMERIC ,
  current_price NUMERIC ,
  market_cap_rank NUMERIC ,
  price_change_24h NUMERIC ,
  circulating_supply NUMERIC ,
  ath_change_percentage NUMERIC ,
  atl_change_percentage NUMERIC,
  market_cap_change_24h NUMERIC,
  fully_diluted_valuation NUMERIC ,
  price_change_percentage_24h NUMERIC ,
  market_cap_change_percentage_24h NUMERIC
);

INSERT INTO market_caps
SELECT (jsonb_populate_record(null::market_caps, r)).*
FROM (
  SELECT jsonb_array_elements(v) as r
  FROM market_caps_import
) t;

-- DROP TABLE IF EXISTS futures;
-- CREATE TABLE futures (
--   id          SERIAL PRIMARY KEY,
--   symbol      TEXT NOT NULL,
--   price       DECIMAL(30,10) NOT NULL,
--   timestamp   TIMESTAMPTZ NOT NULL,
--   data        JSONB NOT NULL
-- );

-- /*
-- {
--   "e": "markPriceUpdate",
--   "E": 1702457205000,
--   "s": "HOTUSDT",
--   "p": "0.00206700",
--   "P": "0.00206613",
--   "i": "0.00206769",
--   "r": "0.00010000",
--   "T": 1702483200000
-- }
-- */


-- (new WebSocket("wss://fstream.binance.com/ws/!markPrice@arr@1s")).onmessage = async (rawData) => {
--   const data = (JSON.parse(rawData.data));
--   await db.futures.insert({ data, symbol: data.s, price: data.p, timestamp: new Date(data.E) });
-- }