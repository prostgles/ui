import { DB } from "prostgles-server/dist/Prostgles";
export declare const demoDataSetup: (_db: DB, dbName: string) => Promise<void>;
/**
 * MAP REALTIME
 *
 *
 *
 
CREATE EXTENSION postgis;

CREATE TABLE points (
  id SERIAL PRIMARY KEY,
  geom GEOGRAPHY('point')
);

INSERT INTO points  (geom)
VALUES(st_point( 0, 51, 4326));

await db.points.update({}, { geom: {  "ST_GeomFromEWKT": [`SRID=4326;POINT(${Math.random()} ${51 + Math.random()})`]} })

setInterval(async () => {
  await db.sql(
    `UPDATE points
    set geom = ST_GeomFromEWKT('SRID=4326;POINT(' || (st_x(geom::GEOMETRY) + random()/101) || ' ' || (st_y(geom::GEOMETRY ) + random()/101) || ')')`);
}, 50)



Crypto realtime

DROP TABLE IF EXISTS pairs;
CREATE TABLE pairs (
  id TEXT PRIMARY KEY
);
INSERT INTO pairs (id) VALUES('ETHUSDT');

DROP TABLE IF EXISTS "options";
CREATE TABLE "options" (
  id SERIAL PRIMARY KEY,
  e TEXT,
  "E" TIMESTAMP WITH TIME ZONE,
  s TEXT NOT NULL REFERENCES pairs,
  p NUMERIC
);

(new WebSocket("wss://nbstream.binance.com/eoptions/stream?streams=ETHUSDT@index")).onmessage = async ({ data }) => {
  // d = { "e": "index", "E": 1672325226310, "s": "ETHUSDT", "p": "1202.87071862" }
  const d = (JSON.parse(data).data);
  console.log(d);
  await db.options.insert({ ...d, E: new Date(+d.E) });
}

(new WebSocket("wss://stream.binance.com:443/stream?streams=btcusdt@aggTrade")).onmessage = async ({ data }) => {
  // d = { "e": "index", "E": 1672325226310, "s": "ETHUSDT", "p": "1202.87071862" }
  const d = (JSON.parse(data).data);
  console.log(d);
  await db.options.insert({ ...d, E: new Date(+d.E) });
}

write a websocket subscription to btc usd binance stream below using this link: wss://stream.binance.com:9443

 */
//# sourceMappingURL=demoDataSetup.d.ts.map