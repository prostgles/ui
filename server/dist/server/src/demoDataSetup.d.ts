import { DB } from "prostgles-server/dist/Prostgles";
import { Connections } from ".";
export declare const demoDataSetup: (_db: DB, con: Connections) => Promise<void>;
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

CREATE TABLE "ETHUSDT" (
  id SERIAL PRIMARY KEY,
  e TEXT,
  "E" TIMESTAMP WITHOUT TIME ZONE,
  s TEXT,
  p NUMERIC
);

(new WebSocket("wss://nbstream.binance.com/eoptions/stream?streams=ETHUSDT@index")).onmessage = async ({ data }) => {
  // d = { "e": "index", "E": 1672325226310, "s": "ETHUSDT", "p": "1202.87071862" }
  const d = (JSON.parse(data).data);
  await db.ETHUSDT.insert({ ...d, E: new Date(+d.E) });
}

 */
//# sourceMappingURL=demoDataSetup.d.ts.map